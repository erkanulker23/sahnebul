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
use App\Support\EventPromoVenueProfileModeration;
use App\Support\HomeHeroSlideDefaults;
use App\Support\HomeHeroSlides;
use App\Support\UpcomingSevenDayEventWindow;
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
                'events as weekly_events_count' => fn ($q) => UpcomingSevenDayEventWindow::applyToEloquent(
                    $q->published()
                ),
                'events as monthly_events_count' => fn ($q) => $q
                    ->published()
                    ->where('start_date', '>=', now()->startOfDay())
                    ->where('start_date', '<=', now()->endOfMonth()),
            ])
            ->listedPublicly();

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
            ->whereHas('venue', fn ($q) => $q->listedPublicly())
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
            ->whereHas('venue', fn ($q) => $q->listedPublicly())
            ->where('start_date', '>', $todayEnd)
            ->where('start_date', '<=', UpcomingSevenDayEventWindow::upperBound())
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

        $site = $this->appSettings->getSitePublicSettings();
        $heroImageUrls = [];
        foreach (HomeHeroSlides::pathsFromSite($site) as $path) {
            $u = $this->appSettings->publicStorageUrl($path);
            if (is_string($u) && $u !== '') {
                $heroImageUrls[] = $u;
            }
        }

        $rawHomeCopy = is_array($site['home_hero_slide_copy'] ?? null) ? $site['home_hero_slide_copy'] : null;
        $rawVenuesCopy = is_array($site['venues_hero_slide_copy'] ?? null) ? $site['venues_hero_slide_copy'] : null;

        return Inertia::render('Venues/Index', [
            'isVenuesPage' => $request->is('mekanlar'),
            'heroImageUrls' => $heroImageUrls,
            'homeHeroSlideContents' => HomeHeroSlideDefaults::resolveBlocks($rawHomeCopy, HomeHeroSlideDefaults::homeDefaults()),
            'venuesHeroSlideContents' => HomeHeroSlideDefaults::resolveBlocks($rawVenuesCopy, HomeHeroSlideDefaults::venuesDefaults()),
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
        if ($venue->status !== 'approved' || ! $venue->is_active) {
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

        $venueEventPromoSections = [];
        if (Schema::hasColumn('events', 'promo_show_on_venue_profile_posts')) {
            $promoQuery = Event::query()
                ->where('venue_id', $venue->id)
                ->published()
                ->where(function ($q): void {
                    $q->where('promo_show_on_venue_profile_posts', true)
                        ->orWhere('promo_show_on_venue_profile_videos', true);
                });
            if (Schema::hasColumn('events', 'promo_venue_profile_moderation')) {
                $promoQuery->where('promo_venue_profile_moderation', EventPromoVenueProfileModeration::APPROVED);
            }
            foreach ($promoQuery
                ->with(['artists:id,name,slug,avatar'])
                ->orderBy('start_date')
                ->limit(80)
                ->get() as $ev) {
                if (! $ev instanceof Event || ! $ev->isPromoEligibleForVenueProfilePage()) {
                    continue;
                }
                $items = $ev->promoItemsForVenueProfilePage();
                if ($items === []) {
                    continue;
                }
                $venueEventPromoSections[] = [
                    'event_id' => $ev->id,
                    'title' => $ev->title,
                    'slug_segment' => $ev->publicUrlSegment(),
                    'items' => $items,
                ];
            }
        }

        return Inertia::render('Venues/Show', [
            'venue' => $venue,
            'venuePageSeo' => VenuePageSeo::forLoadedVenue($venue, $appUrl),
            'venueEventPromoSections' => $venueEventPromoSections,
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
            ->listedPublicly()
            ->select('venues.*')
            ->selectRaw($distanceSql.' as distance_km', [$lat, $lng, $lat])
            ->with([
                'category:id,name',
                'city:id,name',
                'district:id,name',
            ])
            ->orderByDesc('venues.is_featured')
            ->orderBy('distance_km')
            ->orderBy('venues.name')
            ->limit($limit)
            ->get();

        return response()->json([
            'venues' => $venues,
        ]);
    }
}
