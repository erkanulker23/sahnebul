<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Concerns\PromoGalleryImportActions;
use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\ArtistEventProposal;
use App\Models\Category;
use App\Models\Event;
use App\Models\EventArtistReport;
use App\Models\EventReview;
use App\Models\Review;
use App\Models\User;
use App\Models\Venue;
use App\Services\AppSettingsService;
use App\Services\EventMediaImportFromUrlService;
use App\Support\AdminDatetimeLocal;
use App\Support\ArtistProfileInputs;
use App\Support\EventListingTypes;
use App\Support\EventPromoVenueProfileModeration;
use App\Support\TurkishPhone;
use App\Support\UserContactValidation;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;

class EventController extends Controller
{
    use PromoGalleryImportActions;

    public function index(Request $request)
    {
        $user = $request->user();
        $artistIds = Artist::query()->where('user_id', $user->id)->pluck('id');

        $filter = $request->query('filter', 'all');
        if (! in_array($filter, ['all', 'upcoming', 'past', 'draft'], true)) {
            $filter = 'all';
        }

        $ownedVenueIds = $user->venues()->pluck('id');
        $base = $this->eventsQueryForUser($user, $ownedVenueIds);
        $stats = [
            'total' => (clone $base)->count(),
            'upcoming' => (clone $base)->whereNotNull('start_date')->where('start_date', '>=', now())->count(),
            'past' => (clone $base)->whereNotNull('start_date')->where('start_date', '<', now())->count(),
            'drafts' => (clone $base)->where('status', 'draft')->count(),
        ];

        $events = (clone $base)
            ->with(['venue:id,name,slug,user_id', 'ticketTiers', 'artists:id,name'])
            ->when($filter === 'upcoming', fn (Builder $q) => $q->whereNotNull('start_date')->where('start_date', '>=', now()))
            ->when($filter === 'past', fn (Builder $q) => $q->whereNotNull('start_date')->where('start_date', '<', now()))
            ->when($filter === 'draft', fn (Builder $q) => $q->where('status', 'draft'))
            ->when($filter === 'upcoming', fn (Builder $q) => $q->orderBy('start_date'))
            ->when($filter === 'past', fn (Builder $q) => $q->orderByDesc('start_date'))
            ->when($filter === 'draft', fn (Builder $q) => $q->latest('updated_at'))
            ->when($filter === 'all', fn (Builder $q) => $q->latest('start_date'))
            ->paginate(15)
            ->appends(['filter' => $filter]);

        $eventIds = $events->getCollection()->pluck('id')->filter()->values();
        $reportsByEventId = collect();
        if ($artistIds->isNotEmpty() && $eventIds->isNotEmpty()) {
            $reportsByEventId = EventArtistReport::query()
                ->whereIn('event_id', $eventIds)
                ->whereIn('artist_id', $artistIds)
                ->orderByRaw('CASE WHEN status = ? THEN 0 ELSE 1 END', [EventArtistReport::STATUS_PENDING])
                ->orderByDesc('created_at')
                ->get()
                ->unique('event_id')
                ->keyBy('event_id');
        }

        $events->getCollection()->transform(function (Event $e) use ($user, $reportsByEventId): Event {
            $e->setAttribute(
                'public_url_segment',
                $e->status === 'published' ? $e->publicUrlSegment() : null
            );
            $e->setAttribute('panel_can_edit', (int) $e->venue->user_id === (int) $user->id);
            $e->setAttribute('panel_can_edit_artist_profile_promo', $this->userMayEditArtistProfilePromo($user, $e));
            $min = $e->minPrice();
            $e->setAttribute('min_price', $min !== null ? round($min, 2) : null);

            $r = $reportsByEventId->get($e->id);
            $e->setAttribute(
                'artist_report',
                $r !== null ? ['status' => $r->status, 'id' => $r->id] : null
            );

            return $e;
        });

        $canCreateEvent = $user->venues()->where('status', 'approved')->exists()
            || Artist::query()->where('user_id', $user->id)->where('status', 'approved')->exists()
            || $this->managedApprovedArtistIds($user)->isNotEmpty();

        return Inertia::render('Artist/Events/Index', [
            'events' => $events,
            'canCreateEvent' => $canCreateEvent,
            'stats' => $stats,
            'filter' => $filter,
            /** Hesabına kayıtlı en az bir mekân satırı varsa liste yalnızca bu mekânlardaki etkinlikleri kapsar (başka mekânlarda kadroda olunanlar gösterilmez). */
            'listsOnlyOwnedVenueEvents' => $ownedVenueIds->isNotEmpty(),
        ]);
    }

