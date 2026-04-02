<?php

namespace App\Services;

use App\Models\City;
use App\Models\ExternalEvent;
use App\Support\CrawlerHttpResponseInspector;
use App\Support\ExternalMarketplaceCrawlJobStatus;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class MarketplaceExternalEventImportService
{
    public function __construct(
        private readonly MarketplaceCrawlerService $crawler,
        private readonly ExternalEventDomainSyncService $domainSync,
        private readonly CrawlRowFilterApplier $rowFilter,
        private readonly CrawlRemoteImageStorage $crawlRemoteImageStorage,
    ) {}

    /**
     * @param  list<string>  $cityNames
     * @param  list<string>  $categoryNames
     * @param  ?string  $progressToken  Admin «Verileri çek» anket kutusu (cache anahtarı)
     * @return list<array{source: string, processed: int, synced: int, error?: string}>
     */
    public function import(
        string $sourceOption,
        int $limit,
        bool $syncToDomain,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        array $cityNames = [],
        array $categoryNames = [],
        ?string $progressToken = null,
    ): array {
        $configured = config('crawler.sources', []);
        $sources = $sourceOption === 'all' || $sourceOption === ''
            ? array_keys($configured)
            : [$sourceOption];

        $sourceCount = max(1, count($sources));
        $sourcePass = 0;

        /** @var array<string, array{error: ?string, rows: list<array<string, mixed>>}> $bySource */
        $bySource = [];
        foreach ($sources as $source) {
            if ($progressToken !== null) {
                ExternalMarketplaceCrawlJobStatus::put($progressToken, [
                    'state' => 'running',
                    'phase' => 'crawl',
                    'current' => $sourcePass,
                    'total' => $sourceCount,
                    'message' => isset($configured[$source])
                        ? "Kaynak taranıyor: {$source}"
                        : "Kaynak atlanıyor (yapılandırılmamış): {$source}",
                    'active_source' => $source,
                ]);
            }

            if (! isset($configured[$source])) {
                $bySource[$source] = ['error' => 'Kaynak yapılandırılmamış.', 'rows' => []];
                $sourcePass++;

                continue;
            }

            try {
                $rows = $this->crawler->crawl($source, $this->crawlOptionsForSource($source, $cityNames));
            } catch (\Throwable $e) {
                $bySource[$source] = [
                    'error' => CrawlerHttpResponseInspector::compactCrawlerErrorForAdmin($e->getMessage()),
                    'rows' => [],
                ];
                $sourcePass++;

                continue;
            }

            $bySource[$source] = ['error' => null, 'rows' => $rows];
            $sourcePass++;
        }

        if ($progressToken !== null) {
            ExternalMarketplaceCrawlJobStatus::put($progressToken, [
                'state' => 'running',
                'phase' => 'crawl',
                'current' => $sourceCount,
                'total' => $sourceCount,
                'message' => 'Tarama tamam; kayıtlar birleştiriliyor…',
                'active_source' => null,
            ]);
        }

        $merged = [];
        foreach ($bySource as $source => $info) {
            if ($info['error'] !== null) {
                continue;
            }
            foreach ($info['rows'] as $k => $_) {
                $info['rows'][$k]['_import_source'] = $source;
                $merged[] = $info['rows'][$k];
            }
        }

        $processedBySource = [];
        $syncedBySource = [];

        if ($merged !== []) {
            $mergedTotal = count($merged);
            $afterRowFilter = $this->rowFilter->filter($merged, $dateFrom, $dateTo, $cityNames, $categoryNames);
            $afterRowFilterTotal = count($afterRowFilter);
            $filtered = $this->excludeCrawlRowsAlreadySyncedToDomain($afterRowFilter);
            $afterExcludeSyncedTotal = count($filtered);
            $filtered = array_slice($filtered, 0, $limit);
            $saveTotal = count($filtered);

            $crawledPerSource = [];
            foreach ($bySource as $src => $info) {
                $crawledPerSource[$src] = $info['error'] !== null
                    ? ['error' => $info['error']]
                    : ['rows' => count($info['rows'])];
            }
            Log::info('External marketplace import pipeline', [
                'merged_total' => $mergedTotal,
                'after_date_city_category_filter' => $afterRowFilterTotal,
                'after_exclude_already_synced' => $afterExcludeSyncedTotal,
                'after_limit' => $saveTotal,
                'limit' => $limit,
                'crawl_per_source' => $crawledPerSource,
            ]);

            if ($progressToken !== null) {
                ExternalMarketplaceCrawlJobStatus::put($progressToken, [
                    'state' => 'running',
                    'phase' => 'save',
                    'current' => 0,
                    'total' => max(1, $saveTotal),
                    'message' => $saveTotal === 0
                        ? 'Filtre sonrası işlenecek satır kalmadı.'
                        : "Kayıtlar veritabanına yazılıyor (0/{$saveTotal})…",
                    'active_source' => null,
                ]);
            }

            $rowOrd = 0;
            foreach ($filtered as $row) {
                $rowOrd++;
                if ($progressToken !== null && $saveTotal > 0) {
                    $step = max(1, (int) floor($saveTotal / 40));
                    if ($rowOrd === 1 || $rowOrd === $saveTotal || $rowOrd % $step === 0) {
                        ExternalMarketplaceCrawlJobStatus::put($progressToken, [
                            'state' => 'running',
                            'phase' => 'save',
                            'current' => $rowOrd,
                            'total' => $saveTotal,
                            'message' => "Kayıtlar kaydediliyor ({$rowOrd}/{$saveTotal})…",
                            'active_source' => null,
                        ]);
                    }
                }

                $sourceKey = (string) ($row['_import_source'] ?? '');
                unset($row['_import_source']);

                $title = Str::of((string) $row['title'])->replaceMatches('/\s+/', ' ')->trim()->limit(240, '')->toString();
                $normUrl = $this->normalizedCrawlExternalUrl((string) ($row['external_url'] ?? ''));

                if ($normUrl !== '') {
                    $synced = ExternalEvent::query()
                        ->where('source', $sourceKey)
                        ->where('external_url', $normUrl)
                        ->whereNotNull('synced_event_id')
                        ->exists();
                    if ($synced) {
                        continue;
                    }
                }

                $fingerprint = $normUrl !== ''
                    ? sha1($sourceKey.'|url|'.$normUrl)
                    : ($sourceKey === 'bubilet_sehir_sec' && ! empty($row['external_url'])
                        ? sha1((string) $row['external_url'])
                        : sha1($title.'|'.($row['venue_name'] ?? '').'|'.($row['start_date'] ?? '').'|'.($row['external_url'] ?? '')));

                $rawImage = $row['image_url'] ?? null;
                $rawImage = is_string($rawImage) && $rawImage !== '' ? $rawImage : null;
                $storedImage = $rawImage !== null
                    ? $this->crawlRemoteImageStorage->persistPublicIfRemote($rawImage, 'external-events')
                    : null;
                $imageUrl = $storedImage ?? $rawImage;

                $payload = [
                    'title' => $title,
                    'external_url' => $normUrl !== '' ? $normUrl : ($row['external_url'] ?: null),
                    'image_url' => $imageUrl,
                    'venue_name' => $row['venue_name'] ?: null,
                    'city_name' => $row['city_name'] ?: null,
                    'category_name' => $row['category_name'] ?: null,
                    'start_date' => $row['start_date'],
                    'description' => $row['description'] ?: null,
                    'meta' => $row['meta'] ?? null,
                    'fingerprint' => $fingerprint,
                ];

                $external = $this->upsertExternalEventFromCrawlRow($sourceKey, $normUrl, $fingerprint, $payload);

                $processedBySource[$sourceKey] = ($processedBySource[$sourceKey] ?? 0) + 1;

                if ($syncToDomain) {
                    $event = $this->domainSync->syncToDomain($external);
                    if ($event) {
                        $external->update(['synced_event_id' => $event->id]);
                        $syncedBySource[$sourceKey] = ($syncedBySource[$sourceKey] ?? 0) + 1;
                    }
                }
            }
        } elseif ($progressToken !== null) {
            ExternalMarketplaceCrawlJobStatus::put($progressToken, [
                'state' => 'running',
                'phase' => 'save',
                'current' => 0,
                'total' => 1,
                'message' => 'Taranan kaynaklardan birleştirilecek satır bulunamadı.',
                'active_source' => null,
            ]);
        }

        $out = [];
        foreach ($sources as $source) {
            $info = $bySource[$source] ?? ['error' => 'Kaynak yapılandırılmamış.', 'rows' => []];
            if ($info['error'] !== null) {
                $out[] = [
                    'source' => $source,
                    'processed' => 0,
                    'synced' => 0,
                    'error' => $info['error'],
                ];

                continue;
            }

            $out[] = [
                'source' => $source,
                'processed' => (int) ($processedBySource[$source] ?? 0),
                'synced' => (int) ($syncedBySource[$source] ?? 0),
            ];
        }

        return $out;
    }

    /**
     * @param  list<string>  $cityNames
     * @param  list<string>  $categoryNames
     * @return array{sample: list<array<string, string>>, stats: array{raw_total: int, after_filter: int, shown: int}, errors: list<string>}
     */
    public function preview(
        string $sourceOption,
        int $sampleCap,
        ?string $dateFrom,
        ?string $dateTo,
        array $cityNames,
        array $categoryNames,
    ): array {
        $configured = config('crawler.sources', []);
        $sources = $sourceOption === 'all' || $sourceOption === ''
            ? array_keys($configured)
            : [$sourceOption];

        $errors = [];
        $merged = [];

        foreach ($sources as $source) {
            if (! isset($configured[$source])) {
                $errors[] = "{$source}: yapılandırılmamış.";

                continue;
            }

            try {
                $rows = $this->crawler->crawl($source, $this->crawlOptionsForSource($source, $cityNames));
            } catch (\Throwable $e) {
                $errors[] = "{$source}: ".CrawlerHttpResponseInspector::compactCrawlerErrorForAdmin($e->getMessage());

                continue;
            }

            foreach ($rows as $row) {
                $row['_import_source'] = $source;
                $merged[] = $row;
            }
        }

        $rawTotal = count($merged);
        $filtered = $this->rowFilter->filter($merged, $dateFrom, $dateTo, $cityNames, $categoryNames);
        $filtered = $this->excludeCrawlRowsAlreadySyncedToDomain($filtered);
        $afterFilter = count($filtered);
        $shown = min(max(0, $sampleCap), $afterFilter);
        $slice = array_slice($filtered, 0, $shown);

        $sample = [];
        foreach ($slice as $row) {
            $src = (string) ($row['_import_source'] ?? '');
            unset($row['_import_source']);
            $sample[] = $this->previewRowPayload($row, $src);
        }

        return [
            'sample' => $sample,
            'stats' => [
                'raw_total' => $rawTotal,
                'after_filter' => $afterFilter,
                'shown' => count($sample),
            ],
            'errors' => $errors,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, string>
     */
    private function previewRowPayload(array $row, string $sourceKey): array
    {
        $meta = is_array($row['meta'] ?? null) ? $row['meta'] : [];
        $raw = is_array($meta['raw'] ?? null) ? $meta['raw'] : [];
        $performers = $this->formatPerformerLabel($raw);

        $start = $row['start_date'] ?? '';
        if ($start instanceof \DateTimeInterface) {
            $start = $start->format('Y-m-d H:i:s');
        }

        return [
            'source' => $sourceKey,
            'title' => (string) ($row['title'] ?? ''),
            'venue_name' => (string) ($row['venue_name'] ?? ''),
            'city_name' => (string) ($row['city_name'] ?? ''),
            'category_name' => (string) ($row['category_name'] ?? ''),
            'start_date' => (string) $start,
            'performers' => $performers,
            'external_url' => (string) ($row['external_url'] ?? ''),
            'image_url' => (string) ($row['image_url'] ?? ''),
        ];
    }

    /**
     * Aynı kaynakta aynı URL veya aynı fingerprint için birden fazla satır kaldıysa tek kayıtta birleştir;
     * güncellemede fingerprint değişince (source, fingerprint) unique ihlali oluşmasın.
     *
     * @param  array<string, mixed>  $payload
     */
    private function upsertExternalEventFromCrawlRow(string $sourceKey, string $normUrl, string $fingerprint, array $payload): ExternalEvent
    {
        $payload['last_crawled_at'] = now();

        return DB::transaction(function () use ($sourceKey, $normUrl, $fingerprint, $payload): ExternalEvent {
            if ($normUrl !== '') {
                $ids = ExternalEvent::query()
                    ->where('source', $sourceKey)
                    ->where(function ($q) use ($normUrl, $fingerprint): void {
                        $q->where('external_url', $normUrl)
                            ->orWhere('fingerprint', $fingerprint);
                    })
                    ->orderByRaw('CASE WHEN synced_event_id IS NOT NULL THEN 0 ELSE 1 END')
                    ->orderBy('id')
                    ->pluck('id');

                if ($ids->isEmpty()) {
                    return ExternalEvent::query()->create(array_merge(
                        ['source' => $sourceKey],
                        $payload
                    ));
                }

                $winnerId = $ids->first();
                $rest = $ids->skip(1)->all();
                if ($rest !== []) {
                    ExternalEvent::query()->whereIn('id', $rest)->delete();
                }

                $winner = ExternalEvent::query()->findOrFail($winnerId);

                /** Aynı (source, fingerprint) başka satırda kaldıysa (URL eşleşmesi dışındaki yarışlar) unique ihlalini önle */
                ExternalEvent::query()
                    ->where('source', $sourceKey)
                    ->where('fingerprint', $fingerprint)
                    ->where('id', '!=', $winnerId)
                    ->delete();

                $winner->update($payload);

                return $winner->fresh();
            }

            return ExternalEvent::query()->updateOrCreate(
                ['source' => $sourceKey, 'fingerprint' => $fingerprint],
                $payload
            );
        });
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function excludeCrawlRowsAlreadySyncedToDomain(array $rows): array
    {
        if ($rows === [] || ! Schema::hasTable('external_events')) {
            return $rows;
        }

        $keys = [];
        try {
            foreach (
                ExternalEvent::query()
                    ->whereNotNull('synced_event_id')
                    ->whereNotNull('external_url')
                    ->cursor() as $ev
            ) {
                $u = $this->normalizedCrawlExternalUrl((string) $ev->external_url);
                if ($u !== '') {
                    $keys[(string) $ev->source.'|'.$u] = true;
                }
            }
        } catch (\Throwable) {
            return $rows;
        }

        return array_values(array_filter($rows, function (array $row) use ($keys): bool {
            $src = (string) ($row['_import_source'] ?? '');
            $u = $this->normalizedCrawlExternalUrl((string) ($row['external_url'] ?? ''));
            if ($u === '') {
                return true;
            }

            return ! isset($keys[$src.'|'.$u]);
        }));
    }

    /**
     * Aynı harici etkinlik satırını tekrar işlerken eşleştirme için (şema + sorgu parametreleri atılır).
     */
    private function normalizedCrawlExternalUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '') {
            return '';
        }
        if (! preg_match('#^https?://#i', $url)) {
            return rtrim($url, '/');
        }
        $parts = parse_url($url);
        if ($parts === false || empty($parts['host'])) {
            return rtrim($url, '/');
        }
        $host = strtolower((string) $parts['host']);
        $path = $parts['path'] ?? '';
        $path = $path === '' ? '/' : rtrim($path, '/');

        return 'https://'.$host.$path;
    }

    /**
     * @param  list<string>  $cityNames
     * @return array{bubilet_city_slugs?: list<string>}
     */
    private function crawlOptionsForSource(string $source, array $cityNames): array
    {
        if ($source !== 'bubilet') {
            return [];
        }

        $slugs = $this->bubiletCitySlugsFromAdminSelection($cityNames);

        $max = max(1, (int) config('crawler.bubilet_max_city_slugs_per_crawl', 14));
        if (count($slugs) > $max) {
            /** @var list<string> $preferred */
            $preferred = config('crawler.bubilet_preferred_city_slugs', []);
            if (! is_array($preferred)) {
                $preferred = [];
            }
            $preferred = array_values(array_filter(array_map(
                static fn ($s) => strtolower(trim((string) $s)),
                $preferred,
            )));
            $picked = array_values(array_intersect($preferred, $slugs));
            if ($picked === []) {
                $picked = array_slice($slugs, 0, $max);
            } elseif (count($picked) > $max) {
                $picked = array_slice($picked, 0, $max);
            }
            $slugs = $picked;
        }

        return ['bubilet_city_slugs' => $slugs];
    }

    /**
     * Boşsa crawler yalnızca config `default_city_slug` ile URL üretir (Bubilet şehir segmenti).
     *
     * @param  list<string>  $cityNames
     * @return list<string>
     */
    private function bubiletCitySlugsFromAdminSelection(array $cityNames): array
    {
        if ($cityNames === []) {
            return [];
        }

        return City::query()
            ->whereIn('name', $cityNames)
            ->pluck('slug')
            ->map(fn (mixed $s): string => strtolower(trim((string) $s)))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function formatPerformerLabel(array $raw): string
    {
        $p = Arr::get($raw, 'performer');
        if ($p === null || $p === '') {
            return '';
        }
        if (is_string($p)) {
            return $p;
        }
        if (is_array($p)) {
            if (isset($p['name'])) {
                return (string) $p['name'];
            }
            $names = [];
            foreach ($p as $item) {
                if (is_string($item)) {
                    $names[] = $item;
                } elseif (is_array($item) && isset($item['name'])) {
                    $names[] = (string) $item['name'];
                }
            }

            return implode(', ', array_filter($names));
        }

        return '';
    }
}
