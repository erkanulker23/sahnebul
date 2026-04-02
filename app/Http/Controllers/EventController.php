<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Services\TurkeyProvincesSync;
use App\Support\CaseInsensitiveSearch;
use App\Support\EventListingQuery;
use App\Support\EventListingTypes;
use App\Support\InertiaDocumentMeta;
use App\Support\RequestGeoQuery;
use App\Support\UpcomingSevenDayEventWindow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        if ($this->shouldRedirectBareEventTypeQueryToPath($request)) {
            $slug = (string) $request->query('event_type');
            $url = route('events.index.by-type', ['eventTypeSlug' => $slug]);
            $pageQ = $request->query('page');
            if ($pageQ !== null && $pageQ !== '' && $pageQ !== '1') {
                $url .= (str_contains($url, '?') ? '&' : '?').'page='.urlencode((string) $pageQ);
            }

            return redirect($url, 301);
        }

        return $this->eventsIndexResponse($request, null, null);
    }

    public function indexByEventType(Request $request, string $eventTypeSlug): Response
    {
        if (! in_array($eventTypeSlug, EventListingTypes::slugs(), true)) {
            abort(404);
        }

        return $this->eventsIndexResponse($request, null, $eventTypeSlug);
    }

    public function indexByCityAndType(Request $request, string $citySlug, string $eventTypeSlug): Response
    {
        if (! in_array($eventTypeSlug, EventListingTypes::slugs(), true)) {
            abort(404);
        }

        $city = City::query()->turkiyeProvinces()->where('slug', $citySlug)->first();
        if ($city === null) {
            abort(404);
        }

        return $this->eventsIndexResponse($request, $city, $eventTypeSlug);
    }

    private function eventsIndexResponse(Request $request, ?City $hubCity, ?string $hubEventTypeSlug): Response
    {
        $effectiveCityId = $request->filled('city_id') ? (int) $request->input('city_id') : null;
        $effectiveEventType = $request->filled('event_type') ? (string) $request->string('event_type') : null;

        if ($hubCity !== null) {
            $effectiveCityId = $hubCity->id;
        }
        if ($hubEventTypeSlug !== null) {
            $effectiveEventType = $hubEventTypeSlug;
        }

        if ($effectiveEventType !== null && ! in_array($effectiveEventType, EventListingTypes::slugs(), true)) {
            $effectiveEventType = null;
        }

        $query = EventListingQuery::base()->with([
            'venue:id,name,slug,address,cover_image,category_id,city_id,district_id',
            'venue.category:id,name,slug',
            'venue.city:id,name',
            'venue.district:id,name',
            'artists:id,name,slug,avatar,genre',
        ]);

        if ($request->filled('search')) {
            CaseInsensitiveSearch::whereColumnLikeInsensitive($query, 'title', (string) $request->string('search'));
        }
        if ($request->filled('category')) {
            $query->whereHas('venue.category', fn ($q) => $q->where('slug', $request->string('category')));
        }

        if ($request->filled('period')) {
            $period = (string) $request->string('period');
            if ($period === 'today') {
                $todayStart = now()->startOfDay();
                $todayEnd = now()->endOfDay();
                $query->where(function ($q) use ($todayStart, $todayEnd) {
                    $q->where(function ($q1) use ($todayStart, $todayEnd) {
                        $q1->where('events.start_date', '<=', $todayEnd)
                            ->whereNotNull('events.end_date')
                            ->where('events.end_date', '>=', $todayStart);
                    })->orWhere(function ($q2) use ($todayStart, $todayEnd) {
                        $q2->whereNull('events.end_date')
                            ->whereBetween('events.start_date', [$todayStart, $todayEnd]);
                    });
                });
            } elseif ($period === 'tomorrow') {
                $query->whereDate('start_date', today()->addDay());
            } elseif ($period === 'week') {
                UpcomingSevenDayEventWindow::applyToEloquent($query);
            }
        }

        if ($effectiveEventType !== null) {
            $query->where('events.event_type', $effectiveEventType);
        }

        if ($request->filled('genre')) {
            $genre = trim((string) $request->string('genre'));
            $query->whereHas('artists', fn ($q) => $q->whereGenreLabelMatches($genre));
        }

        if ($effectiveCityId !== null) {
            $query->whereHas('venue', fn ($q) => $q->where('city_id', $effectiveCityId));
        }

        if ($request->filled('district_id')) {
            $districtId = (int) $request->input('district_id');
            $query->whereHas('venue', fn ($q) => $q->where('district_id', $districtId));
        }

        $near = RequestGeoQuery::optionalNearLatLng($request);
        $useNearOrder = $near !== null;

        if ($useNearOrder) {
            EventListingQuery::applyDateThenProximityOrder($query, $near['lat'], $near['lng']);
        } else {
            EventListingQuery::applyDefaultOrder($query);
        }

        /** Üst şerit: liste ile aynı filtrelerdeki gerçek etkinlikler (tıklanınca detaya gider) */
        $tickerEvents = (clone $query)->limit(24)->get();

        $events = $query->paginate(20)->withQueryString();

        $categories = Category::query()->orderBy('order')->get(['id', 'name', 'slug']);

        $genreRows = Artist::query()
            ->approved()
            ->notIntlImport()
            ->whereNotNull('genre')
            ->where('genre', '!=', '')
            ->distinct()
            ->orderBy('genre')
            ->pluck('genre');

        $genres = Artist::normalizeDistinctCatalogGenreLabels($genreRows);

        $tickerItems = $tickerEvents
            ->map(fn (Event $e) => [
                'id' => $e->id,
                'slug' => $e->slug,
                'label' => $e->title.' · '.$e->start_date->locale(app()->getLocale())->translatedFormat('j F Y'),
            ])
            ->values()
            ->all();

        $provinces = app(TurkeyProvincesSync::class)->forSelect();

        $appUrl = rtrim((string) config('app.url'), '/');

        $listingSeo = null;
        $listingItemListName = 'Etkinlikler';
        if ($hubCity !== null && $hubEventTypeSlug !== null) {
            $typeLabel = EventListingTypes::labelFor($hubEventTypeSlug) ?? $hubEventTypeSlug;
            $listingSeo = [
                'kind' => 'city_type',
                'cityId' => $hubCity->id,
                'citySlug' => $hubCity->slug,
                'cityName' => $hubCity->name,
                'eventTypeSlug' => $hubEventTypeSlug,
                'eventTypeLabel' => $typeLabel,
            ];
            $listingItemListName = $hubCity->name.' '.$typeLabel.' etkinlikleri';
        } elseif ($hubCity === null && $hubEventTypeSlug !== null) {
            $typeLabel = EventListingTypes::labelFor($hubEventTypeSlug) ?? $hubEventTypeSlug;
            $listingSeo = [
                'kind' => 'type',
                'eventTypeSlug' => $hubEventTypeSlug,
                'eventTypeLabel' => $typeLabel,
            ];
            $listingItemListName = $typeLabel.' etkinlikleri';
        }

        $filters = array_merge(
            $request->only(['search', 'category', 'period', 'genre', 'district_id']),
            [
                'event_type' => $effectiveEventType ?? '',
                'city_id' => $effectiveCityId !== null ? (string) $effectiveCityId : '',
            ],
            $useNearOrder
                ? ['near_lat' => (string) $near['lat'], 'near_lng' => (string) $near['lng']]
                : []
        );

        return Inertia::render('Events/Index', [
            /** Hub URL (/etkinlik/{tür}, /etkinlik/{il}/{tür}) — hero banner için doğrudan rota kaynağı */
            'eventTypeHubSlug' => $hubEventTypeSlug,
            'events' => $events,
            'listingStructuredData' => InertiaDocumentMeta::structuredDataForEventsIndexPage(
                [
                    'events' => $events->toArray(),
                    'listingItemListName' => $listingItemListName,
                    'listingSeo' => $listingSeo,
                ],
                $appUrl,
            ),
            'categories' => $categories,
            'eventTypes' => EventListingTypes::options(),
            'genres' => $genres,
            'provinces' => $provinces,
            'tickerItems' => $tickerItems,
            'tickerFallback' => 'Yakında yayınlanacak etkinlikler için bizi takip edin.',
            'filters' => $filters,
            'listingSeo' => $listingSeo,
        ]);
    }

    public function nearby(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'limit' => 'nullable|integer|min:1|max:30',
        ]);

        $lat = (float) $validated['lat'];
        $lng = (float) $validated['lng'];
        $limit = (int) ($validated['limit'] ?? 8);

        $distanceSql = '(6371 * acos(cos(radians(?)) * cos(radians(venues.latitude)) * cos(radians(venues.longitude) - radians(?)) + sin(radians(?)) * sin(radians(venues.latitude))))';

        $events = Event::query()
            ->published()
            ->whereStillVisibleOnPublicListing()
            ->whereHas('venue', fn ($q) => $q->listedPublicly()->whereNotNull('latitude')->whereNotNull('longitude'))
            ->join('venues', 'venues.id', '=', 'events.venue_id')
            ->select('events.*')
            ->selectRaw($distanceSql.' as distance_km', [$lat, $lng, $lat])
            ->with([
                'venue' => fn ($q) => $q
                    ->select('venues.id', 'venues.name', 'venues.slug', 'venues.city_id', 'venues.district_id', 'venues.category_id', 'venues.cover_image', 'venues.latitude', 'venues.longitude')
                    ->with(['city:id,name', 'district:id,name', 'category:id,name']),
                'artists' => fn ($q) => $q
                    ->select('artists.id', 'artists.name', 'artists.slug', 'artists.avatar')
                    ->orderByPivot('is_headliner', 'desc')
                    ->orderByPivot('order'),
            ])
            ->orderBy('distance_km')
            ->orderBy('start_date')
            ->limit($limit)
            ->get();

        return response()->json([
            'events' => $events,
        ]);
    }

    /**
     * Eski ?event_type=… adreslerini /etkinlik/{tür} kalıcı adresine taşır (yalnızca tür filtresi varken).
     */
    private function shouldRedirectBareEventTypeQueryToPath(Request $request): bool
    {
        if (! $request->filled('event_type')) {
            return false;
        }
        $slug = (string) $request->string('event_type');
        if (! in_array($slug, EventListingTypes::slugs(), true)) {
            return false;
        }

        $blocked = ['search', 'category', 'period', 'genre', 'city_id', 'district_id', 'near_lat', 'near_lng'];
        foreach ($blocked as $key) {
            if ($request->filled($key)) {
                return false;
            }
        }

        return true;
    }
}
