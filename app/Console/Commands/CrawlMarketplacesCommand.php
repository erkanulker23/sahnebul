<?php

namespace App\Console\Commands;

use App\Services\MarketplaceExternalEventImportService;
use Illuminate\Console\Command;

class CrawlMarketplacesCommand extends Command
{
    protected $signature = 'marketplaces:crawl {--source=all} {--sync} {--limit=200}';

    protected $description = 'Crawl marketplace websites and import event candidates';

    public function handle(MarketplaceExternalEventImportService $import): int
    {
        $sourceOption = (string) $this->option('source');
        $limit = (int) $this->option('limit');
        $sync = (bool) $this->option('sync');

        if ($sourceOption === 'bubilet' || $sourceOption === 'all') {
            $this->warn(
                'Crawl başladı. Bubilet birçok liste + etkinlik sayfası indirir; işlem bitene kadar çıktı beklemesi normaldir (genelde 2–10 dk, ağa bağlı).',
            );
        } else {
            $this->line("Crawl başladı (kaynak: {$sourceOption}, limit: {$limit}).");
        }

        foreach ($import->import($sourceOption, $limit, $sync, null, null, [], []) as $result) {
            $source = $result['source'];

            if (! empty($result['error'])) {
                $this->error("Failed {$source}: {$result['error']}");

                continue;
            }

            $this->line("{$source}: {$result['processed']} kayıt işlendi, {$result['synced']} kayıt sisteme senkronlandı.");
        }

        $this->info('Crawl tamam.');

        return self::SUCCESS;
    }
}