    private function eventsQueryForUser(User $user, Collection $ownedVenueIds): Builder
    {
        $artistIds = Artist::query()->where('user_id', $user->id)->pluck('id');
        $managedArtistIds = $this->managedApprovedArtistIds($user);

        if ($ownedVenueIds->isNotEmpty()) {
            return Event::query()->whereIn('venue_id', $ownedVenueIds);
        }

        return Event::query()
            ->where(function ($q) use ($artistIds, $managedArtistIds) {
                $has = false;
                if ($artistIds->isNotEmpty()) {
                    $q->whereHas('artists', fn ($a) => $a->whereIn('artists.id', $artistIds));
                    $has = true;
                }
                if ($managedArtistIds->isNotEmpty()) {
                    $method = $has ? 'orWhereHas' : 'whereHas';
                    $q->{$method}('artists', fn ($a) => $a->whereIn('artists.id', $managedArtistIds));
                    $has = true;
                }
                if (! $has) {
                    $q->whereRaw('0 = 1');
                }
            });
    }

    public function create(Request $request)
    {
        $user = $request->user();
        $ownVenues = $user->venues()->where('status', 'approved')->orderBy('name')->get(['id', 'name', 'slug']);

        if ($ownVenues->isNotEmpty()) {
            $venues = $ownVenues;
            $venuePickerMode = 'own';
            $venueSearch = '';
        } else {
            $linkedArtist = Artist::query()
                ->where('user_id', $user->id)
                ->where('status', 'approved')
                ->first(['id', 'name']);

            $managedArtists = Artist::query()
                ->where('managed_by_user_id', $user->id)
                ->where('status', 'approved')
                ->orderBy('name')
                ->get(['id', 'name']);

            if ($linkedArtist === null && $managedArtists->isEmpty()) {
                return redirect()
                    ->route('artist.events.index')
                    ->with('error', 'Etkinlik oluşturmak için onaylı bir mekânınız, onaylı bir sanatçı profiliniz veya kadronuzda onaylı bir sanatçınız olmalıdır.');
            }

            $search = $request->string('venue_search')->trim()->toString();
            $query = Venue::query()->listedPublicly()->with(['city:id,name']);
            if ($search !== '') {
                $term = '%'.addcslashes($search, '%_\\').'%';
                $query->where('name', 'like', $term);
            }
            $venues = $query->orderBy('name')->limit(100)->get(['id', 'name', 'slug', 'city_id']);
            $venuePickerMode = 'catalog';
            $venueSearch = $search;
        }

        if ($ownVenues->isNotEmpty()) {
            $linkedArtist = Artist::query()
                ->where('user_id', $user->id)
                ->where('status', 'approved')
                ->first(['id', 'name']);
        }

        $hasOwnApprovedVenue = $ownVenues->isNotEmpty();
        $managedArtistsForPicker = Artist::query()
            ->where('managed_by_user_id', $user->id)
            ->where('status', 'approved')
            ->orderBy('name')
            ->get(['id', 'name']);

        $lockArtistsToSelf = $linkedArtist !== null && ! $hasOwnApprovedVenue;
        $useManagedRosterOnly = ! $hasOwnApprovedVenue && $linkedArtist === null && $managedArtistsForPicker->isNotEmpty();
        $artists = $lockArtistsToSelf
            ? Artist::approved()->notIntlImport()->whereRaw('0 = 1')->get(['id', 'name'])
            : (
                $useManagedRosterOnly
                    ? $managedArtistsForPicker
                    : Artist::approved()->notIntlImport()->orderBy('name')->get(['id', 'name'])
            );

        $defaultArtistId = $linkedArtist?->id ?? $managedArtistsForPicker->first()?->id;

        $props = [
            'venues' => $venues,
            'venuePickerMode' => $venuePickerMode,
            'venueSearch' => $venueSearch,
            'artists' => $artists,
            'defaultArtistId' => $defaultArtistId,
            'lockArtistsToSelf' => $lockArtistsToSelf,
            'linkedArtistName' => $linkedArtist?->name,
            'managedRosterArtistPicker' => $useManagedRosterOnly,
        ];

        if ($venuePickerMode === 'catalog') {
            $props['categories'] = Category::orderBy('order')->get(['id', 'name']);
            $props['googleMapsBrowserKey'] = app(AppSettingsService::class)->getGoogleMapsBrowserKey();
        }

        $props['eventTypeOptions'] = EventListingTypes::options();

        return Inertia::render('Artist/Events/Create', $props);
    }

