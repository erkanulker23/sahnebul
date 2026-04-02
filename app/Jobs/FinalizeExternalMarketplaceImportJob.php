<?php

namespace App\Jobs;

use App\Services\ExternalMarketplaceCrawlReportBuilder;
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

class FinalizeExternalMarketplaceImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout;

    public int $tries = 1;

    /**
     * @param  list<string>  $cityNames
     * @param  list<string>  $categoryNames
     */
    public function __construct(
        public ?string $statusToken,
        public string $sourceOption,
        public int $limit,
        public ?string $dateFrom,
        public ?string $dateTo,
        public array $cityNames,
        public array $categoryNames,
    ) {
        $this->timeout = max(120, (int) config('crawler.chunked_crawl_finalize_timeout_seconds', 600));
    }

    public function handle(MarketplaceExternalEventImportService $import): void
    {
        $seconds = max(60, (int) config('crawler.chunked_crawl_finalize_timeout_seconds', 600));
        set_time_limit($seconds);
        ini_set('max_execution_time', (string) $seconds);

        $configured = config('crawler.sources', []);
        $sources = $this->sourceOption === 'all' || $this->sourceOption === ''
            ? array_keys($configured)
            : [$this->sourceOption];

        $merged = $this->statusToken !== null
            ? $import->pullExternalCrawlAccumulator($this->statusToken)
            : [];

        $errorKey = $this->statusToken !== null ? 'external_crawl_errors:'.$this->statusToken : null;
        $crawlErrors = ($errorKey !== null) ? Cache::pull($errorKey, []) : [];
        if (! is_array($crawlErrors)) {
            $crawlErrors = [];
        }

        $crawlErrorsBySource = [];
        foreach ($sources as $source) {
            $crawlErrorsBySource[$source] = isset($crawlErrors[$source]) && is_string($crawlErrors[$source]) && $crawlErrors[$source] !== ''
                ? $crawlErrors[$source]
                : null;
        }

        try {
            $results = $import->persistMergedCrawlRows(
                $sources,
                $merged,
                $crawlErrorsBySource,
                $this->limit,
                false,
                $this->dateFrom,
                $this->dateTo,
                $this->cityNames,
                $this->categoryNames,
                $this->statusToken,
            );
        } catch (\Throwable $e) {
            report($e);
            $msg = 'Veri kaydedilirken hata oluştu: '.CrawlerHttpResponseInspector::humanizeCrawlerErrorMessage($e->getMessage());
            $report = ExternalMarketplaceCrawlReportBuilder::minimalReport('error', $msg, 0, []);
            Cache::forever('external_events_last_crawl_snapshot', $report);
            Log::warning('External marketplace finalize hata', ['message' => $msg]);
            if ($this->statusToken !== null) {
                ExternalMarketplaceCrawlJobStatus::put($this->statusToken, [
                    'state' => 'failed',
                    'phase' => 'save',
                    'message' => $msg,
                    'current' => 0,
                    'total' => 1,
                    'processed_total' => 0,
                    'rows' => [],
                ]);
            }

            return;
        }

        if ($results === []) {
            $msg = 'Yapılandırılmış crawl kaynağı yok (config/crawler.php).';
            Cache::forever(
                'external_events_last_crawl_snapshot',
                ExternalMarketplaceCrawlReportBuilder::minimalReport('error', $msg, 0, []),
            );
            if ($this->statusToken !== null) {
                ExternalMarketplaceCrawlJobStatus::put($this->statusToken, [
                    'state' => 'failed',
                    'phase' => 'crawl',
                    'message' => $msg,
                    'current' => 0,
                    'total' => 1,
                ]);
            }

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

        $outcome = ExternalMarketplaceCrawlReportBuilder::outcomeFromImportResults($results);
        Cache::forever('external_events_last_crawl_snapshot', $outcome['report']);
        if ($this->statusToken !== null) {
            ExternalMarketplaceCrawlJobStatus::put($this->statusToken, [
                'state' => 'completed',
                'phase' => 'save',
                'current' => 1,
                'total' => 1,
                'message' => (string) ($outcome['report']['summary'] ?? $outcome['message']),
                'processed_total' => (int) ($outcome['report']['total_processed'] ?? 0),
                'rows' => is_array($outcome['report']['rows'] ?? null) ? $outcome['report']['rows'] : [],
            ]);
        }
    }

    public function failed(?\Throwable $e): void
    {
        $msg = $e !== null
            ? 'Veri çekme sonlandırılamadı: '.CrawlerHttpResponseInspector::humanizeCrawlerErrorMessage($e->getMessage())
            : 'Veri çekme son işlemi başarısız oldu.';
        Cache::forever(
            'external_events_last_crawl_snapshot',
            ExternalMarketplaceCrawlReportBuilder::minimalReport('error', $msg, 0, []),
        );
        if ($this->statusToken !== null) {
            ExternalMarketplaceCrawlJobStatus::put($this->statusToken, [
                'state' => 'failed',
                'phase' => 'save',
                'message' => $msg,
                'current' => 0,
                'total' => 1,
                'processed_total' => 0,
                'rows' => [],
            ]);
        }
    }
}
