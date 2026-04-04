<?php

namespace App\Jobs;

use App\Services\ExternalMarketplaceCrawlReportBuilder;
use App\Services\MarketplaceCrawlerService;
use App\Services\MarketplaceExternalEventImportService;
use App\Support\CrawlerHttpResponseInspector;
use App\Support\ExternalMarketplaceCrawlJobStatus;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

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
        public ?string $statusToken = null,
    ) {
        $this->timeout = max(
            180,
            (int) config('crawler.max_execution_seconds', 300),
            (int) config('crawler.chunked_crawl_orchestrator_timeout_seconds', 900),
        );
    }

    public function handle(MarketplaceExternalEventImportService $import): void
    {
        if (! Schema::hasTable('external_events')) {
            $this->failWithSnapshot('external_events tablosu bulunamadı. Önce migration çalıştırın.');

            return;
        }

        $configured = config('crawler.sources', []);
        if ($configured === []) {
            $this->failWithSnapshot('Yapılandırılmış crawl kaynağı yok (config/crawler.php).');

            return;
        }

        $useChunkedChain = $this->statusToken !== null
            && (bool) config('crawler.admin_use_chunked_crawl_chain', true);

        if ($useChunkedChain) {
            $this->dispatchChunkedCrawlChain($import);

            return;
        }

        $this->runSinglePassImport($import);
    }

    private function dispatchChunkedCrawlChain(MarketplaceExternalEventImportService $import): void
    {
        $seconds = max(60, (int) config('crawler.chunked_crawl_orchestrator_timeout_seconds', 900));
        set_time_limit($seconds);
        ini_set('max_execution_time', (string) $seconds);

        $crawler = app(MarketplaceCrawlerService::class);
        $configured = config('crawler.sources', []);
        $sources = $this->sourceOption === 'all' || $this->sourceOption === ''
            ? array_keys($configured)
            : [$this->sourceOption];

        $batchSize = max(5, (int) config('crawler.chunk_detail_batch_size', 35));
        $pauseBetween = max(0, (int) config('crawler.chunk_pause_seconds_between_batches', 60));

        if ($this->statusToken !== null) {
            $import->initExternalCrawlAccumulator($this->statusToken);
            Cache::forget('external_crawl_errors:'.$this->statusToken);
        }

        /** @var list<array{type: string, source: string, batch?: list<array{path: string, listing_url: string}>, offset?: int}> $planned */
        $planned = [];
        /** @var array<string, int> $chunkPathOffsetBySource kümülatif detay sırası (Biletinial/Biletsirasi gecikme aralıkları için) */
        $chunkPathOffsetBySource = [];

        try {
            foreach ($sources as $source) {
                if (! isset($configured[$source])) {
                    continue;
                }

                if ($crawler->supportsChunkedDetailCrawl($source)) {
                    $opts = $import->crawlOptionsForSource($source, $this->cityNames);
                    try {
                        $queue = $crawler->collectDetailPathQueue($source, $opts);
                    } catch (\Throwable $e) {
                        report($e);
                        $this->rememberCrawlError($source, CrawlerHttpResponseInspector::compactCrawlerErrorForAdmin($e->getMessage()));

                        continue;
                    }

                    $chunks = array_chunk($queue, $batchSize);
                    foreach ($chunks as $batch) {
                        $off = (int) ($chunkPathOffsetBySource[$source] ?? 0);
                        $planned[] = [
                            'type' => 'chunk',
                            'source' => $source,
                            'batch' => $batch,
                            'offset' => $off,
                        ];
                        if ($source === 'biletinial' || $source === 'biletsirasi') {
                            $chunkPathOffsetBySource[$source] = $off + count($batch);
                        }
                    }
                } else {
                    $planned[] = ['type' => 'full', 'source' => $source];
                }
            }
        } catch (\Throwable $e) {
            report($e);
            $msg = 'Çekim planı oluşturulamadı: '.CrawlerHttpResponseInspector::humanizeCrawlerErrorMessage($e->getMessage());
            $this->failWithSnapshot($msg);

            return;
        }

        $totalSteps = count($planned);
        $chain = [];

        foreach ($planned as $i => $step) {
            $stepNum = $i + 1;
            $pause = $i > 0 ? $pauseBetween : 0;
            if ($step['type'] === 'chunk') {
                $chain[] = new CrawlMarketplaceDetailChunkJob(
                    $this->statusToken,
                    $step['source'],
                    $step['batch'] ?? [],
                    $stepNum,
                    max(1, $totalSteps),
                    $pause,
                    (int) ($step['offset'] ?? 0),
                    $this->cityNames,
                );
            } else {
                $chain[] = new CrawlMarketplaceFullSourceJob(
                    $this->statusToken,
                    $step['source'],
                    $stepNum,
                    max(1, $totalSteps),
                    $pause,
                    $this->cityNames,
                );
            }
        }

        $chain[] = new FinalizeExternalMarketplaceImportJob(
            $this->statusToken,
            $this->sourceOption,
            $this->limit,
            $this->dateFrom,
            $this->dateTo,
            $this->cityNames,
            $this->categoryNames,
        );

        if ($this->statusToken !== null) {
            ExternalMarketplaceCrawlJobStatus::put($this->statusToken, [
                'state' => 'running',
                'phase' => 'crawl',
                'current' => 0,
                'total' => max(1, $totalSteps),
                'message' => $totalSteps > 0
                    ? "Kuyruk: {$totalSteps} adımda tarama (adımlar arası ~{$pauseBetween} sn). İlk adım başlıyor…"
                    : 'Kuyruk: doğrudan birleştirme aşamasına geçiliyor…',
                'active_source' => null,
            ]);
        }

        Bus::chain($chain)->dispatch();
    }

    private function rememberCrawlError(string $source, string $message): void
    {
        if ($this->statusToken === null) {
            return;
        }
        $key = 'external_crawl_errors:'.$this->statusToken;
        $prev = Cache::get($key, []);
        if (! is_array($prev)) {
            $prev = [];
        }
        $prev[$source] = $message;
        Cache::put($key, $prev, now()->addHours(6));
    }

    private function runSinglePassImport(MarketplaceExternalEventImportService $import): void
    {
        $seconds = max(60, (int) config('crawler.max_execution_seconds', 300));
        set_time_limit($seconds);
        ini_set('max_execution_time', (string) $seconds);

        try {
            $results = $import->import(
                $this->sourceOption,
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
            $msg = 'Veri çekilirken hata oluştu: '.CrawlerHttpResponseInspector::humanizeCrawlerErrorMessage($e->getMessage());
            $report = ExternalMarketplaceCrawlReportBuilder::minimalReport('error', $msg, 0, []);
            Cache::forever('external_events_last_crawl_snapshot', $report);
            Log::warning('External marketplace crawl işi hata', ['message' => $msg]);
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
            Log::warning('External marketplace crawl: yapılandırılmış kaynak yok');
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

    private function failWithSnapshot(string $message): void
    {
        $report = ExternalMarketplaceCrawlReportBuilder::minimalReport('error', $message, 0, []);
        Cache::forever('external_events_last_crawl_snapshot', $report);
        if ($this->statusToken !== null) {
            ExternalMarketplaceCrawlJobStatus::put($this->statusToken, [
                'state' => 'failed',
                'phase' => 'crawl',
                'message' => $message,
                'current' => 0,
                'total' => 1,
                'processed_total' => 0,
                'rows' => [],
            ]);
        }
    }

    public function failed(?\Throwable $e): void
    {
        $msg = $e !== null
            ? 'Veri çekilirken hata oluştu: '.CrawlerHttpResponseInspector::humanizeCrawlerErrorMessage($e->getMessage())
            : 'Veri çekme işi başarısız oldu.';
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
