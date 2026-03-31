<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\ImportExternalMarketplaceEventsJob;
use App\Models\Category;
use App\Models\City;
use App\Models\ExternalEvent;
use App\Services\ExternalEventDomainSyncService;
use App\Services\ExternalMarketplaceCrawlReportBuilder;
use App\Services\MarketplaceExternalEventImportService;
use App\Support\AdminDatetimeLocal;
use App\Support\ExternalEventFingerprint;
use App\Support\ExternalMarketplaceCrawlJobStatus;
use App\Support\UserBackgroundJobPointers;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;
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
                'filters' => ['source' => '', 'status' => 'pending', 'search' => '', 'artist' => '', 'date_from' => '', 'date_to' => ''],
                'sources' => array_keys(config('crawler.sources', [])),
                'crawlLookups' => $crawlLookups,
                'lastCrawlReport' => Session::get('external_events_last_crawl'),
                'persistedLastCrawl' => $this->persistedLastCrawlSnapshotForInertia(),
                'appTimezone' => (string) config('app.timezone'),
            ]);
        }

        $filters = $request->validate([
            'source' => ['nullable', 'string', 'max:64'],
            'status' => ['nullable', 'in:all,pending,synced,rejected'],
            'search' => ['nullable', 'string', 'max:120'],
            'artist' => ['nullable', 'string', 'max:120'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ]);

        if (! empty($filters['date_from']) && ! empty($filters['date_to']) && $filters['date_to'] < $filters['date_from']) {
            throw ValidationException::withMessages([
                'date_to' => 'Bitiş tarihi başlangıçtan önce olamaz.',
            ]);
        }

        $select = [
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
        ];
        if (Schema::hasColumn('external_events', 'last_crawled_at')) {
            $select[] = 'last_crawled_at';
        }

        $query = ExternalEvent::query()
            ->select($select)
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

        if (! empty($filters['date_from'])) {
            $query->whereDate('start_date', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->whereDate('start_date', '<=', $filters['date_to']);
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
                    'created_at' => $e->created_at?->toIso8601String(),
                    'last_crawled_at' => Schema::hasColumn('external_events', 'last_crawled_at')
                        ? ($e->last_crawled_at?->toIso8601String() ?? $e->updated_at?->toIso8601String())
                        : $e->updated_at?->toIso8601String(),
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
                'date_from' => $filters['date_from'] ?? '',
                'date_to' => $filters['date_to'] ?? '',
            ],
            'sources' => array_keys(config('crawler.sources', [])),
            'crawlLookups' => $crawlLookups,
            'lastCrawlReport' => Session::get('external_events_last_crawl'),
            'persistedLastCrawl' => $this->persistedLastCrawlSnapshotForInertia(),
            'appTimezone' => (string) config('app.timezone'),
        ]);
    }

    /**
     * Oturumdaki özet silinse bile son «Verileri çek» zamanı görünsün diye kalıcı önbellek.
     *
     * @return array{finished_at: string, status: string, total_processed: int, summary: string}|null
     */
    private function persistedLastCrawlSnapshotForInertia(): ?array
    {
        $raw = Cache::get('external_events_last_crawl_snapshot');
        if (! is_array($raw)) {
            return null;
        }
        $finished = $raw['finished_at'] ?? null;
        $status = $raw['status'] ?? null;
        $summary = $raw['summary'] ?? null;
        if (! is_string($finished) || ! is_string($status) || ! is_string($summary)) {
            return null;
        }
        $total = isset($raw['total_processed']) ? (int) $raw['total_processed'] : 0;

        return [
            'finished_at' => $finished,
            'status' => $status,
            'total_processed' => $total,
            'summary' => $summary,
        ];
    }

    public function dismissLastCrawlReport(): RedirectResponse
    {
        Session::forget('external_events_last_crawl');

        return back()->with('success', 'Son veri çekme özeti kaldırıldı.');
    }

    public function edit(ExternalEvent $externalEvent): Response
    {
        if (! Schema::hasTable('external_events')) {
            abort(404);
        }

        return Inertia::render('Admin/ExternalEvents/Edit', [
            'externalEvent' => [
                'id' => $externalEvent->id,
                'source' => $externalEvent->source,
                'title' => $externalEvent->title,
                'external_url' => $externalEvent->external_url,
                'image_url' => $externalEvent->image_url,
                'venue_name' => $externalEvent->venue_name,
                'city_name' => $externalEvent->city_name,
                'category_name' => $externalEvent->category_name,
                'start_date' => AdminDatetimeLocal::format($externalEvent->start_date),
                'description' => $externalEvent->description,
                'synced_event_id' => $externalEvent->synced_event_id,
            ],
        ]);
    }

    public function update(Request $request, ExternalEvent $externalEvent): RedirectResponse
    {
        if (! Schema::hasTable('external_events')) {
            abort(404);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'venue_name' => ['nullable', 'string', 'max:255'],
            'city_name' => ['nullable', 'string', 'max:120'],
            'category_name' => ['nullable', 'string', 'max:120'],
            'start_date' => ['nullable', 'string', 'max:32'],
            'description' => ['nullable', 'string'],
            'external_url' => ['nullable', 'string', 'max:2048'],
            'image_url' => ['nullable', 'string', 'max:2048'],
        ]);

        $start = null;
        $startRaw = trim((string) ($validated['start_date'] ?? ''));
        if ($startRaw !== '') {
            try {
                $start = Carbon::parse($startRaw, (string) config('app.timezone'));
            } catch (\Throwable) {
                throw ValidationException::withMessages([
                    'start_date' => 'Geçerli bir tarih ve saat girin.',
                ]);
            }
        }

        $rawUrl = trim((string) ($validated['external_url'] ?? ''));
        $normUrl = ExternalEventFingerprint::normalizedExternalUrl($rawUrl);
        $externalUrlStored = $normUrl !== '' ? $normUrl : ($rawUrl !== '' ? $rawUrl : null);

        $newFp = ExternalEventFingerprint::compute(
            (string) $externalEvent->source,
            $validated['title'],
            $externalUrlStored,
            $validated['venue_name'] !== '' && $validated['venue_name'] !== null ? $validated['venue_name'] : null,
            $start,
        );

        $collision = ExternalEvent::query()
            ->where('source', $externalEvent->source)
            ->where('fingerprint', $newFp)
            ->where('id', '!=', $externalEvent->id)
            ->exists();

        if ($collision) {
            throw ValidationException::withMessages([
                'title' => 'Bu kaynakta aynı parmak izine sahip başka bir aday var. Başlık, mekân, tarih veya kaynak URL’sini farklılaştırın.',
            ]);
        }

        $externalEvent->update([
            'fingerprint' => $newFp,
            'title' => $validated['title'],
            'venue_name' => ($validated['venue_name'] ?? '') !== '' ? $validated['venue_name'] : null,
            'city_name' => ($validated['city_name'] ?? '') !== '' ? $validated['city_name'] : null,
            'category_name' => ($validated['category_name'] ?? '') !== '' ? $validated['category_name'] : null,
            'start_date' => $start,
            'description' => ($validated['description'] ?? '') !== '' ? $validated['description'] : null,
            'external_url' => $externalUrlStored,
            'image_url' => ($validated['image_url'] ?? '') !== '' ? $validated['image_url'] : null,
        ]);

        return redirect()->route('admin.external-events.index')->with('success', 'Dış kaynak adayı güncellendi.');
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
     * @return array{source: string, limit: int, date_from: string, date_to: string, city_ids: list<int>, category_ids: list<int>}
     */
    private function validateCrawlRequest(Request $request): array
    {
        $sourceKeys = array_keys(config('crawler.sources', []));
        $data = $request->validate([
            'source' => ['nullable', 'string', Rule::in(array_merge(['', 'all'], $sourceKeys))],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
            'city_ids' => ['nullable', 'array'],
            'city_ids.*' => ['integer', 'exists:cities,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
        ]);

        $from = Carbon::parse($data['date_from'])->startOfDay();
        $to = Carbon::parse($data['date_to'])->startOfDay();
        if ($from->diffInDays($to) > 400) {
            throw ValidationException::withMessages([
                'date_to' => 'Tarih aralığı en fazla 400 gün olabilir.',
            ]);
        }

        $sourceOption = $data['source'] ?? 'all';
        if ($sourceOption === '') {
            $sourceOption = 'all';
        }

        return [
            'source' => $sourceOption,
            'limit' => (int) ($data['limit'] ?? 250),
            'date_from' => (string) $data['date_from'],
            'date_to' => (string) $data['date_to'],
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
            $this->persistLastCrawlReport(ExternalMarketplaceCrawlReportBuilder::minimalReport('error', $msg, 0, []));

            return back()->with('error', $msg);
        }

        $validated = $this->validateCrawlRequest($request);
        [$cityNames, $categoryNames] = $this->resolveCityAndCategoryNames($validated);

        $configured = array_keys(config('crawler.sources', []));
        if ($configured === []) {
            $msg = 'Yapılandırılmış crawl kaynağı yok (config/crawler.php).';
            $this->persistLastCrawlReport(ExternalMarketplaceCrawlReportBuilder::minimalReport('error', $msg, 0, []));

            return back()->with('error', $msg);
        }

        $statusToken = (string) Str::uuid();
        $userId = (int) $request->user()->id;
        ExternalMarketplaceCrawlJobStatus::boot($statusToken, $userId, (string) $validated['source']);
        UserBackgroundJobPointers::setExternalCrawlToken($userId, $statusToken);

        ImportExternalMarketplaceEventsJob::dispatch(
            $validated['source'],
            $validated['limit'],
            $validated['date_from'],
            $validated['date_to'],
            $cityNames,
            $categoryNames,
            $statusToken,
        )->afterResponse();

        return back()
            ->with(
                'success',
                'Veri çekme başladı; sayfa hemen yanıtlanır (504 ağ geçidi zaman aşımı oluşmaz). Aşağıdaki çubuktan ilerlemeyi izleyebilirsiniz; bittiğinde özet üstte güncellenir.',
            )
            ->with('external_crawl_job_id', $statusToken);
    }

    public function crawlJobStatus(Request $request, string $token): JsonResponse
    {
        $data = ExternalMarketplaceCrawlJobStatus::get($token);
        if ($data === null) {
            return response()->json(['error' => 'bulunamadı'], 404);
        }
        if ((int) ($data['user_id'] ?? 0) !== (int) $request->user()->id) {
            abort(403);
        }

        return response()->json([
            'state' => (string) ($data['state'] ?? 'unknown'),
            'phase' => (string) ($data['phase'] ?? 'crawl'),
            'current' => (int) ($data['current'] ?? 0),
            'total' => (int) ($data['total'] ?? 1),
            'message' => (string) ($data['message'] ?? ''),
            'active_source' => isset($data['active_source']) && is_string($data['active_source']) ? $data['active_source'] : null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $report
     */
    private function persistLastCrawlReport(array $report): void
    {
        Session::put('external_events_last_crawl', $report);
        Cache::forever('external_events_last_crawl_snapshot', $report);
    }
}
