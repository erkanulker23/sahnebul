<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\City;
use App\Models\ExternalEvent;
use App\Services\ExternalEventDomainSyncService;
use App\Services\MarketplaceExternalEventImportService;
use App\Support\CrawlerHttpResponseInspector;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Session;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ExternalEventController extends Controller
{
    public function __construct(
        private readonly ExternalEventDomainSyncService $externalEventSync,
        private readonly MarketplaceExternalEventImportService $marketplaceImport,
    ) {}

    public function index(Request $request): Response
    {
        $crawlLookups = $this->crawlLookupsForInertia();

        if (! Schema::hasTable('external_events')) {
            return Inertia::render('Admin/ExternalEvents/Index', [
                'items' => ['data' => []],
                'filters' => ['source' => '', 'status' => 'pending', 'search' => '', 'artist' => ''],
                'sources' => array_keys(config('crawler.sources', [])),
                'crawlLookups' => $crawlLookups,
                'lastCrawlReport' => Session::get('external_events_last_crawl'),
            ]);
        }

        $filters = $request->validate([
            'source' => ['nullable', 'string', 'max:64'],
            'status' => ['nullable', 'in:all,pending,synced,rejected'],
            'search' => ['nullable', 'string', 'max:120'],
            'artist' => ['nullable', 'string', 'max:120'],
        ]);

        $query = ExternalEvent::query()
            ->select([
                'id',
                'source',
                'title',
                'external_url',
                'image_url',
                'venue_name',
                'city_name',
                'category_name',
                'start_date',
                'meta',
                'synced_event_id',
                'created_at',
                'updated_at',
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if (! empty($filters['source'])) {
            $query->where('source', $filters['source']);
        }

        $status = $filters['status'] ?? 'pending';
        if ($status === 'pending') {
            $query->whereNull('synced_event_id')->where(function ($q): void {
                $q->whereNull('meta')
                    ->orWhereRaw("JSON_EXTRACT(meta, '$.rejected') IS NULL")
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(meta, '$.rejected')) != 'true'");
            });
        } elseif ($status === 'synced') {
            $query->whereNotNull('synced_event_id');
        } elseif ($status === 'rejected') {
            $query->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(meta, '$.rejected')) = 'true'");
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search): void {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('venue_name', 'like', "%{$search}%")
                    ->orWhere('city_name', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['artist'])) {
            $artist = addcslashes((string) $filters['artist'], '%_\\');
            $like = "%{$artist}%";
            $query->where(function ($q) use ($like): void {
                $q->where('meta->raw->performer', 'like', $like)
                    ->orWhere('meta->raw->performer->name', 'like', $like);
            });
        }

        $paginator = $query->paginate(25)->withQueryString();
        $paginator->setCollection(
            $paginator->getCollection()->map(function (ExternalEvent $e): array {
                return [
                    'id' => $e->id,
                    'source' => $e->source,
                    'title' => $e->title,
                    'external_url' => $e->external_url,
                    'image_url' => $e->image_url,
                    'venue_name' => $e->venue_name,
                    'city_name' => $e->city_name,
                    'category_name' => $e->category_name,
                    'start_date' => $e->start_date?->format('Y-m-d H:i:s'),
                    'synced_event_id' => $e->synced_event_id,
                    'meta' => ['rejected' => data_get($e->meta, 'rejected') === true],
                    'description' => null,
                ];
            })
        );

        return Inertia::render('Admin/ExternalEvents/Index', [
            'items' => $paginator,
            'filters' => [
                'source' => $filters['source'] ?? '',
                'status' => $status,
                'search' => $filters['search'] ?? '',
                'artist' => $filters['artist'] ?? '',
            ],
            'sources' => array_keys(config('crawler.sources', [])),
            'crawlLookups' => $crawlLookups,
            'lastCrawlReport' => Session::get('external_events_last_crawl'),
        ]);
    }

    public function dismissLastCrawlReport(): RedirectResponse
    {
        Session::forget('external_events_last_crawl');

        return back()->with('success', 'Son veri çekme özeti kaldırıldı.');
    }

    /**
     * @return array{cities: list<array{id: int, name: string}>, categories: list<array{id: int, name: string}>}
     */
    private function crawlLookupsForInertia(): array
    {
        if (! Schema::hasTable('cities') || ! Schema::hasTable('categories')) {
            return ['cities' => [], 'categories' => []];
        }

        return [
            'cities' => City::query()->orderBy('name')->get(['id', 'name'])->map(fn (City $c) => [
                'id' => $c->id,
                'name' => $c->name,
            ])->all(),
            'categories' => Category::query()->orderBy('name')->get(['id', 'name'])->map(fn (Category $c) => [
                'id' => $c->id,
                'name' => $c->name,
            ])->all(),
        ];
    }

    private function relaxCrawlerExecutionTimeLimit(): void
    {
        $seconds = max(60, (int) config('crawler.max_execution_seconds', 300));
        set_time_limit($seconds);
        ini_set('max_execution_time', (string) $seconds);
    }

    /**
     * @return array{source: string, limit: int, date_from: ?string, date_to: ?string, city_ids: list<int>, category_ids: list<int>}
     */
    private function validateCrawlRequest(Request $request): array
    {
        $request->merge([
            'date_from' => $request->input('date_from') ?: null,
            'date_to' => $request->input('date_to') ?: null,
        ]);

        $sourceKeys = array_keys(config('crawler.sources', []));
        $data = $request->validate([
            'source' => ['nullable', 'string', Rule::in(array_merge(['', 'all'], $sourceKeys))],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'city_ids' => ['nullable', 'array'],
            'city_ids.*' => ['integer', 'exists:cities,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
        ]);

        if (! empty($data['date_from']) && ! empty($data['date_to']) && $data['date_to'] < $data['date_from']) {
            throw ValidationException::withMessages([
                'date_to' => 'Bitiş tarihi başlangıçtan önce olamaz.',
            ]);
        }

        $sourceOption = $data['source'] ?? 'all';
        if ($sourceOption === '') {
            $sourceOption = 'all';
        }

        return [
            'source' => $sourceOption,
            'limit' => (int) ($data['limit'] ?? 250),
            'date_from' => $data['date_from'] ?? null,
            'date_to' => $data['date_to'] ?? null,
            'city_ids' => array_values(array_map('intval', $data['city_ids'] ?? [])),
            'category_ids' => array_values(array_map('intval', $data['category_ids'] ?? [])),
        ];
    }

    /**
     * @return array{0: list<string>, 1: list<string>}
     */
    private function resolveCityAndCategoryNames(array $validated): array
    {
        $cityNames = $validated['city_ids'] === []
            ? []
            : City::query()->whereIn('id', $validated['city_ids'])->orderBy('name')->pluck('name')->all();

        $categoryNames = $validated['category_ids'] === []
            ? []
            : Category::query()->whereIn('id', $validated['category_ids'])->orderBy('name')->pluck('name')->all();

        return [$cityNames, $categoryNames];
    }

    public function crawlPreview(Request $request): JsonResponse
    {
        $this->relaxCrawlerExecutionTimeLimit();

        $validated = $this->validateCrawlRequest($request);
        [$cityNames, $categoryNames] = $this->resolveCityAndCategoryNames($validated);

        $sampleCap = min(120, max(10, $validated['limit']));

        $payload = $this->marketplaceImport->preview(
            $validated['source'],
            $sampleCap,
            $validated['date_from'],
            $validated['date_to'],
            $cityNames,
            $categoryNames,
        );

        return response()->json($payload);
    }

    public function sync(ExternalEvent $externalEvent): RedirectResponse
    {
        $event = $this->externalEventSync->syncToDomain($externalEvent);
        if (! $event) {
            return back()->with('error', 'Kayıt aktarılamadı. Eksik alanlar var.');
        }

        $externalEvent->update([
            'synced_event_id' => $event->id,
            'meta' => array_merge($externalEvent->meta ?? [], ['rejected' => false]),
        ]);

        return back()->with('success', 'Kayıt etkinliklere taslak olarak aktarıldı.');
    }

    public function reject(ExternalEvent $externalEvent): RedirectResponse
    {
        $externalEvent->update([
            'meta' => array_merge($externalEvent->meta ?? [], ['rejected' => true]),
        ]);

        return back()->with('success', 'Kayıt reddedildi.');
    }

    public function bulk(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'action' => ['required', 'in:sync,reject,destroy'],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:external_events,id'],
        ]);

        $items = ExternalEvent::whereIn('id', $data['ids'])->get();
        $affected = 0;

        if ($data['action'] === 'destroy') {
            foreach ($items as $item) {
                $item->delete();
                $affected++;
            }

            return back()->with('success', "{$affected} aday kayıt silindi.");
        }

        if ($data['action'] === 'reject') {
            foreach ($items as $item) {
                $item->update(['meta' => array_merge($item->meta ?? [], ['rejected' => true])]);
                $affected++;
            }

            return back()->with('success', "{$affected} kayıt reddedildi.");
        }

        foreach ($items as $item) {
            $event = $this->externalEventSync->syncToDomain($item);
            if (! $event) {
                continue;
            }
            $item->update([
                'synced_event_id' => $event->id,
                'meta' => array_merge($item->meta ?? [], ['rejected' => false]),
            ]);
            $affected++;
        }

        return back()->with('success', "{$affected} kayıt etkinliklere aktarıldı.");
    }

    public function crawl(Request $request): RedirectResponse
    {
        if (! Schema::hasTable('external_events')) {
            $msg = 'external_events tablosu bulunamadı. Önce migration çalıştırın.';
            $this->persistLastCrawlReport($this->minimalCrawlReport('error', $msg, 0, []));

            return back()->with('error', $msg);
        }

        $this->relaxCrawlerExecutionTimeLimit();

        $validated = $this->validateCrawlRequest($request);
        [$cityNames, $categoryNames] = $this->resolveCityAndCategoryNames($validated);

        $configured = array_keys(config('crawler.sources', []));
        if ($configured === []) {
            $msg = 'Yapılandırılmış crawl kaynağı yok (config/crawler.php).';
            $this->persistLastCrawlReport($this->minimalCrawlReport('error', $msg, 0, []));

            return back()->with('error', $msg);
        }

        try {
            $results = $this->marketplaceImport->import(
                $validated['source'],
                $validated['limit'],
                false,
                $validated['date_from'],
                $validated['date_to'],
                $cityNames,
                $categoryNames,
            );
        } catch (\Throwable $e) {
            report($e);
            $msg = 'Veri çekilirken hata oluştu: '.CrawlerHttpResponseInspector::humanizeCrawlerErrorMessage($e->getMessage());
            $this->persistLastCrawlReport($this->minimalCrawlReport('error', $msg, 0, []));

            return back()->with('error', $msg);
        }

        if ($results === []) {
            $msg = 'Yapılandırılmış crawl kaynağı yok (config/crawler.php).';
            $this->persistLastCrawlReport($this->minimalCrawlReport('error', $msg, 0, []));

            return back()->with('error', $msg);
        }

        $outcome = $this->crawlOutcomeFromResults($results);
        $this->persistLastCrawlReport($outcome['report']);

        $flashKey = $outcome['report']['status'] === 'error' ? 'error' : 'success';

        return back()->with($flashKey, $outcome['message']);
    }

    /**
     * @param  array<string, mixed>  $report
     */
    private function persistLastCrawlReport(array $report): void
    {
        Session::put('external_events_last_crawl', $report);
    }

    /**
     * @param  list<array{source: string, processed: int, error: string|null}>  $rows
     * @return array{finished_at: string, status: string, total_processed: int, rows: list<array{source: string, processed: int, error: string|null}>, summary: string}
     */
    private function minimalCrawlReport(string $status, string $summary, int $totalProcessed, array $rows): array
    {
        return [
            'finished_at' => now()->timezone(config('app.timezone'))->format('d.m.Y H:i:s'),
            'status' => $status,
            'total_processed' => $totalProcessed,
            'rows' => $rows,
            'summary' => $summary,
        ];
    }

    /**
     * @param  list<array{source: string, processed: int, synced: int, error?: string}>  $results
     * @return array{message: string, report: array{finished_at: string, status: string, total_processed: int, rows: list<array{source: string, processed: int, error: string|null}>, summary: string}}
     */
    private function crawlOutcomeFromResults(array $results): array
    {
        $totalProcessed = 0;
        $perSourceOk = [];
        /** @var array<string, list<string>> $errorGroups compact message => source keys */
        $errorGroups = [];
        $rows = [];

        foreach ($results as $row) {
            $source = (string) ($row['source'] ?? '?');
            $err = ! empty($row['error']) ? (string) $row['error'] : null;
            $n = (int) ($row['processed'] ?? 0);
            $rows[] = [
                'source' => $source,
                'processed' => $n,
                'error' => $err,
            ];
            if ($err !== null) {
                $errorGroups[$err][] = $source;

                continue;
            }
            $totalProcessed += $n;
            if ($n > 0) {
                $perSourceOk[] = $source.' → '.$n;
            }
        }

        $errorParts = [];
        foreach ($errorGroups as $errMsg => $sources) {
            $sources = array_values(array_unique($sources));
            sort($sources, SORT_STRING);
            $errorParts[] = implode(', ', $sources).': '.$errMsg;
        }

        if ($errorParts !== [] && $totalProcessed === 0) {
            $message = 'Crawl tamamlandı ancak kayıt işlenemedi. '.implode(' | ', $errorParts);
            $report = $this->minimalCrawlReport('error', $message, 0, $rows);

            return ['message' => $message, 'report' => $report];
        }

        if ($totalProcessed === 0 && $errorParts === []) {
            $message = 'Crawl tamamlandı. Filtreye veya limite uyan yeni kayıt yok (0 işlendi). Tarih, şehir veya önizlemeyi kontrol edin.';
            $report = $this->minimalCrawlReport('info', $message, 0, $rows);

            return ['message' => $message, 'report' => $report];
        }

        $headline = 'Crawl tamamlandı. Toplam '.$totalProcessed.' aday kayıt yazıldı veya güncellendi.';
        $rest = [];
        if ($perSourceOk !== []) {
            $rest[] = 'Kaynaklar: '.implode(' · ', $perSourceOk).'.';
        }
        if ($errorParts !== []) {
            $rest[] = 'Uyarı: '.implode(' | ', $errorParts);
        }
        $message = $rest === [] ? $headline : $headline.' '.implode(' ', $rest);

        $status = $errorParts !== [] ? 'warning' : 'success';
        $report = $this->minimalCrawlReport($status, $message, $totalProcessed, $rows);

        return ['message' => $message, 'report' => $report];
    }
}
