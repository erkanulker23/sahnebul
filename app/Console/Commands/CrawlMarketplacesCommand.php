<?php

namespace App\Console\Commands;

use App\Models\ExternalEvent;
use App\Services\ExternalEventDomainSyncService;
use App\Services\MarketplaceCrawlerService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class CrawlMarketplacesCommand extends Command
{
    protected $signature = 'marketplaces:crawl {--source=all} {--sync} {--limit=200}';
    protected $description = 'Crawl marketplace websites and import event candidates';

    public function handle(MarketplaceCrawlerService $crawler, ExternalEventDomainSyncService $domainSync): int
    {
        $sourceOption = (string) $this->option('source');
        $sources = $sourceOption === 'all' ? array_keys(config('crawler.sources', [])) : [$sourceOption];
        $limit = (int) $this->option('limit');
        $sync = (bool) $this->option('sync');

        foreach ($sources as $source) {
            $this->info("Crawling {$source}...");

            try {
                $rows = $crawler->crawl($source);
            } catch (\Throwable $e) {
                $this->error("Failed {$source}: {$e->getMessage()}");
                continue;
            }

            $rows = array_slice($rows, 0, $limit);
            $saved = 0;
            $synced = 0;

            foreach ($rows as $row) {
                $title = Str::of((string) $row['title'])->replaceMatches('/\s+/', ' ')->trim()->limit(240, '')->toString();
                $fingerprint = $source === 'bubilet_sehir_sec' && ! empty($row['external_url'])
                    ? sha1((string) $row['external_url'])
                    : sha1($title . '|' . ($row['venue_name'] ?? '') . '|' . ($row['start_date'] ?? '') . '|' . ($row['external_url'] ?? ''));

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
                $saved++;

                if ($sync) {
                    $event = $domainSync->syncToDomain($external);
                    if ($event) {
                        $external->update(['synced_event_id' => $event->id]);
                        $synced++;
                    }
                }
            }

            $this->line("{$source}: {$saved} kayıt işlendi, {$synced} kayıt sisteme senkronlandı.");
        }

        return self::SUCCESS;
    }
}
