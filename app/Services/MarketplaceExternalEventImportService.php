<?php

namespace App\Services;

use App\Models\ExternalEvent;
use Illuminate\Support\Str;

class MarketplaceExternalEventImportService
{
    public function __construct(
        private readonly MarketplaceCrawlerService $crawler,
        private readonly ExternalEventDomainSyncService $domainSync,
    ) {}

    /**
     * @return list<array{source: string, processed: int, synced: int, error?: string}>
     */
    public function import(string $sourceOption, int $limit, bool $syncToDomain): array
    {
        $configured = config('crawler.sources', []);
        $sources = $sourceOption === 'all' || $sourceOption === ''
            ? array_keys($configured)
            : [$sourceOption];

        $results = [];

        foreach ($sources as $source) {
            if (! isset($configured[$source])) {
                $results[] = [
                    'source' => $source,
                    'processed' => 0,
                    'synced' => 0,
                    'error' => 'Kaynak yapılandırılmamış.',
                ];

                continue;
            }

            try {
                $rows = $this->crawler->crawl($source);
            } catch (\Throwable $e) {
                $results[] = [
                    'source' => $source,
                    'processed' => 0,
                    'synced' => 0,
                    'error' => $e->getMessage(),
                ];

                continue;
            }

            $rows = array_slice($rows, 0, $limit);
            $processed = 0;
            $synced = 0;

            foreach ($rows as $row) {
                $title = Str::of((string) $row['title'])->replaceMatches('/\s+/', ' ')->trim()->limit(240, '')->toString();
                $fingerprint = $source === 'bubilet_sehir_sec' && ! empty($row['external_url'])
                    ? sha1((string) $row['external_url'])
                    : sha1($title.'|'.($row['venue_name'] ?? '').'|'.($row['start_date'] ?? '').'|'.($row['external_url'] ?? ''));

                $external = ExternalEvent::updateOrCreate(
                    ['source' => $source, 'fingerprint' => $fingerprint],
                    [
                        'title' => $title,
                        'external_url' => $row['external_url'] ?: null,
                        'image_url' => $row['image_url'] ?: null,
                        'venue_name' => $row['venue_name'] ?: null,
                        'city_name' => $row['city_name'] ?: null,
                        'category_name' => $row['category_name'] ?: null,
                        'start_date' => $row['start_date'],
                        'description' => $row['description'] ?: null,
                        'meta' => $row['meta'] ?? null,
                    ]
                );
                $processed++;

                if ($syncToDomain) {
                    $event = $this->domainSync->syncToDomain($external);
                    if ($event) {
                        $external->update(['synced_event_id' => $event->id]);
                        $synced++;
                    }
                }
            }

            $results[] = [
                'source' => $source,
                'processed' => $processed,
                'synced' => $synced,
            ];
        }

        return $results;
    }
}
