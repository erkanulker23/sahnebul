<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Category;
use App\Models\Event;
use App\Models\Venue;
use App\Services\AppSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class EventController extends Controller
{
    public function create()
    {
        return Inertia::render('Admin/Events/Create', [
            'venues' => Venue::approved()->orderBy('name')->get(['id', 'name']),
            'artists' => Artist::approved()->notIntlImport()->orderBy('name')->get(['id', 'name']),
            'venuePickerCategories' => Category::orderBy('order')->get(['id', 'name']),
            'googleMapsBrowserKey' => app(AppSettingsService::class)->getGoogleMapsBrowserKey(),
        ]);
    }

    public function index(Request $request)
    {
        $events = Event::with(['venue', 'artists', 'ticketTiers'])
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->venue_id, fn ($q) => $q->where('venue_id', $request->venue_id))
            ->latest('start_date')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Events/Index', [
            'events' => $events,
            'filters' => array_filter($request->only(['status', 'venue_id']), fn ($v) => $v !== null && $v !== ''),
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'description' => $request->input('description') ?: null,
            'event_rules' => $request->input('event_rules') ?: null,
            'end_date' => $request->input('end_date') ?: null,
            'ticket_price' => $request->input('ticket_price') ?: null,
            'capacity' => $request->input('capacity') ?: null,
            'artist_ids' => $request->input('artist_ids') ?: [],
            'cover_image' => $request->input('cover_image') ?: null,
        ]);

        $validated = $request->validate([
            'venue_id' => ['required', Rule::exists('venues', 'id')->where(fn ($q) => $q->where('status', 'approved'))],
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_rules' => 'nullable|string|max:5000',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'ticket_price' => 'nullable|numeric|min:0',
            'capacity' => 'nullable|integer|min:1',
            'status' => 'required|in:draft,published,cancelled',
            'artist_ids' => 'required|array|min:1',
            'artist_ids.*' => ['integer', Artist::ruleExistsInPublicCatalog()],
            'ticket_tiers' => 'nullable|array',
            'ticket_tiers.*.name' => 'required|string|max:255',
            'ticket_tiers.*.description' => 'nullable|string|max:500',
            'ticket_tiers.*.price' => 'required|numeric|min:0',
            'ticket_tiers.*.sort_order' => 'nullable|integer|min:0',
            'cover_image' => 'nullable|string|max:2048',
            'cover_upload' => 'nullable|image|max:10240',
            'ticket_acquisition_mode' => 'required|string|in:external_platforms,sahnebul,phone_only',
            'ticket_outlets' => 'nullable|array|max:15',
            'ticket_outlets.*.label' => 'nullable|string|max:120',
            'ticket_outlets.*.url' => 'nullable|string|max:2048',
            'ticket_purchase_note' => 'nullable|string|max:5000',
        ]);

        $ticketTiers = $validated['ticket_tiers'] ?? [];
        unset($validated['ticket_tiers']);

        unset($validated['cover_upload']);
        if ($request->hasFile('cover_upload')) {
            $validated['cover_image'] = $request->file('cover_upload')->store('event-covers', 'public');
        }

        $validated['ticket_purchase_note'] = isset($validated['ticket_purchase_note']) && trim((string) $validated['ticket_purchase_note']) !== ''
            ? trim((string) $validated['ticket_purchase_note'])
            : null;

        $validated = Event::applyTicketAcquisitionToValidatedArray($validated);

        $artistIds = $validated['artist_ids'];
        unset($validated['artist_ids']);

        $event = DB::transaction(function () use ($validated, $ticketTiers, $artistIds): Event {
            $event = Event::create([
                ...$validated,
                'slug' => Str::slug($validated['title']).'-'.Str::lower(Str::random(4)),
            ]);

            $event->syncTicketTiers($ticketTiers);
            $event->syncArtistsByIds($artistIds);

            return $event;
        });

        return redirect()->route('admin.events.edit', $event)->with('success', 'Etkinlik eklendi. Detayları düzenleyebilirsiniz.');
    }

    public function edit(Event $event)
    {
        $event->load(['venue', 'artists', 'ticketTiers']);

        return Inertia::render('Admin/Events/Edit', [
            'event' => $event,
            'venues' => Venue::approved()->orderBy('name')->get(['id', 'name']),
            'artists' => Artist::approved()->notIntlImport()->orderBy('name')->get(['id', 'name']),
            'venuePickerCategories' => Category::orderBy('order')->get(['id', 'name']),
            'googleMapsBrowserKey' => app(AppSettingsService::class)->getGoogleMapsBrowserKey(),
        ]);
    }

    public function update(Request $request, Event $event)
    {
        $request->merge([
            'description' => $request->input('description') ?: null,
            'event_rules' => $request->input('event_rules') ?: null,
            'end_date' => $request->input('end_date') ?: null,
            'ticket_price' => $request->input('ticket_price') ?: null,
            'capacity' => $request->input('capacity') ?: null,
            'artist_ids' => $request->input('artist_ids') ?: [],
            'cover_image' => $request->input('cover_image') ?: null,
        ]);

        $validated = $request->validate([
            'venue_id' => ['required', Rule::exists('venues', 'id')->where(fn ($q) => $q->where('status', 'approved'))],
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_rules' => 'nullable|string|max:5000',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'ticket_price' => 'nullable|numeric|min:0',
            'capacity' => 'nullable|integer|min:1',
            'status' => 'required|in:draft,published,cancelled',
            'artist_ids' => 'required|array|min:1',
            'artist_ids.*' => ['integer', Artist::ruleExistsInPublicCatalog()],
            'ticket_tiers' => 'nullable|array',
            'ticket_tiers.*.name' => 'required|string|max:255',
            'ticket_tiers.*.description' => 'nullable|string|max:500',
            'ticket_tiers.*.price' => 'required|numeric|min:0',
            'ticket_tiers.*.sort_order' => 'nullable|integer|min:0',
            'cover_image' => 'nullable|string|max:2048',
            'cover_upload' => 'nullable|image|max:10240',
            'ticket_acquisition_mode' => 'required|string|in:external_platforms,sahnebul,phone_only',
            'ticket_outlets' => 'nullable|array|max:15',
            'ticket_outlets.*.label' => 'nullable|string|max:120',
            'ticket_outlets.*.url' => 'nullable|string|max:2048',
            'ticket_purchase_note' => 'nullable|string|max:5000',
        ]);

        $ticketTiers = $validated['ticket_tiers'] ?? [];
        unset($validated['ticket_tiers']);

        unset($validated['cover_upload']);
        if ($request->hasFile('cover_upload')) {
            if ($event->cover_image && ! Str::startsWith($event->cover_image, ['http://', 'https://'])) {
                Storage::disk('public')->delete($event->cover_image);
            }
            $validated['cover_image'] = $request->file('cover_upload')->store('event-covers', 'public');
        }

        $validated['ticket_purchase_note'] = isset($validated['ticket_purchase_note']) && trim((string) $validated['ticket_purchase_note']) !== ''
            ? trim((string) $validated['ticket_purchase_note'])
            : null;

        $validated = Event::applyTicketAcquisitionToValidatedArray($validated);

        if ($event->title !== $validated['title']) {
            $validated['slug'] = Str::slug($validated['title']).'-'.Str::lower(Str::random(4));
        }

        $artistIds = $validated['artist_ids'];
        unset($validated['artist_ids']);

        DB::transaction(function () use ($event, $validated, $ticketTiers, $artistIds): void {
            $event->update($validated);

            $event->syncTicketTiers($ticketTiers);
            $event->syncArtistsByIds($artistIds);
        });

        return redirect()->route('admin.events.edit', $event)->with('success', 'Etkinlik güncellendi.');
    }

    public function approve(Event $event)
    {
        if ($event->artists()->count() === 0) {
            return back()->with('error', 'Yayınlamak için etkinliğe en az bir onaylı sanatçı bağlanmalıdır.');
        }
        $event->update(['status' => 'published']);

        return back()->with('success', 'Etkinlik yayınlandı.');
    }

    public function destroy(Event $event)
    {
        $this->performEventDelete($event);

        return redirect()->route('admin.events.index')->with('success', 'Etkinlik silindi.');
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['integer', 'exists:events,id'],
        ]);

        $ids = array_values(array_unique(array_map('intval', $validated['ids'])));

        $count = (int) DB::transaction(function () use ($ids): int {
            $n = 0;
            foreach ($ids as $id) {
                $event = Event::query()->find($id);
                if ($event) {
                    $this->performEventDelete($event);
                    $n++;
                }
            }

            return $n;
        });

        return redirect()->route('admin.events.index', $request->only(['status', 'venue_id']))->with('success', "{$count} etkinlik silindi.");
    }

    private function performEventDelete(Event $event): void
    {
        if ($event->cover_image && ! Str::startsWith($event->cover_image, ['http://', 'https://'])) {
            Storage::disk('public')->delete($event->cover_image);
        }
        $event->delete();
    }
}
