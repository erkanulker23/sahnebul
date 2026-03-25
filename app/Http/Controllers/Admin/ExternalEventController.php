<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ExternalEvent;
use App\Services\ExternalEventDomainSyncService;
use App\Services\MarketplaceExternalEventImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
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
        if (! Schema::hasTable('external_events')) {
            return Inertia::render('Admin/ExternalEvents/Index', [
                'items' => ['data' => []],
                'filters' => ['source' => '', 'status' => 'pending', 'search' => ''],
                'sources' => array_keys(config('crawler.sources', [])),
            ]);
        }

        $filters = $request->validate([
            'source' => ['nullable', 'string', 'max:64'],
            'status' => ['nullable', 'in:all,pending,synced,rejected'],
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        $query = ExternalEvent::query()->latest();

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

        return Inertia::render('Admin/ExternalEvents/Index', [
            'items' => $query->paginate(25)->withQueryString(),
            'filters' => [
                'source' => $filters['source'] ?? '',
                'status' => $status,
                'search' => $filters['search'] ?? '',
            ],
            'sources' => array_keys(config('crawler.sources', [])),
        ]);
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
            'action' => ['required', 'in:sync,reject'],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:external_events,id'],
        ]);

        $items = ExternalEvent::whereIn('id', $data['ids'])->get();
        $affected = 0;

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
            return back()->with('error', 'external_events tablosu bulunamadı. Önce migration çalıştırın.');
        }

        $sourceKeys = array_keys(config('crawler.sources', []));
        $data = $request->validate([
            'source' => ['nullable', 'string', Rule::in(array_merge(['', 'all'], $sourceKeys))],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $sourceOption = $data['source'] ?? 'all';
        if ($sourceOption === '') {
            $sourceOption = 'all';
        }

        $limit = $data['limit'] ?? 250;

        $results = $this->marketplaceImport->import($sourceOption, $limit, false);

        if ($results === []) {
            return back()->with('error', 'Yapılandırılmış crawl kaynağı yok (config/crawler.php).');
        }

        $lines = [];
        $allFailed = true;

        foreach ($results as $r) {
            if (! empty($r['error'])) {
                $lines[] = "{$r['source']}: {$r['error']}";
            } else {
                $allFailed = false;
                $lines[] = "{$r['source']}: {$r['processed']} kayıt alındı veya güncellendi.";
            }
        }

        $message = implode(' ', $lines);

        if ($allFailed && $lines !== []) {
            return back()->with('error', $message);
        }

        return back()->with('success', $message);
    }
}
