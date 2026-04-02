<?php

namespace App\Jobs;

use App\Services\MarketplaceCrawlerService;
use App\Services\MarketplaceExternalEventImportService;
use App\Support\CrawlerHttpResponseInspector;
use App\Support\ExternalMarketplaceCrawlJobStatus;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CrawlMarketplaceFullSourceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout;

    public int $tries = 1;

    /**
     * @param  list<string>  $cityNames
     */
    public function __construct(
        public ?string $statusToken,
        public string $source,
        public int $stepIndex,
        public int $stepTotal,
        public int $pauseSecondsBefore,
        public array $cityNames,
    ) {
        $this->timeout = max(120, (int) config('crawler.chunked_crawl_detail_job_timeout_seconds', 300));
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
                'message' => "Tam tarama {$this->stepIndex}/{$this->stepTotal}: {$this->source}",
                'active_source' => $this->source,
            ]);
        }

        try {
            $opts = $import->crawlOptionsForSource($this->source, $this->cityNames);
            $rows = $crawler->crawl($this->source, $opts);
            foreach ($rows as $k => $_) {
                $rows[$k]['_import_source'] = $this->source;
            }
            if ($this->statusToken !== null) {
                $import->appendToExternalCrawlAccumulator($this->statusToken, $rows);
            }
        } catch (\Throwable $e) {
            report($e);
            Log::warning('External crawl tam kaynak hata', [
                'source' => $this->source,
                'message' => $e->getMessage(),
            ]);
            if ($this->statusToken !== null) {
                $key = 'external_crawl_errors:'.$this->statusToken;
                $prev = Cache::get($key, []);
                if (! is_array($prev)) {
                    $prev = [];
                }
                $prev[$this->source] = CrawlerHttpResponseInspector::compactCrawlerErrorForAdmin($e->getMessage());
                Cache::put($key, $prev, now()->addHours(6));
            }
        }
    }
}
