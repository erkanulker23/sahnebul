<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\ArtistClaimRequest;
use App\Models\ArtistMedia;
use App\Models\City;
use App\Services\ITunesSearchService;
use App\Services\SpotifyService;
use App\Services\TurkeyProvincesSync;
use App\Support\DailyUniqueEntityView;
use App\Support\InertiaDocumentMeta;
use App\Support\PublicStructuredData;
use App\Support\TurkishAlphabet;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class ArtistController extends Controller
{
    public function __construct(
        private readonly ITunesSearchService $itunesSearch,
        private readonly SpotifyService $spotify,
    ) {}

    public function index(Request $request)
    {
        $query = Artist::query()
            ->approved()
            ->notIntlImport()
            ->withExists([
                'user as is_verified_profile' => fn ($q) => $q->whereNotNull('email_verified_at'),
            ])
            ->withCount([
                'events as weekly_events_count' => fn ($q) => $q
                    ->published()
                    ->whereHas('venue', fn ($v) => $v->approved())
                    ->whereBetween('start_date', [now()->startOfWeek(), now()->endOfWeek()]),
                'events as monthly_events_count' => fn ($q) => $q
                    ->published()
                    ->whereHas('venue', fn ($v) => $v->approved())
                    ->where('start_date', '>=', now()->startOfDay())
                    ->where('start_date', '<=', now()->endOfMonth()),
            ]);

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->search.'%');
        }
        if ($request->filled('genre')) {
            $query->where('genre', $request->genre);
        }
        if ($request->filled('letter')) {
            $letter = mb_strtoupper((string) $request->letter, 'UTF-8');
            $query->whereRaw('upper(substr(name, 1, 1)) = ?', [$letter]);
        }

        $artists = $query->orderBy('name')
            ->select(['id', 'name', 'slug', 'avatar', 'genre', 'bio', 'created_at'])
            ->paginate(12)
            ->withQueryString();

        $weekStart = now()->startOfWeek();
        $weekEnd = now()->endOfWeek();
        $artistsThisWeek = $this->artistsWithShowsThisWeek($weekStart, $weekEnd);
        $genres = Artist::approved()
            ->notIntlImport()
            ->whereNotNull('genre')
            ->where('genre', '!=', '')
            ->distinct()
            ->pluck('genre')
            ->filter(fn ($g) => Artist::isUsableCatalogGenre($g))
            ->sort()
            ->values();
        $letters = Artist::approved()->notIntlImport()
            ->selectRaw('upper(substr(name, 1, 1)) as first_letter')
            ->pluck('first_letter')
            ->filter()
            ->unique()
            ->sort()
            ->values();

        $appUrl = rtrim((string) config('app.url'), '/');

        return Inertia::render('Artists/Index', [
            'artists' => $artists,
            'listingStructuredData' => InertiaDocumentMeta::structuredDataForArtistsIndexPage(
                ['artists' => $artists->toArray()],
                $appUrl,
            ),
            'artistsThisWeek' => $artistsThisWeek,
            'weekRange' => [
                'start' => $weekStart->toIso8601String(),
                'end' => $weekEnd->toIso8601String(),
            ],
            'genres' => $genres,
            'letters' => $letters,
            'alphabetLetters' => TurkishAlphabet::LETTERS,
            'filters' => $request->only(['search', 'genre', 'letter']),
        ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function artistsWithShowsThisWeek(CarbonInterface $weekStart, CarbonInterface $weekEnd): Collection
    {
        $rows = DB::table('event_artists')
            ->join('events', 'events.id', '=', 'event_artists.event_id')
            ->join('venues', 'venues.id', '=', 'events.venue_id')
            ->join('artists', 'artists.id', '=', 'event_artists.artist_id')
            ->where('events.status', 'published')
            ->where('venues.status', 'approved')
            ->where('artists.status', 'approved')
            ->where(function ($q) {
                $q->whereNull('artists.country_code')
                    ->orWhere('artists.country_code', '!=', 'INT');
            })
            ->whereBetween('events.start_date', [$weekStart, $weekEnd])
            ->select(
                'event_artists.artist_id',
                DB::raw('MIN(events.start_date) as first_show'),
                DB::raw('COUNT(events.id) as week_events_count')
            )
            ->groupBy('event_artists.artist_id')
            ->orderBy('first_show')
            ->limit(48)
            ->get();

        if ($rows->isEmpty()) {
            return collect();
        }

        $idsOrdered = $rows->pluck('artist_id')->map(fn ($id) => (int) $id)->all();
        $metaByArtistId = $rows->keyBy(fn ($r) => (int) $r->artist_id);

        $loaded = Artist::query()
            ->whereIn('id', $idsOrdered)
            ->select(['id', 'name', 'slug', 'avatar', 'genre'])
            ->withExists([
                'user as is_verified_profile' => fn ($q) => $q->whereNotNull('email_verified_at'),
            ])
            ->get()
            ->keyBy('id');

        return collect($idsOrdered)
            ->map(function (int $id) use ($loaded, $metaByArtistId) {
                $artist = $loaded->get($id);
                if (! $artist) {
                    return null;
                }
                $meta = $metaByArtistId->get($id);
                $first = $meta?->first_show;
                $weekCount = (int) ($meta?->week_events_count ?? 0);

                return [
                    'id' => $artist->id,
                    'name' => $artist->name,
                    'slug' => $artist->slug,
                    'avatar' => $artist->avatar,
                    'genre' => $artist->genre,
                    'is_verified_profile' => (bool) $artist->is_verified_profile,
                    'week_first_show' => $first ? (string) $first : null,
                    'week_events_count' => $weekCount,
                ];
            })
            ->filter()
            ->values();
    }

    public function show(Request $request, Artist $artist)
    {
        if ($artist->status !== 'approved') {
            abort(404);
        }

        if (Schema::hasColumn('artists', 'view_count')) {
            DailyUniqueEntityView::recordOncePerVisitorPerDay(
                $request,
                'artist',
                (int) $artist->id,
                fn () => $artist->increment('view_count')
            );
            $artist->refresh();
        }

        $artist->load([
            'media' => fn ($q) => $q->where('moderation_status', ArtistMedia::MODERATION_APPROVED),
        ]);

        if ($artist->spotify_auto_link_disabled) {
            $artist->setAttribute('spotify_id', null);
            $artist->setAttribute('spotify_url', null);
            $artist->setAttribute('spotify_genres', null);
            $artist->setAttribute('spotify_popularity', null);
            $artist->setAttribute('spotify_followers', null);
            $artist->setAttribute('spotify_albums', null);
            $sl = $artist->social_links;
            if (is_array($sl)) {
                unset($sl['spotify']);
                $artist->setAttribute('social_links', $sl !== [] ? $sl : null);
            }
        }

        // Tüm geçmişi belleğe almak yerine sorgu ile bölmek; yaklaşanlarda düşük limit (ör. 12)
        // ileri tarihli konserleri listeden düşürüyordu (aynı sanatçıda çok etkinlik varsa).
        $baseArtistEvents = fn () => $artist->events()
            ->published()
            ->whereHas('venue', fn ($v) => $v->approved());

        $upcomingEvents = $baseArtistEvents()
            ->where('start_date', '>', now())
            ->with(['venue.city', 'venue.district'])
            ->orderBy('start_date')
            ->limit(120)
            ->get();

        $pastEvents = $baseArtistEvents()
            ->where('start_date', '<', now())
            ->with(['venue.city', 'venue.district'])
            ->orderByDesc('start_date')
            ->limit(24)
            ->get();

        $statsQuery = $baseArtistEvents();
        $stats = [
            'total_events' => (clone $statsQuery)->count(),
            'upcoming_count' => (clone $statsQuery)->where('start_date', '>', now())->count(),
            'past_count' => (clone $statsQuery)->where('start_date', '<', now())->count(),
            'venue_count' => (clone $statsQuery)->distinct()->count('events.venue_id'),
        ];

        $latestTracks = [];
        $spotifyId = is_string($artist->spotify_id) ? trim($artist->spotify_id) : '';
        $hasSpotifyCreds = (bool) (config('services.spotify.client_id') && config('services.spotify.client_secret'));

        if ($spotifyId !== '' && $hasSpotifyCreds) {
            $cacheKey = 'artist_latest_tracks:spotify:'.$artist->id;
            $cached = Cache::get($cacheKey);
            if (is_array($cached) && count($cached) > 0) {
                $latestTracks = $cached;
            } elseif ($cached === null) {
                try {
                    $fromSpotify = $this->spotify->latestTracksByArtistName($artist->name, 15, $spotifyId);
                    if (count($fromSpotify) > 0) {
                        Cache::put($cacheKey, $fromSpotify, now()->addMinutes(45));
                        $latestTracks = $fromSpotify;
                    }
                } catch (\Throwable $e) {
                    Log::debug('Spotify latest tracks failed', [
                        'artist_id' => $artist->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        if (count($latestTracks) === 0) {
            $latestTracks = $this->itunesSearch->latestTracksByArtistName($artist->name, 15);
        }

        app(TurkeyProvincesSync::class)->sync();
        $provinceNames = City::query()->turkiyeProvinces()->pluck('name')->values()->all();

        $albumsPreview = [];
        if (is_array($artist->spotify_albums) && $artist->spotify_albums !== []) {
            $albumsPreview = $artist->spotify_albums;
        }
        if ($albumsPreview === []) {
            $albumsPreview = $this->itunesSearch->albumsByArtistName($artist->name, 20);
        }
        $albumsPreview = array_values($albumsPreview);

        $artist->setAttribute('spotify_albums', $albumsPreview);
        $artist->setAttribute('spotify_artist_image_url', null);

        $artist->loadExists([
            'user as is_verified_profile' => fn ($q) => $q->whereNotNull('email_verified_at'),
        ]);
        $artist->load(['managedBy:id,name,organization_display_name,email']);

        $u = $request->user();
        $isFavorited = $u !== null
            && $u->canUsePublicEngagementFeatures()
            && $u->favoriteArtists()->whereKey($artist->id)->exists();

        $organizationAffiliation = null;
        if ($artist->managedBy) {
            $m = $artist->managedBy;
            $label = trim((string) ($m->organization_display_name ?? '')) !== ''
                ? (string) $m->organization_display_name
                : (string) $m->name;
            $organizationAffiliation = ['label' => $label];
        }

        return Inertia::render('Artists/Show', [
            'artist' => $artist,
            'organizationAffiliation' => $organizationAffiliation,
            'documentStructuredData' => PublicStructuredData::artistShowGraph($artist),
            'upcomingEvents' => $upcomingEvents,
            'pastEvents' => $pastEvents,
            'stats' => $stats,
            'provinceNames' => $provinceNames,
            'latestTracks' => $latestTracks,
            'claimStatus' => auth()->check()
                ? ArtistClaimRequest::where('artist_id', $artist->id)->where('user_id', auth()->id())->value('status')
                : null,
            'artistFavorite' => [
                'canToggle' => $u !== null && $u->canUsePublicEngagementFeatures(),
                'isFavorited' => $isFavorited,
            ],
        ]);
    }
}