    /**
     * Onaylı sanatçı profili olan ve kendi onaylı mekânı olmayan kullanıcı: yeni mekân + etkinlik önerisi (admin onayı).
     */
    public function proposeWithNewVenue(Request $request)
    {
        $user = $request->user();
        if ($user->venues()->where('status', 'approved')->exists()) {
            return redirect()
                ->route('artist.events.create')
                ->with('error', 'Onaylı mekânınız varsa etkinliği doğrudan oluşturun veya katalogdan mekân seçin.');
        }

        $linkedArtist = Artist::query()
            ->where('user_id', $user->id)
            ->where('status', 'approved')
            ->first();

        if ($linkedArtist === null && $user->isManagementAccount()) {
            $linkedArtist = Artist::query()
                ->where('managed_by_user_id', $user->id)
                ->where('status', 'approved')
                ->orderBy('name')
                ->first();
        }

        if ($linkedArtist === null) {
            return redirect()
                ->route('artist.events.index')
                ->with('error', 'Yeni mekân önerisi için onaylı sanatçı profiliniz veya kadronuzda onaylı bir sanatçınız olmalıdır.');
        }

        $pv = $request->input('proposed_venue', []);
        if (! is_array($pv)) {
            $pv = [];
        }
        $pv['district_id'] = $pv['district_id'] ?? null;
        $pv['neighborhood_id'] = $pv['neighborhood_id'] ?? null;
        $pv['social_links'] = ArtistProfileInputs::normalizeSocialLinks($pv['social_links'] ?? []);
        $request->merge([
            'proposed_venue' => $pv,
            'ticket_tiers' => Event::filterTicketTierRowsFromRequestInput($request->input('ticket_tiers')),
            'artist_ids' => $request->input('artist_ids') ?? [],
            'start_date' => $request->input('start_date') ?: null,
            'end_date' => $request->input('end_date') ?: null,
            'entry_is_paid' => $request->boolean('entry_is_paid', true),
            'event_type' => $request->input('event_type') ?: null,
            'sahnebul_reservation_enabled' => $request->boolean('sahnebul_reservation_enabled', true),
            'paytr_checkout_enabled' => $request->boolean('paytr_checkout_enabled', true),
        ]);

        $validated = $request->validate([
            'proposed_venue' => ['required', 'array'],
            'proposed_venue.name' => 'required|string|max:255',
            'proposed_venue.category_id' => 'required|exists:categories,id',
            'proposed_venue.city_id' => 'required|exists:cities,id',
            'proposed_venue.district_id' => 'nullable|exists:districts,id',
            'proposed_venue.neighborhood_id' => 'nullable|exists:neighborhoods,id',
            'proposed_venue.description' => 'nullable|string',
            'proposed_venue.address' => 'required|string',
            'proposed_venue.latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'proposed_venue.longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'proposed_venue.google_maps_url' => 'nullable|string|max:2048',
            'proposed_venue.capacity' => 'nullable|integer|min:1',
            'proposed_venue.phone' => UserContactValidation::phoneNullable(),
            'proposed_venue.whatsapp' => UserContactValidation::whatsappNullable(),
            'proposed_venue.website' => 'nullable|url|max:255',
            'proposed_venue.social_links' => 'nullable|array',
            'proposed_venue.social_links.*' => 'nullable|string|max:500',
            'proposed_venue.google_gallery_photo_urls' => 'nullable|array|max:5',
            'proposed_venue.google_gallery_photo_urls.*' => 'nullable|string|url|max:4096',
            'artist_ids' => 'nullable|array',
            'artist_ids.*' => ['integer', Artist::ruleExistsInPublicCatalog()],
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_rules' => 'nullable|string|max:5000',
            'entry_is_paid' => 'boolean',
            'event_type' => EventListingTypes::nullableSlugRule(),
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
            'ticket_acquisition_mode' => Event::TICKET_ACQUISITION_MODE_RULE,
            'ticket_outlets' => 'nullable|array|max:15',
            'ticket_outlets.*.label' => 'nullable|string|max:120',
            'ticket_outlets.*.url' => 'nullable|string|max:2048',
            'ticket_purchase_note' => 'nullable|string|max:5000',
            'sahnebul_reservation_enabled' => 'boolean',
            'paytr_checkout_enabled' => 'boolean',
        ]);

        $validated['proposed_venue'] = TurkishPhone::mergeNormalizedInto($validated['proposed_venue'], ['phone']);
        $validated['proposed_venue'] = TurkishPhone::mergeNormalizedWhatsAppInto($validated['proposed_venue'], 'whatsapp');

        $venuePayload = $validated['proposed_venue'];
        unset($validated['proposed_venue']);

        $ticketTiers = $validated['ticket_tiers'] ?? [];
        unset($validated['ticket_tiers']);

        [$eventPart, $ticketTiers] = Event::applyEntryPaidToValidated($validated, $ticketTiers);
        $eventPart['is_full'] = $request->boolean('is_full');
        $eventPart['ticket_purchase_note'] = isset($eventPart['ticket_purchase_note']) && trim((string) $eventPart['ticket_purchase_note']) !== ''
            ? trim((string) $eventPart['ticket_purchase_note'])
            : null;
        $eventPart = Event::applyTicketAcquisitionToValidatedArray($eventPart);
        $eventPart['event_type'] = isset($eventPart['event_type']) && $eventPart['event_type'] !== ''
            ? (string) $eventPart['event_type']
            : null;

        $artistIds = $eventPart['artist_ids'] ?? [];
        unset($eventPart['artist_ids']);
        $ids = is_array($artistIds) ? array_map('intval', $artistIds) : [];
        $ids = array_values(array_unique(array_filter($ids, fn (int $id) => $id > 0)));
        $ids = array_values(array_diff($ids, [(int) $linkedArtist->id]));
        array_unshift($ids, (int) $linkedArtist->id);

        $galleryUrls = array_values(array_filter(array_map('trim', $venuePayload['google_gallery_photo_urls'] ?? [])));
        $galleryUrls = array_slice($galleryUrls, 0, 5);
        $venuePayload['google_gallery_photo_urls'] = $galleryUrls;
        if (empty($venuePayload['google_maps_url'])) {
            $venuePayload['google_maps_url'] = null;
        }

        $eventPayload = array_merge($eventPart, [
            'ticket_tiers' => $ticketTiers,
            'artist_ids' => $ids,
        ]);

        ArtistEventProposal::create([
            'user_id' => $user->id,
            'artist_id' => $linkedArtist->id,
            'status' => ArtistEventProposal::STATUS_PENDING,
            'venue_payload' => $venuePayload,
            'event_payload' => $eventPayload,
        ]);

        app(AppSettingsService::class)->forgetCaches();

        return redirect()
            ->route('artist.events.index')
            ->with('success', 'Mekân ve etkinlik öneriniz yöneticilere iletildi. Onaylandığında taslak etkinlik oluşturulur.');
    }

