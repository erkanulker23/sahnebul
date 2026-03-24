<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\ArtistClaimRequest;
use App\Models\City;
use App\Services\ITunesSearchService;
use App\Services\TurkeyProvincesSync;
use App\Support\TurkishAlphabet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ArtistController extends Controller
{
    public function __construct(private readonly ITunesSearchService $itunesSearch) {}

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

        return Inertia::render('Artists/Index', [
            'artists' => $artists,
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
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function artistsWithShowsThisWeek(\Carbon\CarbonInterface $weekStart, \Carbon\CarbonInterface $weekEnd): \Illuminate\Support\Collection
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
            ->select('event_artists.artist_id', DB::raw('MIN(events.start_date) as first_show'))
            ->groupBy('event_artists.artist_id')
            ->orderBy('first_show')
            ->limit(48)
            ->get();

        if ($rows->isEmpty()) {
            return collect();
        }

        $idsOrdered = $rows->pluck('artist_id')->map(fn ($id) => (int) $id)->all();
        $firstShowById = $rows->keyBy(fn ($r) => (int) $r->artist_id);

        $loaded = Artist::query()
            ->whereIn('id', $idsOrdered)
            ->select(['id', 'name', 'slug', 'avatar', 'genre'])
            ->withExists([
                'user as is_verified_profile' => fn ($q) => $q->whereNotNull('email_verified_at'),
            ])
            ->get()
            ->keyBy('id');

        return collect($idsOrdered)
            ->map(function (int $id) use ($loaded, $firstShowById) {
                $artist = $loaded->get($id);
                if (! $artist) {
                    return null;
                }
                $first = $firstShowById->get($id)?->first_show;

                return [
                    'id' => $artist->id,
                    'name' => $artist->name,
                    'slug' => $artist->slug,
                    'avatar' => $artist->avatar,
                    'genre' => $artist->genre,
                    'is_verified_profile' => (bool) $artist->is_verified_profile,
                    'week_first_show' => $first ? (string) $first : null,
                ];
            })
            ->filter()
            ->values();
    }

    public function show(Artist $artist)
    {
        if ($artist->status !== 'approved') {
            abort(404);
        }

        $artist->increment('view_count');
        $artist->refresh();

        $artist->load(['media']);

        // Tüm geçmişi belleğe almak yerine sorgu ile bölmek; yaklaşanlarda düşük limit (ör. 12)
        // ileri tarihli konserleri listeden düşürüyordu (aynı sanatçıda çok etkinlik varsa).
        $baseArtistEvents = fn () => $artist->events()
            ->published()
            ->whereHas('venue', fn ($v) => $v->approved());

        $upcomingEvents = $baseArtistEvents()
            ->where('start_date', '>', now())
            ->with('venue.city')
            ->orderBy('start_date')
            ->limit(120)
            ->get();

        $pastEvents = $baseArtistEvents()
            ->where('start_date', '<', now())
            ->with('venue.city')
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

        /** Spotify Web API (Premium/Extension şartı) kullanılmıyor; iTunes Search API ücretsizdir. */
        $latestTracks = $this->itunesSearch->latestTracksByArtistName($artist->name, 15);

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

        return Inertia::render('Artists/Show', [
            'artist' => $artist,
            'upcomingEvents' => $upcomingEvents,
            'pastEvents' => $pastEvents,
            'stats' => $stats,
            'provinceNames' => $provinceNames,
            'latestTracks' => $latestTracks,
            'claimStatus' => auth()->check()
                ? ArtistClaimRequest::where('artist_id', $artist->id)->where('user_id', auth()->id())->value('status')
                : null,
        ]);
    }
}
