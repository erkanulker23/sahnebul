<?php

namespace App\Services;

use App\Models\ExternalEvent;
use Illuminate\Support\Arr;
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
    ): array {
        $configured = config('crawler.sources', []);
        $sources = $sourceOption === 'all' || $sourceOption === ''
            ? array_keys($configured)
            : [$sourceOption];

        /** @var array<string, array{error: ?string, rows: list<array<string, mixed>>}> $bySource */
        $bySource = [];
        foreach ($sources as $source) {
            if (! isset($configured[$source])) {
                $bySource[$source] = ['error' => 'Kaynak yapılandırılmamış.', 'rows' => []];

                continue;
            }

            try {
                $rows = $this->crawler->crawl($source);
            } catch (\Throwable $e) {
                $bySource[$source] = ['error' => $e->getMessage(), 'rows' => []];

                continue;
            }

            $bySource[$source] = ['error' => null, 'rows' => $rows];
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
            $filtered = $this->rowFilter->filter($merged, $dateFrom, $dateTo, $cityNames, $categoryNames);
            $filtered = array_slice($filtered, 0, $limit);

            foreach ($filtered as $row) {
                $sourceKey = (string) ($row['_import_source'] ?? '');
                unset($row['_import_source']);

                $title = Str::of((string) $row['title'])->replaceMatches('/\s+/', ' ')->trim()->limit(240, '')->toString();
                $fingerprint = $sourceKey === 'bubilet_sehir_sec' && ! empty($row['external_url'])
                    ? sha1((string) $row['external_url'])
                    : sha1($title.'|'.($row['venue_name'] ?? '').'|'.($row['start_date'] ?? '').'|'.($row['external_url'] ?? ''));

                $rawImage = $row['image_url'] ?? null;
                $rawImage = is_string($rawImage) && $rawImage !== '' ? $rawImage : null;
                $storedImage = $rawImage !== null
                    ? $this->crawlRemoteImageStorage->persistPublicIfRemote($rawImage, 'external-events')
                    : null;
                $imageUrl = $storedImage ?? $rawImage;

                $external = ExternalEvent::updateOrCreate(
                    ['source' => $sourceKey, 'fingerprint' => $fingerprint],
                    [
                        'title' => $title,
                        'external_url' => $row['external_url'] ?: null,
                        'image_url' => $imageUrl,
                        'venue_name' => $row['venue_name'] ?: null,
                        'city_name' => $row['city_name'] ?: null,
                        'category_name' => $row['category_name'] ?: null,
                        'start_date' => $row['start_date'],
                        'description' => $row['description'] ?: null,
                        'meta' => $row['meta'] ?? null,
                    ]
                );

                $processedBySource[$sourceKey] = ($processedBySource[$sourceKey] ?? 0) + 1;

                if ($syncToDomain) {
                    $event = $this->domainSync->syncToDomain($external);
                    if ($event) {
                        $external->update(['synced_event_id' => $event->id]);
                        $syncedBySource[$sourceKey] = ($syncedBySource[$sourceKey] ?? 0) + 1;
                    }
                }
            }
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
                $rows = $this->crawler->crawl($source);
            } catch (\Throwable $e) {
                $errors[] = "{$source}: ".$e->getMessage();

                continue;
            }

            foreach ($rows as $row) {
                $row['_import_source'] = $source;
                $merged[] = $row;
            }
        }

        $rawTotal = count($merged);
        $filtered = $this->rowFilter->filter($merged, $dateFrom, $dateTo, $cityNames, $categoryNames);
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
     * @param  array<string, mixed>  $raw
     */
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