    public function store(Request $request)
    {
        $request->merge([
            'ticket_tiers' => Event::filterTicketTierRowsFromRequestInput($request->input('ticket_tiers')),
            'artist_ids' => $request->input('artist_ids') ?? [],
            'start_date' => $request->input('start_date') ?: null,
            'end_date' => $request->input('end_date') ?: null,
            'entry_is_paid' => $request->boolean('entry_is_paid', true),
            'event_type' => $request->input('event_type') ?: null,
            'sahnebul_reservation_enabled' => $request->boolean('sahnebul_reservation_enabled', true),
            'paytr_checkout_enabled' => $request->boolean('paytr_checkout_enabled', true),
        ]);

        $validated = $request->validate([
            'venue_id' => [
                'required',
                'integer',
                function (string $attribute, mixed $value, \Closure $fail) use ($request): void {
                    $id = (int) $value;
                    if ($id <= 0) {
                        $fail('Geçerli bir mekân seçin.');

                        return;
                    }
                    $venue = Venue::query()->whereKey($id)->where('status', 'approved')->where('is_active', true)->first();
                    if ($venue === null) {
                        $fail('Seçilen mekân bulunamadı, onaylı değil veya yayında değil.');

                        return;
                    }
                    $user = $request->user();
                    if ((int) $venue->user_id === (int) $user->id) {
                        return;
                    }
                    $canPickForeignVenue = Artist::query()
                        ->where('user_id', $user->id)
                        ->where('status', 'approved')
                        ->exists()
                        || $this->managedApprovedArtistIds($user)->isNotEmpty();
                    if (! $canPickForeignVenue) {
                        $fail('Etkinlik yalnızca kendi onaylı mekânınızda oluşturulabilir.');
                    }
                },
            ],
            'artist_ids' => 'nullable|array',
            'artist_ids.*' => ['integer', Artist::ruleExistsInPublicCatalog()],
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_rules' => 'nullable|string|max:5000',
            'entry_is_paid' => 'boolean',
            'event_type' => EventListingTypes::nullableSlugRule(),
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
            'ticket_acquisition_mode' => Event::TICKET_ACQUISITION_MODE_RULE,
            'ticket_outlets' => 'nullable|array|max:15',
            'ticket_outlets.*.label' => 'nullable|string|max:120',
            'ticket_outlets.*.url' => 'nullable|string|max:2048',
            'ticket_purchase_note' => 'nullable|string|max:5000',
            'sahnebul_reservation_enabled' => 'boolean',
            'paytr_checkout_enabled' => 'boolean',
        ]);

        $ticketTiers = $validated['ticket_tiers'] ?? [];
        unset($validated['ticket_tiers']);
        [$validated, $ticketTiers] = Event::applyEntryPaidToValidated($validated, $ticketTiers);

        $validated['is_full'] = $request->boolean('is_full');
        $validated['event_type'] = isset($validated['event_type']) && $validated['event_type'] !== ''
            ? (string) $validated['event_type']
            : null;
        $validated['slug'] = Str::slug($validated['title']).'-'.Str::random(4);
        $validated['status'] = 'draft';
        $validated['ticket_purchase_note'] = isset($validated['ticket_purchase_note']) && trim((string) $validated['ticket_purchase_note']) !== ''
            ? trim((string) $validated['ticket_purchase_note'])
            : null;
        $validated = Event::applyTicketAcquisitionToValidatedArray($validated);

        $artistIds = $validated['artist_ids'];
        unset($validated['artist_ids']);

        $linkedArtistId = Artist::query()
            ->where('user_id', $request->user()->id)
            ->where('status', 'approved')
            ->value('id');

        $managedApprovedIds = $this->managedApprovedArtistIds($request->user())->all();

        $hasOwnApprovedVenue = $request->user()->venues()->where('status', 'approved')->exists();

        if ($linkedArtistId !== null && ! $hasOwnApprovedVenue) {
            $artistIds = [(int) $linkedArtistId];
        } elseif ($linkedArtistId !== null && $hasOwnApprovedVenue) {
            $ids = is_array($artistIds) ? array_map('intval', $artistIds) : [];
            $ids = array_values(array_unique(array_filter($ids, fn (int $id) => $id > 0)));
            $ids = array_values(array_diff($ids, [(int) $linkedArtistId]));
            array_unshift($ids, (int) $linkedArtistId);
            $artistIds = $ids;
        } elseif ($linkedArtistId === null && $managedApprovedIds !== []) {
            $ids = is_array($artistIds) ? array_map('intval', $artistIds) : [];
            $ids = array_values(array_unique(array_filter($ids, fn (int $id) => $id > 0)));
            $ids = array_values(array_intersect($ids, $managedApprovedIds));
            if ($ids === []) {
                $ids = [(int) $managedApprovedIds[0]];
            }
            $artistIds = $ids;
        } else {
            $artistIds = is_array($artistIds) ? array_map('intval', $artistIds) : [];
            $artistIds = array_values(array_unique(array_filter($artistIds, fn (int $id) => $id > 0)));
        }

        $creatorId = (int) $request->user()->id;
        $event = DB::transaction(function () use ($validated, $ticketTiers, $artistIds, $creatorId): Event {
            $event = Event::create([...$validated, 'created_by_user_id' => $creatorId]);
            $event->syncTicketTiers($ticketTiers);
            $event->syncArtistsByIds($artistIds);

            return $event;
        });

        return redirect()->route('artist.events.index')->with('success', 'Etkinlik oluşturuldu.');
    }

