<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\Venue;
use App\Models\VenueClaimRequest;
use App\Services\AppSettingsService;
use App\Support\DailyUniqueEntityView;
use App\Support\VenuePageSeo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class VenueController extends Controller
{
    public function __construct(
        private readonly AppSettingsService $appSettings,
    ) {}

    public function index(Request $request)
    {
        $query = Venue::query()
            ->with(['category', 'city', 'district', 'media'])
            ->withCount([
                'events as weekly_events_count' => fn ($q) => $q
                    ->published()
                    ->whereBetween('start_date', [now()->startOfWeek(), now()->endOfWeek()]),
                'events as monthly_events_count' => fn ($q) => $q
                    ->published()
                    ->where('start_date', '>=', now()->startOfDay())
                    ->where('start_date', '<=', now()->endOfMonth()),
            ])
            ->approved();

        if ($request->filled('city')) {
            $query->whereHas('city', fn ($q) => $q->where('slug', $request->city));
        }

        if ($request->filled('category')) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $request->category));
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->search.'%');
        }

        $venues = $query
            ->orderByDesc('is_featured')
            ->latest()
            ->paginate(12)
            ->withQueryString();
        $popularArtistsQuery = Artist::query()
            ->approved()
            ->withCount([
                'events as published_events_count' => fn ($q) => $q->published(),
            ]);

        if (Schema::hasColumn('artists', 'view_count')) {
            $popularArtistsQuery->orderByDesc('view_count');
        }

        $popularArtists = $popularArtistsQuery
            ->orderByDesc('published_events_count')
            ->orderByDesc('id')
            ->limit(10)
            ->get();
        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();

        $todayEvents = Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->approved())
            ->whereBetween('start_date', [$todayStart, $todayEnd])
            ->with([
                'venue:id,name,slug,category_id,city_id,district_id',
                'venue.category:id,name',
                'venue.city:id,name',
                'venue.district:id,name',
                'artists:id,name,slug,avatar',
            ])
            ->orderBy('start_date')
            ->limit(16)
            ->get();

        $upcomingWeekEvents = Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->approved())
            ->where('start_date', '>', $todayEnd)
            ->where('start_date', '<=', now()->copy()->addDays(7)->endOfDay())
            ->with([
                'venue:id,name,slug,category_id,city_id,district_id',
                'venue.category:id,name',
                'venue.city:id,name',
                'venue.district:id,name',
                'artists:id,name,slug,avatar',
            ])
            ->orderBy('start_date')
            ->limit(24)
            ->get();

        $cities = City::query()->turkiyeProvinces()->get();
        $categories = Category::orderBy('order')->get();

        $user = auth()->user();
        $pendingVenue = $user && is_string($user->pending_venue_name) && trim($user->pending_venue_name) !== '';
        $canAddVenue = $user && (
            $user->isArtist()
            || $user->isVenueOwner()
            || $user->isManagerOrganization()
            || $user->hasActiveMembership('venue')
            || $user->hasActiveMembership('manager')
            || $pendingVenue
            || $user->venues()->exists()
        );

        $homeHeroImageUrl = null;
        if (! $request->is('mekanlar')) {
            $site = $this->appSettings->getSitePublicSettings();
            $heroPath = isset($site['home_hero_image_path']) && is_string($site['home_hero_image_path'])
                ? trim($site['home_hero_image_path'])
                : '';
            $homeHeroImageUrl = $heroPath !== '' ? $this->appSettings->publicStorageUrl($heroPath) : null;
        }

        return Inertia::render('Venues/Index', [
            'isVenuesPage' => $request->is('mekanlar'),
            'homeHeroImageUrl' => $homeHeroImageUrl,
            'canAddVenue' => (bool) $canAddVenue,
            'venues' => $venues,
            'popularArtists' => $popularArtists,
            'todayEvents' => $todayEvents,
            'upcomingWeekEvents' => $upcomingWeekEvents,
            'cities' => $cities,
            'categories' => $categories,
            'filters' => $request->only(['city', 'category', 'search']),
        ]);
    }

    public function show(Request $request, Venue $venue)
    {
        if ($venue->status !== 'approved') {
            abort(404);
        }

        if (Schema::hasColumn('venues', 'view_count')) {
            DailyUniqueEntityView::recordOncePerVisitorPerDay(
                $request,
                'venue',
                (int) $venue->id,
                fn () => $venue->increment('view_count')
            );
            $venue->refresh();
        }

        $venue->load([
            'category', 'city', 'media',
            'events' => fn ($q) => $q->published()
                ->where('start_date', '>=', now()->subMonths(24))
                ->with(['artists:id,name,slug,avatar'])
                ->orderBy('start_date')
                ->limit(120),
            'reviews' => fn ($q) => $q->where('is_approved', true)->with(['user', 'media', 'likes', 'replies'])->latest()->limit(20),
        ]);
        $venue->reviews_count = $venue->reviews()->where('is_approved', true)->count();

        if (auth()->check()) {
            $venue->reviews->each(function ($review) {
                $review->is_liked = $review->likes->contains('user_id', auth()->id());
                $review->likes_count = $review->likes->count();
            });
        }

        $appUrl = rtrim((string) config('app.url'), '/');

        return Inertia::render('Venues/Show', [
            'venue' => $venue,
            'venuePageSeo' => VenuePageSeo::forLoadedVenue($venue, $appUrl),
            'claimStatus' => auth()->check()
                ? VenueClaimRequest::where('venue_id', $venue->id)->where('user_id', auth()->id())->value('status')
                : null,
        ]);
    }

    /**
     * Onaylı mekânlar; şehir seç / etkinlik listesiyle uyumlu: koordinatlılar mesafeye göre önce,
     * lat/lng eksik olanlar aynı planda sonda (distance_km yüksek sentinel).
     */
    public function nearby(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:40'],
        ]);

        $lat = (float) $validated['lat'];
        $lng = (float) $validated['lng'];
        $limit = (int) ($validated['limit'] ?? 16);

        $distanceSql = '(CASE WHEN venues.latitude IS NOT NULL AND venues.longitude IS NOT NULL '
            .'THEN (6371 * acos(LEAST(1, GREATEST(-1, cos(radians(?)) * cos(radians(venues.latitude)) '
            .'* cos(radians(venues.longitude) - radians(?)) + sin(radians(?)) * sin(radians(venues.latitude)))))) '
            .'ELSE 999999 END)';

        $venues = Venue::query()
            ->approved()
            ->select('venues.*')
            ->selectRaw($distanceSql.' as distance_km', [$lat, $lng, $lat])
            ->with([
                'category:id,name',
                'city:id,name',
                'district:id,name',
            ])
            ->orderBy('distance_km')
            ->orderBy('venues.name')
            ->limit($limit)
            ->get();

        return response()->json([
            'venues' => $venues,
        ]);
    }
}
