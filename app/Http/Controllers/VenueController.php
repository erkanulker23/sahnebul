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
            ->with(['category', 'city', 'media'])
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

        $venues = $query->latest()->paginate(12)->withQueryString();
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
                'venue:id,name,slug,category_id',
                'venue.category:id,name',
                'artists:id,name,slug',
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
                'venue:id,name,slug,category_id',
                'venue.category:id,name',
                'artists:id,name,slug',
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
            || $user->hasActiveMembership('venue')
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

        return Inertia::render('Venues/Show', [
            'venue' => $venue,
            'claimStatus' => auth()->check()
                ? VenueClaimRequest::where('venue_id', $venue->id)->where('user_id', auth()->id())->value('status')
                : null,
        ]);
    }
}