    public function edit(Request $request, Event $event)
    {
        if ((int) $event->venue->user_id !== (int) $request->user()->id) {
            abort(403, 'Bu etkinliği yalnızca mekân sahibi düzenleyebilir.');
        }
        $event->load([
            'venue',
            'ticketTiers',
            'artists' => fn ($q) => $q
                ->select('artists.id', 'artists.name', 'artists.slug', 'artists.avatar')
                ->orderByPivot('is_headliner', 'desc')
                ->orderByPivot('order')
                ->with(['media' => fn ($m) => $m->orderBy('order')->limit(1)]),
        ]);
        Artist::hydrateDisplayImages($event->artists);

        $venues = $request->user()->venues()
            ->where(function ($q) use ($event) {
                $q->where('status', 'approved')
                    ->orWhere('id', $event->venue_id);
            })
            ->orderBy('name')
            ->get();
        $artists = Artist::approved()->notIntlImport()->orderBy('name')->get(['id', 'name', 'avatar']);

        $venueReviews = Review::query()
            ->where('venue_id', $event->venue_id)
            ->where('is_approved', true)
            ->with('user:id,name,avatar')
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (Review $r) => [
                'id' => $r->id,
                'rating' => $r->rating,
                'comment' => $r->comment,
                'created_at' => $r->created_at?->toIso8601String(),
                'user' => [
                    'id' => $r->user->id,
                    'name' => $r->user->name,
                    'avatar' => $r->user->avatar,
                ],
            ])
            ->values()
            ->all();

