<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Event;
use App\Models\Venue;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $venueIds = $request->user()->venues()->pluck('id');
        $events = Event::whereIn('venue_id', $venueIds)
            ->with(['venue', 'ticketTiers', 'artists:id,name'])
            ->latest('start_date')
            ->paginate(15);

        $events->getCollection()->transform(function (Event $e): Event {
            $e->setAttribute(
                'public_url_segment',
                $e->status === 'published' ? $e->publicUrlSegment() : null
            );

            return $e;
        });

        return Inertia::render('Artist/Events/Index', ['events' => $events]);
    }

    public function create(Request $request)
    {
        $venues = $request->user()->venues()->where('status', 'approved')->get();
        if ($venues->isEmpty()) {
            return redirect()
                ->route('artist.venues.create')
                ->with('error', 'Etkinlik eklemek için önce bir mekan kaydı oluşturup onay alın. Mekanınız yoksa “Mekan ekle” ile başlayın.');
        }

        $artists = Artist::approved()->notIntlImport()->orderBy('name')->get(['id', 'name']);
        $defaultArtistId = Artist::query()
            ->where('user_id', $request->user()->id)
            ->where('status', 'approved')
            ->value('id');

        return Inertia::render('Artist/Events/Create', [
            'venues' => $venues,
            'artists' => $artists,
            'defaultArtistId' => $defaultArtistId,
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'ticket_tiers' => Event::filterTicketTierRowsFromRequestInput($request->input('ticket_tiers')),
            'artist_ids' => $request->input('artist_ids') ?? [],
            'start_date' => $request->input('start_date') ?: null,
            'end_date' => $request->input('end_date') ?: null,
        ]);

        $validated = $request->validate([
            'venue_id' => [
                'required',
                'integer',
                Rule::exists('venues', 'id')->where(fn ($q) => $q->where('user_id', $request->user()->id)->where('status', 'approved')),
            ],
            'artist_ids' => 'nullable|array',
            'artist_ids.*' => ['integer', Artist::ruleExistsInPublicCatalog()],
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_rules' => 'nullable|string|max:5000',
            'start_date' => 'nullable|date',
            'end_date' => [
                'nullable',
                'date',
                function (string $attribute, mixed $value, \Closure $fail) use ($request): void {
                    if ($value === null || $value === '') {
                        return;
                    }
                    $start = $request->input('start_date');
                    if (! $start) {
                        return;
                    }
                    try {
                        if (Carbon::parse($value)->lt(Carbon::parse($start))) {
                            $fail('Bitiş tarihi başlangıçtan önce olamaz.');
                        }
                    } catch (\Throwable) {
                        $fail('Geçerli bir bitiş tarihi girin.');
                    }
                },
            ],
            'ticket_price' => 'nullable|numeric|min:0',
            'capacity' => 'nullable|integer|min:1',
            'is_full' => 'sometimes|boolean',
            'ticket_tiers' => 'nullable|array',
            'ticket_tiers.*.name' => 'required|string|max:255',
            'ticket_tiers.*.description' => 'nullable|string|max:500',
            'ticket_tiers.*.price' => 'required|numeric|min:0',
            'ticket_tiers.*.sort_order' => 'nullable|integer|min:0',
            'ticket_acquisition_mode' => 'required|string|in:external_platforms,sahnebul,phone_only',
            'ticket_outlets' => 'nullable|array|max:15',
            'ticket_outlets.*.label' => 'nullable|string|max:120',
            'ticket_outlets.*.url' => 'nullable|string|max:2048',
            'ticket_purchase_note' => 'nullable|string|max:5000',
        ]);

        $ticketTiers = $validated['ticket_tiers'] ?? [];
        unset($validated['ticket_tiers']);

        $validated['is_full'] = $request->boolean('is_full');
        $validated['slug'] = Str::slug($validated['title']).'-'.Str::random(4);
        $validated['status'] = 'draft';
        $validated['ticket_purchase_note'] = isset($validated['ticket_purchase_note']) && trim((string) $validated['ticket_purchase_note']) !== ''
            ? trim((string) $validated['ticket_purchase_note'])
            : null;
        $validated = Event::applyTicketAcquisitionToValidatedArray($validated);

        $artistIds = $validated['artist_ids'];
        unset($validated['artist_ids']);

        $event = DB::transaction(function () use ($validated, $ticketTiers, $artistIds): Event {
            $event = Event::create($validated);
            $event->syncTicketTiers($ticketTiers);
            $event->syncArtistsByIds($artistIds);

            return $event;
        });

        return redirect()->route('artist.events.index')->with('success', 'Etkinlik oluşturuldu.');
    }

    public function edit(Request $request, Event $event)
    {
        if ($event->venue->user_id !== $request->user()->id) {
            abort(403);
        }
        $event->load(['venue', 'ticketTiers', 'artists:id,name']);
        $venues = $request->user()->venues()
            ->where(function ($q) use ($event) {
                $q->where('status', 'approved')
                    ->orWhere('id', $event->venue_id);
            })
            ->orderBy('name')
            ->get();
        $artists = Artist::approved()->notIntlImport()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Artist/Events/Edit', [
            'event' => $event,
            'venues' => $venues,
            'artists' => $artists,
        ]);
    }

    public function update(Request $request, Event $event)
    {
        if ($event->venue->user_id !== $request->user()->id) {
            abort(403);
        }

        $request->merge([
            'ticket_tiers' => Event::filterTicketTierRowsFromRequestInput($request->input('ticket_tiers')),
            'artist_ids' => $request->input('artist_ids') ?? [],
            'start_date' => $request->input('start_date') ?: null,
            'end_date' => $request->input('end_date') ?: null,
        ]);

        $validated = $request->validate([
            'venue_id' => [
                'required',
                'integer',
                function (string $attribute, mixed $value, \Closure $fail) use ($request, $event) {
                    $id = (int) $value;
                    $venue = Venue::query()
                        ->where('id', $id)
                        ->where('user_id', $request->user()->id)
                        ->first();
                    if (! $venue) {
                        $fail('Geçersiz mekan seçimi.');

                        return;
                    }
                    if ($venue->status !== 'approved' && $id !== (int) $event->venue_id) {
                        $fail('Etkinliği yalnızca onaylı bir mekana taşıyabilirsiniz.');
                    }
                },
            ],
            'artist_ids' => 'nullable|array',
            'artist_ids.*' => ['integer', Artist::ruleExistsInPublicCatalog()],
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_rules' => 'nullable|string|max:5000',
            'start_date' => 'nullable|date',
            'end_date' => [
                'nullable',
                'date',
                function (string $attribute, mixed $value, \Closure $fail) use ($request): void {
                    if ($value === null || $value === '') {
                        return;
                    }
                    $start = $request->input('start_date');
                    if (! $start) {
                        return;
                    }
                    try {
                        if (Carbon::parse($value)->lt(Carbon::parse($start))) {
                            $fail('Bitiş tarihi başlangıçtan önce olamaz.');
                        }
                    } catch (\Throwable) {
                        $fail('Geçerli bir bitiş tarihi girin.');
                    }
                },
            ],
            'ticket_price' => 'nullable|numeric|min:0',
            'capacity' => 'nullable|integer|min:1',
            'is_full' => 'sometimes|boolean',
            'status' => 'required|in:draft,published',
            'ticket_tiers' => 'nullable|array',
            'ticket_tiers.*.name' => 'required|string|max:255',
            'ticket_tiers.*.description' => 'nullable|string|max:500',
            'ticket_tiers.*.price' => 'required|numeric|min:0',
            'ticket_tiers.*.sort_order' => 'nullable|integer|min:0',
            'ticket_acquisition_mode' => 'required|string|in:external_platforms,sahnebul,phone_only',
            'ticket_outlets' => 'nullable|array|max:15',
            'ticket_outlets.*.label' => 'nullable|string|max:120',
            'ticket_outlets.*.url' => 'nullable|string|max:2048',
            'ticket_purchase_note' => 'nullable|string|max:5000',
        ]);

        $ticketTiers = $validated['ticket_tiers'] ?? [];
        unset($validated['ticket_tiers']);

        $validated['is_full'] = $request->boolean('is_full');
        $validated['ticket_purchase_note'] = isset($validated['ticket_purchase_note']) && trim((string) $validated['ticket_purchase_note']) !== ''
            ? trim((string) $validated['ticket_purchase_note'])
            : null;
        $validated = Event::applyTicketAcquisitionToValidatedArray($validated);

        $artistIds = $validated['artist_ids'];
        unset($validated['artist_ids']);

        DB::transaction(function () use ($event, $validated, $ticketTiers, $artistIds): void {
            $event->update($validated);
            $event->syncTicketTiers($ticketTiers);
            $event->syncArtistsByIds($artistIds);
        });

        return back()->with('success', 'Etkinlik güncellendi.');
    }
}
