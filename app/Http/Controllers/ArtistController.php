<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\ArtistClaimRequest;
use App\Models\ArtistMedia;
use App\Models\Event;
use App\Services\ITunesSearchService;
use App\Services\SpotifyService;
use App\Services\TurkeyProvincesSync;
use App\Support\CaseInsensitiveSearch;
use App\Support\CatalogEntityNew;
use App\Support\DailyUniqueEntityView;
use App\Support\EventPromoVenueProfileModeration;
use App\Support\InertiaDocumentMeta;
use App\Support\PublicStructuredData;
use App\Support\RequestGeoQuery;
use App\Support\TurkishAlphabet;
use App\Support\UpcomingSevenDayEventWindow;
use Carbon\Carbon;
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
            ->withCount([
                'events as weekly_events_count' => fn ($q) => UpcomingSevenDayEventWindow::applyToEloquent(
                    $q
                        ->published()
                        ->whereHas('venue', fn ($v) => $v->listedPublicly())
                ),
                'events as monthly_events_count' => fn ($q) => $q
                    ->published()
                    ->whereHas('venue', fn ($v) => $v->listedPublicly())
                    ->where('start_date', '>=', now()->startOfDay())
                    ->where('start_date', '<=', now()->endOfMonth()),
            ]);

        if ($request->filled('search')) {
            CaseInsensitiveSearch::whereColumnLikeInsensitive($query, 'name', (string) $request->string('search'));
        }
        if ($request->filled('genre')) {
            $query->whereGenreLabelMatches((string) $request->string('genre'));
        }
        if ($request->filled('letter')) {
            $letter = mb_strtoupper((string) $request->letter, 'UTF-8');
            $query->whereRaw('upper(substr(name, 1, 1)) = ?', [$letter]);
        }

        $artists = $query->orderBy('name')
            ->select(['id', 'name', 'slug', 'avatar', 'genre', 'bio', 'created_at', 'status', 'verified_at'])
            ->paginate(24)
            ->withQueryString();

        $geo = RequestGeoQuery::optionalNearLatLng($request);
        $artistsThisWeek = $this->artistsWithShowsInUpcomingWindow(
            $geo['lat'] ?? null,
            $geo['lng'] ?? null
        );
        $genreRows = Artist::approved()
            ->notIntlImport()
            ->whereNotNull('genre')
            ->where('genre', '!=', '')
            ->distinct()
            ->orderBy('genre')
            ->pluck('genre');

        $genres = collect(Artist::normalizeDistinctCatalogGenreLabels($genreRows))->values();
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
                'start' => now()->toIso8601String(),
                'end' => UpcomingSevenDayEventWindow::upperBound()->toIso8601String(),
            ],
            'genres' => $genres,
            'letters' => $letters,
            'alphabetLetters' => TurkishAlphabet::LETTERS,
            'filters' => array_merge(
                $request->only(['search', 'genre', 'letter']),
                $geo !== null
                    ? ['near_lat' => (string) $geo['lat'], 'near_lng' => (string) $geo['lng']]
                    : []
            ),
        ]);
    }

    /**
     * @param  Collection<int, object>  $rows  `artist_id`, `first_show` (MIN start)
     * @return array<int, string|null> artist_id → ilk gösterinin bitiş ISO’su
     */
    private function firstShowEndIsoByArtistId(Collection $rows): array
    {
        if ($rows->isEmpty()) {
            return [];
        }

        $artistIds = $rows->pluck('artist_id')->map(fn ($id) => (int) $id)->unique()->values()->all();

        $query = DB::table('event_artists as ea')
            ->join('events as e', 'e.id', '=', 'ea.event_id')
            ->join('venues as v', 'v.id', '=', 'e.venue_id')
            ->join('artists', 'artists.id', '=', 'ea.artist_id')
            ->where('e.status', 'published')
            ->where('v.status', 'approved')
            ->where('v.is_active', true)
            ->where('artists.status', 'approved')
            ->where(function ($q2) {
                $q2->whereNull('artists.country_code')
                    ->orWhere('artists.country_code', '!=', 'INT');
            })
            ->whereIn('ea.artist_id', $artistIds);

        $query = UpcomingSevenDayEventWindow::applyToQuery($query, 'e.start_date');

        $candidates = $query->get(['ea.artist_id', 'e.start_date', 'e.end_date']);

        $tupleToEndIso = [];
        foreach ($candidates as $row) {
            $aid = (int) $row->artist_id;
            $startNorm = Carbon::parse($row->start_date)->format('Y-m-d H:i:s');
            $tupleKey = $aid."\0".$startNorm;
            if (array_key_exists($tupleKey, $tupleToEndIso)) {
                continue;
            }
            $end = $row->end_date;
            $tupleToEndIso[$tupleKey] = $end !== null
                ? Carbon::parse($end)->toIso8601String()
                : null;
        }

        $out = [];
        foreach ($rows as $r) {
            $aid = (int) $r->artist_id;
            $first = $r->first_show;
            if ($first === null) {
                $out[$aid] = null;

                continue;
            }
            $startNorm = Carbon::parse($first)->format('Y-m-d H:i:s');
            $tupleKey = $aid."\0".$startNorm;
            $out[$aid] = $tupleToEndIso[$tupleKey] ?? null;
        }

        return $out;
    }

    /**
     * Sanatçılar: bugünden itibaren 7 günlük pencerede (yalnızca start_date >= şu an) en az bir yayınlanmış etkinliği olanlar.
     * Konum verilirse aynı pencerede önce ilk gösteri tarihi, sonra mekân uzaklığı sırası uygulanır.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function artistsWithShowsInUpcomingWindow(?float $nearLat = null, ?float $nearLng = null): Collection
    {
        if ($nearLat !== null && $nearLng !== null) {
            $haversine = '(CASE WHEN v.latitude IS NOT NULL AND v.longitude IS NOT NULL '
                .'THEN (6371 * acos(LEAST(1, GREATEST(-1, cos(radians(?)) * cos(radians(v.latitude)) '
                .'* cos(radians(v.longitude) - radians(?)) + sin(radians(?)) * sin(radians(v.latitude)))))) '
                .'ELSE 999999 END)';

            $candidateQuery = UpcomingSevenDayEventWindow::applyToQuery(
                DB::table('event_artists as ea')
                    ->join('events as e', 'e.id', '=', 'ea.event_id')
                    ->join('venues as v', 'v.id', '=', 'e.venue_id')
                    ->join('artists', 'artists.id', '=', 'ea.artist_id')
                    ->where('e.status', 'published')
                    ->where('v.status', 'approved')
                    ->where('v.is_active', true)
                    ->where('artists.status', 'approved')
                    ->where(function ($q) {
                        $q->whereNull('artists.country_code')
                            ->orWhere('artists.country_code', '!=', 'INT');
                    }),
                'e.start_date'
            )
                ->orderBy('e.start_date')
                ->orderByRaw($haversine.' ASC', [$nearLat, $nearLng, $nearLat])
                ->select(['ea.artist_id', 'e.start_date']);

            $candidates = $candidateQuery->limit(600)->get();
            $seen = [];
            $orderedMeta = [];
            foreach ($candidates as $row) {
                $aid = (int) $row->artist_id;
                if (isset($seen[$aid])) {
                    continue;
                }
                $seen[$aid] = true;
                $orderedMeta[] = ['artist_id' => $aid, 'first_show' => $row->start_date];
                if (count($orderedMeta) >= 48) {
                    break;
                }
            }

            if ($orderedMeta === []) {
                return collect();
            }

            $pickedIds = array_column($orderedMeta, 'artist_id');

            $counts = UpcomingSevenDayEventWindow::applyToQuery(
                DB::table('event_artists as ea')
                    ->join('events as e', 'e.id', '=', 'ea.event_id')
                    ->join('venues as v', 'v.id', '=', 'e.venue_id')
                    ->join('artists', 'artists.id', '=', 'ea.artist_id')
                    ->whereIn('ea.artist_id', $pickedIds)
                    ->where('e.status', 'published')
                    ->where('v.status', 'approved')
                    ->where('v.is_active', true)
                    ->where('artists.status', 'approved')
                    ->where(function ($q) {
                        $q->whereNull('artists.country_code')
                            ->orWhere('artists.country_code', '!=', 'INT');
                    }),
                'e.start_date'
            )
                ->groupBy('ea.artist_id')
                ->selectRaw('ea.artist_id, COUNT(e.id) as week_events_count')
                ->pluck('week_events_count', 'artist_id');

            $rows = collect($orderedMeta)->map(fn (array $meta) => (object) [
                'artist_id' => $meta['artist_id'],
                'first_show' => $meta['first_show'],
                'week_events_count' => (int) ($counts[$meta['artist_id']] ?? 0),
            ]);
        } else {
            $rows = UpcomingSevenDayEventWindow::applyToQuery(
                DB::table('event_artists')
                    ->join('events', 'events.id', '=', 'event_artists.event_id')
                    ->join('venues', 'venues.id', '=', 'events.venue_id')
                    ->join('artists', 'artists.id', '=', 'event_artists.artist_id')
                    ->where('events.status', 'published')
                    ->where('venues.status', 'approved')
                    ->where('venues.is_active', true)
                    ->where('artists.status', 'approved')
                    ->where(function ($q) {
                        $q->whereNull('artists.country_code')
                            ->orWhere('artists.country_code', '!=', 'INT');
                    }),
                'events.start_date'
            )
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
        }

        $idsOrdered = $rows->pluck('artist_id')->map(fn ($id) => (int) $id)->all();
        $metaByArtistId = $rows->keyBy(fn ($r) => (int) $r->artist_id);
        $firstShowEndIsoByArtist = $this->firstShowEndIsoByArtistId($rows);

        $loaded = Artist::query()
            ->whereIn('id', $idsOrdered)
            ->select(['id', 'name', 'slug', 'avatar', 'genre', 'created_at', 'status', 'verified_at'])
            ->get()
            ->keyBy('id');

        return collect($idsOrdered)
            ->map(function (int $id) use ($loaded, $metaByArtistId, $firstShowEndIsoByArtist) {
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
                    'is_verified_profile' => $artist->is_verified_profile,
                    'is_new_on_platform' => CatalogEntityNew::isWithinBadgeWindow(
                        $artist->created_at,
                        CatalogEntityNew::artistEligible((string) $artist->status),
                    ),
                    'week_first_show' => $first ? (string) $first : null,
                    'week_first_show_end' => $firstShowEndIsoByArtist[$id] ?? null,
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

        $hideSpotifyPublic = (bool) $artist->spotify_auto_link_disabled;

        if ($hideSpotifyPublic) {
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
            ->whereHas('venue', fn ($v) => $v->listedPublicly());

        $upcomingEvents = $baseArtistEvents()
            ->whereNotNull('events.start_date')
            ->whereStillVisibleOnPublicListing()
            ->with(['venue.city', 'venue.district'])
            ->orderBy('start_date')
            ->limit(120)
            ->get();

        $pastEvents = $baseArtistEvents()
            ->whereNotNull('events.start_date')
            ->wherePastOnPublicListing()
            ->with(['venue.city', 'venue.district'])
            ->orderByDesc('start_date')
            ->limit(24)
            ->get();

        $statsQuery = $baseArtistEvents();
        $stats = [
            'total_events' => (clone $statsQuery)->count(),
            'upcoming_count' => (clone $statsQuery)->whereNotNull('events.start_date')->whereStillVisibleOnPublicListing()->count(),
            'past_count' => (clone $statsQuery)->whereNotNull('events.start_date')->wherePastOnPublicListing()->count(),
            'venue_count' => (clone $statsQuery)->distinct()->count('events.venue_id'),
            'favorites_followers_count' => $artist->favoritedByUsers()->count(),
        ];

        $latestTracks = [];

        if (! $hideSpotifyPublic) {
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

            $albumsPreview = [];
            if (is_array($artist->spotify_albums) && $artist->spotify_albums !== []) {
                $albumsPreview = $artist->spotify_albums;
            }
            if ($albumsPreview === []) {
                $albumsPreview = $this->itunesSearch->albumsByArtistName($artist->name, 20);
            }
            $albumsPreview = array_values($albumsPreview);

            $artist->setAttribute('spotify_albums', $albumsPreview);
        } else {
            $artist->setAttribute('spotify_albums', []);
        }

        app(TurkeyProvincesSync::class)->sync();
        $artist->setAttribute('spotify_artist_image_url', null);

        $artist->load(['managedBy:id,name,organization_display_name,email']);

        $u = $request->user();
        $isFavorited = $u !== null
            && $u->canFavoriteArtists()
            && $u->favoriteArtists()->whereKey($artist->id)->exists();

        $organizationAffiliation = null;
        if ($artist->managedBy) {
            $m = $artist->managedBy;
            $label = trim((string) ($m->organization_display_name ?? '')) !== ''
                ? (string) $m->organization_display_name
                : (string) $m->name;
            $organizationAffiliation = ['label' => $label];
        }

        $artistEventPromoSections = [];
        if (Schema::hasColumn('events', 'promo_show_on_artist_profile_posts')) {
            $promoQuery = Event::query()
                ->published()
                ->whereHas('artists', fn ($q) => $q->where('artists.id', $artist->id))
                ->where(function ($q): void {
                    $q->where('promo_show_on_artist_profile_posts', true)
                        ->orWhere('promo_show_on_artist_profile_videos', true);
                });
            if (Schema::hasColumn('events', 'promo_artist_profile_moderation')) {
                $promoQuery->where('promo_artist_profile_moderation', EventPromoVenueProfileModeration::APPROVED);
            }
            foreach ($promoQuery
                ->with(['artists:id,name,slug,avatar'])
                ->orderByRaw('CASE WHEN COALESCE(start_date, end_date) IS NULL THEN 1 ELSE 0 END')
                ->orderByRaw('COALESCE(start_date, end_date) ASC')
                ->orderBy('events.id')
                ->limit(80)
                ->get() as $ev) {
                if (! $ev instanceof Event || ! $ev->isPromoEligibleForArtistProfilePage()) {
                    continue;
                }
                $items = $ev->promoItemsForArtistProfilePage();
                if ($items === []) {
                    continue;
                }
                $artistEventPromoSections[] = [
                    'event_id' => $ev->id,
                    'title' => $ev->title,
                    'slug_segment' => $ev->publicUrlSegment(),
                    'items' => $items,
                    'start_date' => $ev->start_date?->toIso8601String(),
                    'end_date' => $ev->end_date?->toIso8601String(),
                ];
            }
        }

        return Inertia::render('Artists/Show', [
            'artist' => $artist,
            'organizationAffiliation' => $organizationAffiliation,
            'documentStructuredData' => PublicStructuredData::artistShowGraph($artist),
            'upcomingEvents' => $upcomingEvents,
            'pastEvents' => $pastEvents,
            'stats' => $stats,
            'latestTracks' => $latestTracks,
            'artistEventPromoSections' => $artistEventPromoSections,
            'claimStatus' => auth()->check()
                ? ArtistClaimRequest::where('artist_id', $artist->id)->where('user_id', auth()->id())->value('status')
                : null,
            'artistFavorite' => [
                'canToggle' => $u !== null && $u->canFavoriteArtists(),
                'isFavorited' => $isFavorited,
            ],
        ]);
    }
}
