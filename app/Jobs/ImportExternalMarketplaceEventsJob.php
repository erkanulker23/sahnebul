<?php

namespace App\Jobs;

use App\Services\MarketplaceExternalEventImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ImportExternalMarketplaceEventsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout;

    public int $tries = 1;

    /**
     * @param  list<string>  $cityNames
     * @param  list<string>  $categoryNames
     */
    public function __construct(
        public string $sourceOption,
        public int $limit,
        public ?string $dateFrom,
        public ?string $dateTo,
        public array $cityNames,
        public array $categoryNames,
    ) {
        $this->timeout = max(120, (int) config('crawler.max_execution_seconds', 300));
    }

    public function handle(MarketplaceExternalEventImportService $import): void
    {
        $seconds = max(60, (int) config('crawler.max_execution_seconds', 300));
        set_time_limit($seconds);
        ini_set('max_execution_time', (string) $seconds);

        $results = $import->import(
            $this->sourceOption,
            $this->limit,
            false,
            $this->dateFrom,
            $this->dateTo,
            $this->cityNames,
            $this->categoryNames,
        );

        if ($results === []) {
            Log::warning('External marketplace crawl: yapılandırılmış kaynak yok');

            return;
        }

        foreach ($results as $r) {
            if (! empty($r['error'])) {
                Log::warning('External marketplace crawl kaynak hatası', [
                    'source' => $r['source'],
                    'error' => $r['error'],
                ]);
            } else {
                Log::info('External marketplace crawl tamamlandı', [
                    'source' => $r['source'],
                    'processed' => $r['processed'],
                ]);
            }
        }
    }
}
