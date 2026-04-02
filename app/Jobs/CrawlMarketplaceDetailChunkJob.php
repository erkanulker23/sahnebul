<?php

namespace App\Jobs;

use App\Services\MarketplaceCrawlerService;
use App\Services\MarketplaceExternalEventImportService;
use App\Support\ExternalMarketplaceCrawlJobStatus;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CrawlMarketplaceDetailChunkJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout;

    public int $tries = 1;

    /**
     * @param  list<array{path: string, listing_url: string}>  $batch
     * @param  list<string>  $cityNames
     */
    public function __construct(
        public ?string $statusToken,
        public string $source,
        public array $batch,
        public int $stepIndex,
        public int $stepTotal,
        public int $pauseSecondsBefore,
        public int $globalPathOffset,
        public array $cityNames,
    ) {
        $this->timeout = max(60, (int) config('crawler.chunked_crawl_detail_job_timeout_seconds', 300));
    }

    public function handle(MarketplaceCrawlerService $crawler, MarketplaceExternalEventImportService $import): void
    {
        if ($this->pauseSecondsBefore > 0) {
            sleep($this->pauseSecondsBefore);
        }

        if ($this->statusToken !== null) {
            ExternalMarketplaceCrawlJobStatus::put($this->statusToken, [
                'state' => 'running',
                'phase' => 'crawl',
                'current' => $this->stepIndex,
                'total' => max(1, $this->stepTotal),
                'message' => "Detay tarama {$this->stepIndex}/{$this->stepTotal}: {$this->source} (".count($this->batch).' sayfa)',
                'active_source' => $this->source,
            ]);
        }

        if ($this->batch === []) {
            return;
        }

        try {
            $opts = $import->crawlOptionsForSource($this->source, $this->cityNames);
            $rows = $crawler->fetchDetailRowsBatch($this->source, $opts, $this->batch, $this->globalPathOffset);
            foreach ($rows as $k => $_) {
                $rows[$k]['_import_source'] = $this->source;
            }
            if ($this->statusToken !== null) {
                $import->appendToExternalCrawlAccumulator($this->statusToken, $rows);
            }
        } catch (\Throwable $e) {
            report($e);
            Log::warning('External crawl chunk hata', [
                'source' => $this->source,
                'step' => $this->stepIndex,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
