<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\ArtistClaimRequest;
use App\Models\ArtistMedia;
use App\Models\City;
use App\Services\ITunesSearchService;
use App\Services\SpotifyService;
use App\Services\TurkeyProvincesSync;
use App\Support\CatalogEntityNew;
use App\Support\DailyUniqueEntityView;
use App\Support\InertiaDocumentMeta;
use App\Support\PublicStructuredData;
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
            ->withExists([
                'user as is_verified_profile' => fn ($q) => $q->whereNotNull('email_verified_at'),
            ])
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
            $query->where('name', 'like', '%'.$request->search.'%');
        }
        if ($request->filled('genre')) {
            $query->whereGenreLabelMatches((string) $request->string('genre'));
        }
        if ($request->filled('letter')) {
            $letter = mb_strtoupper((string) $request->letter, 'UTF-8');
            $query->whereRaw('upper(substr(name, 1, 1)) = ?', [$letter]);
        }

        $artists = $query->orderBy('name')
            ->select(['id', 'name', 'slug', 'avatar', 'genre', 'bio', 'created_at', 'status'])
            ->paginate(12)
            ->withQueryString();

        $artistsThisWeek = $this->artistsWithShowsInUpcomingWindow();
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
            'filters' => $request->only(['search', 'genre', 'letter']),
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
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function artistsWithShowsInUpcomingWindow(): Collection
    {
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

        $idsOrdered = $rows->pluck('artist_id')->map(fn ($id) => (int) $id)->all();
        $metaByArtistId = $rows->keyBy(fn ($r) => (int) $r->artist_id);
        $firstShowEndIsoByArtist = $this->firstShowEndIsoByArtistId($rows);

        $loaded = Artist::query()
            ->whereIn('id', $idsOrdered)
            ->select(['id', 'name', 'slug', 'avatar', 'genre', 'created_at', 'status'])
            ->withExists([
                'user as is_verified_profile' => fn ($q) => $q->whereNotNull('email_verified_at'),
            ])
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
                    'is_verified_profile' => (bool) $artist->is_verified_profile,
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
        $provinceNames = City::query()->turkiyeProvinces()->pluck('name')->values()->all();
        $artist->setAttribute('spotify_artist_image_url', null);

        $artist->loadExists([
            'user as is_verified_profile' => fn ($q) => $q->whereNotNull('email_verified_at'),
        ]);
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
                'canToggle' => $u !== null && $u->canFavoriteArtists(),
                'isFavorited' => $isFavorited,
            ],
        ]);
    }
}
