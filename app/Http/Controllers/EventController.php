<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\Category;
use App\Models\Event;
use App\Services\TurkeyProvincesSync;
use App\Support\EventListingQuery;
use App\Support\EventListingTypes;
use App\Support\InertiaDocumentMeta;
use App\Support\UpcomingSevenDayEventWindow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $query = EventListingQuery::base()->with([
            'venue:id,name,slug,address,cover_image,category_id,city_id,district_id',
            'venue.category:id,name,slug',
            'venue.city:id,name',
            'venue.district:id,name',
            'artists:id,name,slug,avatar,genre',
        ]);

        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.$request->string('search').'%');
        }
        if ($request->filled('category')) {
            $query->whereHas('venue.category', fn ($q) => $q->where('slug', $request->string('category')));
        }

        if ($request->filled('period')) {
            // $request->string() returns Stringable; strict === against 'tomorrow' etc. never matches.
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

        if ($request->filled('event_type')) {
            $type = (string) $request->string('event_type');
            if (in_array($type, EventListingTypes::slugs(), true)) {
                $query->where('events.event_type', $type);
            }
        }

        if ($request->filled('genre')) {
            $genre = trim((string) $request->string('genre'));
            $query->whereHas('artists', fn ($q) => $q->whereGenreLabelMatches($genre));
        }

        if ($request->filled('city_id')) {
            $cityId = (int) $request->input('city_id');
            $query->whereHas('venue', fn ($q) => $q->where('city_id', $cityId));
        }

        if ($request->filled('district_id')) {
            $districtId = (int) $request->input('district_id');
            $query->whereHas('venue', fn ($q) => $q->where('district_id', $districtId));
        }

        EventListingQuery::applyDefaultOrder($query);

        /** Üst şerit: liste ile aynı filtrelerdeki gerçek etkinlikler (tıklanınca detaya gider) */
        $tickerEvents = (clone $query)->limit(24)->get(['id', 'slug', 'title', 'start_date']);

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
                'label' => $e->title.' · '.$e->start_date->translatedFormat('d MMMM Y'),
            ])
            ->values()
            ->all();

        $provinces = app(TurkeyProvincesSync::class)->forSelect();

        $appUrl = rtrim((string) config('app.url'), '/');

        return Inertia::render('Events/Index', [
            'events' => $events,
            'listingStructuredData' => InertiaDocumentMeta::structuredDataForEventsIndexPage(
                ['events' => $events->toArray()],
                $appUrl,
            ),
            'categories' => $categories,
            'eventTypes' => EventListingTypes::options(),
            'genres' => $genres,
            'provinces' => $provinces,
            'tickerItems' => $tickerItems,
            'tickerFallback' => 'Yakında yayınlanacak etkinlikler için bizi takip edin.',
            'filters' => $request->only(['search', 'category', 'period', 'genre', 'event_type', 'city_id', 'district_id']),
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
}