        $eventReviews = EventReview::query()
            ->where('event_id', $event->id)
            ->where('is_approved', true)
            ->with('user:id,name,avatar')
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (EventReview $r) => [
                'id' => $r->id,
                'rating' => $r->rating,
                'comment' => $r->comment,
                'created_at' => $r->created_at?->toIso8601String(),
                'user' => [
                    'id' => $r->user->id,
                    'name' => $r->user->name,
                    'avatar' => $r->user->avatar,
                ],
            ])
            ->values()
            ->all();

        $eventPayload = $event->toArray();
        $eventPayload['start_date'] = AdminDatetimeLocal::format($event->start_date);
        $eventPayload['end_date'] = AdminDatetimeLocal::format($event->end_date);

        return Inertia::render('Artist/Events/Edit', [
            'event' => $eventPayload,
            'venues' => $venues,
            'artists' => $artists,
            'venueReviews' => $venueReviews,
            'eventReviews' => $eventReviews,
            'eventTypeOptions' => EventListingTypes::options(),
            'mayEditArtistProfilePromo' => $this->userMayEditArtistProfilePromo($request->user(), $event),
        ]);
    }

    public function update(Request $request, Event $event)
    {
        if ((int) $event->venue->user_id !== (int) $request->user()->id) {
            abort(403, 'Bu etkinliği yalnızca mekân sahibi düzenleyebilir.');
        }

        $request->merge([
            'ticket_tiers' => Event::filterTicketTierRowsFromRequestInput($request->input('ticket_tiers')),
            'artist_ids' => $request->input('artist_ids') ?? [],
            'start_date' => $request->input('start_date') ?: null,
            'end_date' => $request->input('end_date') ?: null,
            'entry_is_paid' => $request->boolean('entry_is_paid', true),
            'event_type' => $request->input('event_type') ?: null,
            'promo_show_on_venue_profile_posts' => $request->boolean('promo_show_on_venue_profile_posts'),
            'promo_show_on_venue_profile_videos' => $request->boolean('promo_show_on_venue_profile_videos'),
            'sahnebul_reservation_enabled' => $request->boolean('sahnebul_reservation_enabled', true),
            'paytr_checkout_enabled' => $request->boolean('paytr_checkout_enabled', true),
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
            'entry_is_paid' => 'boolean',
            'event_type' => EventListingTypes::nullableSlugRule(),
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
            'ticket_acquisition_mode' => Event::TICKET_ACQUISITION_MODE_RULE,
            'ticket_outlets' => 'nullable|array|max:15',
            'ticket_outlets.*.label' => 'nullable|string|max:120',
            'ticket_outlets.*.url' => 'nullable|string|max:2048',
            'ticket_purchase_note' => 'nullable|string|max:5000',
            'promo_show_on_venue_profile_posts' => 'boolean',
            'promo_show_on_venue_profile_videos' => 'boolean',
            'sahnebul_reservation_enabled' => 'boolean',
            'paytr_checkout_enabled' => 'boolean',
        ]);

        $ticketTiers = $validated['ticket_tiers'] ?? [];
        unset($validated['ticket_tiers']);
        [$validated, $ticketTiers] = Event::applyEntryPaidToValidated($validated, $ticketTiers);

        $validated['is_full'] = $request->boolean('is_full');
        $validated['event_type'] = isset($validated['event_type']) && $validated['event_type'] !== ''
            ? (string) $validated['event_type']
            : null;
        $validated['ticket_purchase_note'] = isset($validated['ticket_purchase_note']) && trim((string) $validated['ticket_purchase_note']) !== ''
            ? trim((string) $validated['ticket_purchase_note'])
            : null;
        $validated = Event::applyTicketAcquisitionToValidatedArray($validated);

        $artistIds = $validated['artist_ids'];
        unset($validated['artist_ids']);

        $venuePromoTouched = false;
        if (Schema::hasColumn('events', 'promo_show_on_venue_profile_posts')) {
            $nextPosts = (bool) ($validated['promo_show_on_venue_profile_posts'] ?? false);
            $nextVideos = (bool) ($validated['promo_show_on_venue_profile_videos'] ?? false);
            $venuePromoTouched = ((bool) ($event->promo_show_on_venue_profile_posts ?? false)) !== $nextPosts
                || ((bool) ($event->promo_show_on_venue_profile_videos ?? false)) !== $nextVideos;
        } else {
            unset($validated['promo_show_on_venue_profile_posts'], $validated['promo_show_on_venue_profile_videos']);
        }

        DB::transaction(function () use ($event, $validated, $ticketTiers, $artistIds): void {
            $event->update($validated);
            $event->syncTicketTiers($ticketTiers);
            $event->syncArtistsByIds($artistIds);
        });

        if ($venuePromoTouched) {
            EventPromoVenueProfileModeration::syncVenueTogglesNonAdmin($event->fresh());
        }

        return back()->with('success', 'Etkinlik güncellendi.');
    }

    public function importEventPromoMediaFromUrl(Request $request, Event $event, EventMediaImportFromUrlService $importer)
    {
        $this->assertUserOwnsEventVenue($request->user(), $event);

        return $this->promoImportMediaFromUrlResponse($request, $event, $importer, false);
    }

    public function appendEventPromoFiles(Request $request, Event $event, EventMediaImportFromUrlService $importer)
    {
        $this->assertUserOwnsEventVenue($request->user(), $event);

        return $this->promoAppendFilesResponse($request, $event, $importer);
    }

    public function clearEventPromoMedia(Event $event, EventMediaImportFromUrlService $importer)
    {
        $this->assertUserOwnsEventVenue(auth()->user(), $event);

        return $this->promoClearResponse($event, $importer);
    }

    public function removeEventPromoGalleryItem(Request $request, Event $event, EventMediaImportFromUrlService $importer)
    {
        $this->assertUserOwnsEventVenue($request->user(), $event);

        return $this->promoRemoveItemResponse($request, $event, $importer);
    }

    public function editArtistProfilePromo(Request $request, Event $event)
    {
        $user = $request->user();
        if ($user === null || ! $this->userMayEditArtistProfilePromo($user, $event)) {
            abort(403);
        }

        return Inertia::render('Artist/Events/ArtistProfilePromo', [
            'event' => [
                'id' => $event->id,
                'title' => $event->title,
                'slug_segment' => $event->publicUrlSegment(),
                'promo_show_on_artist_profile_posts' => (bool) ($event->promo_show_on_artist_profile_posts ?? false),
                'promo_show_on_artist_profile_videos' => (bool) ($event->promo_show_on_artist_profile_videos ?? false),
                'promo_artist_profile_moderation' => Schema::hasColumn('events', 'promo_artist_profile_moderation')
                    ? ($event->promo_artist_profile_moderation ?? null)
                    : null,
            ],
        ]);
    }

    public function updateArtistProfilePromo(Request $request, Event $event)
    {
        $user = $request->user();
        if ($user === null || ! $this->userMayEditArtistProfilePromo($user, $event)) {
            abort(403);
        }
        if (! Schema::hasColumn('events', 'promo_show_on_artist_profile_posts')) {
            return back()->with('error', 'Bu özellik henüz etkin.');
        }

        $request->merge([
            'promo_show_on_artist_profile_posts' => $request->boolean('promo_show_on_artist_profile_posts'),
            'promo_show_on_artist_profile_videos' => $request->boolean('promo_show_on_artist_profile_videos'),
        ]);
        $validated = $request->validate([
            'promo_show_on_artist_profile_posts' => 'boolean',
            'promo_show_on_artist_profile_videos' => 'boolean',
        ]);

        $nextPosts = (bool) ($validated['promo_show_on_artist_profile_posts'] ?? false);
        $nextVideos = (bool) ($validated['promo_show_on_artist_profile_videos'] ?? false);
        $dirty = ((bool) ($event->promo_show_on_artist_profile_posts ?? false)) !== $nextPosts
            || ((bool) ($event->promo_show_on_artist_profile_videos ?? false)) !== $nextVideos;

        $event->forceFill([
            'promo_show_on_artist_profile_posts' => $nextPosts,
            'promo_show_on_artist_profile_videos' => $nextVideos,
        ])->save();

        if ($dirty) {
            EventPromoVenueProfileModeration::syncArtistTogglesNonAdmin($event->fresh());
        }

        return back()->with('success', 'Sanatçı profili tanıtım tercihleri kaydedildi.');
    }

    private function assertUserOwnsEventVenue(?User $user, Event $event): void
    {
        $event->loadMissing('venue');
        if ($user === null || (int) $event->venue->user_id !== (int) $user->id) {
            abort(403);
        }
    }

    private function userMayEditArtistProfilePromo(User $user, Event $event): bool
    {
        if (! Schema::hasColumn('events', 'promo_show_on_artist_profile_posts')) {
            return false;
        }
        if ($event->status !== 'published') {
            return false;
        }
        $onIds = $event->artists()->pluck('artists.id')->map(fn ($id) => (int) $id)->all();
        if ($onIds === []) {
            return false;
        }

        $linkedIds = Artist::query()
            ->where('user_id', $user->id)
            ->where('status', 'approved')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
        if (count(array_intersect($linkedIds, $onIds)) > 0) {
            return true;
        }

        $managed = $this->managedApprovedArtistIds($user)->map(fn ($id) => (int) $id)->all();

        return count(array_intersect($managed, $onIds)) > 0;
    }

    /** @return Collection<int, int> */
    private function managedApprovedArtistIds(User $user): Collection
    {
        if (! $user->isManagementAccount()) {
            return collect();
        }

        return Artist::query()
            ->where('managed_by_user_id', $user->id)
            ->where('status', 'approved')
            ->pluck('id');
    }
}
