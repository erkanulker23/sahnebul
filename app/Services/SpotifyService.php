<?php

namespace App\Services;

use App\Support\PersonNameMatch;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SpotifyService
{
    public function market(): string
    {
        return config('services.spotify.market', 'TR');
    }

    /**
     * Zenginleştirmeden önce token + katalog okumasını doğrular; başarıda access token önbelleğe yazılır.
     *
     * @return array{ok: bool, http_status: ?int, hint: ?string}
     */
    public function probeWebApiCatalog(): array
    {
        Cache::forget('spotify_access_token');

        $clientId = trim((string) config('services.spotify.client_id'));
        $clientSecret = trim((string) config('services.spotify.client_secret'));

        if ($clientId === '' || $clientSecret === '') {
            return ['ok' => false, 'http_status' => null, 'hint' => 'SPOTIFY_CLIENT_ID veya SPOTIFY_CLIENT_SECRET boş.'];
        }

        try {
            $tokenRes = Http::timeout(20)
                ->asForm()
                ->withBasicAuth($clientId, $clientSecret)
                ->post('https://accounts.spotify.com/api/token', [
                    'grant_type' => 'client_credentials',
                ]);
        } catch (\Throwable $e) {
            return ['ok' => false, 'http_status' => null, 'hint' => 'Token isteği: '.$e->getMessage()];
        }

        if (! $tokenRes->ok()) {
            return [
                'ok' => false,
                'http_status' => $tokenRes->status(),
                'hint' => Str::limit((string) $tokenRes->body(), 400),
            ];
        }

        $access = $tokenRes->json('access_token');
        if (! is_string($access) || $access === '') {
            return ['ok' => false, 'http_status' => null, 'hint' => 'Token yanıtında access_token yok.'];
        }

        try {
            $apiRes = Http::timeout(20)
                ->withToken($access)
                ->acceptJson()
                ->get('https://api.spotify.com/v1/artists', [
                    'ids' => '24hR7ZaxdlZLaTnzZOlwMh',
                ]);
        } catch (\Throwable $e) {
            return ['ok' => false, 'http_status' => null, 'hint' => 'Web API: '.$e->getMessage()];
        }

        if (! $apiRes->ok()) {
            $body = (string) $apiRes->body();
            $hint = Str::limit($body, 500);
            if ($apiRes->status() === 403 && str_contains(strtolower($body), 'premium')) {
                $hint .= ' — Development mode: uygulama sahibi Spotify Premium gerekir. https://developer.spotify.com/documentation/web-api/concepts/quota-modes';
            }

            return ['ok' => false, 'http_status' => $apiRes->status(), 'hint' => $hint];
        }

        $artists = $apiRes->json('artists');
        $first = is_array($artists) && isset($artists[0]) && is_array($artists[0]) ? $artists[0] : null;
        if ($first === null || empty($first['id'])) {
            return ['ok' => false, 'http_status' => $apiRes->status(), 'hint' => 'Web API yanıtı geçersiz (sanatçı listesi boş).'];
        }

        Cache::put('spotify_access_token', $access, now()->addMinutes(50));

        return ['ok' => true, 'http_status' => 200, 'hint' => null];
    }

    /**
     * @param  ?string  $spotifyArtistId  Veritabanındaki Spotify sanatçı ID; varsa isim araması yapılmaz (daha güvenilir).
     */
    public function latestTracksByArtistName(string $artistName, int $limit = 5, ?string $spotifyArtistId = null): array
    {
        $tracks = [];
        $id = $spotifyArtistId !== null && $spotifyArtistId !== '' ? trim($spotifyArtistId) : null;
        if ($id === null || $id === '') {
            $search = $this->getJson('search', [
                'q' => $artistName,
                'type' => 'artist',
                'market' => $this->market(),
                'limit' => 1,
            ]);
            $items = is_array($search) ? ($search['artists']['items'] ?? []) : [];
            $id = is_array($items[0] ?? null) ? ($items[0]['id'] ?? null) : null;
        }
        if ($id !== null && $id !== '') {
            $tracks = $this->getArtistTopTracks((string) $id, $limit);
        }

        return array_map(static function (array $track): array {
            $artistNames = [];
            foreach ($track['artists'] ?? [] as $a) {
                if (! empty($a['name'])) {
                    $artistNames[] = $a['name'];
                }
            }

            return [
                'id' => $track['id'] ?? null,
                'name' => $track['name'] ?? '',
                'spotify_url' => $track['external_urls']['spotify'] ?? null,
                'preview_url' => $track['preview_url'] ?? null,
                'album_name' => $track['album']['name'] ?? null,
                'album_image' => $track['album']['images'][0]['url'] ?? null,
                'release_date' => $track['album']['release_date'] ?? null,
                'duration_ms' => isset($track['duration_ms']) ? (int) $track['duration_ms'] : null,
                'artists' => $artistNames,
            ];
        }, $tracks);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function getArtistTopTracks(string $artistId, int $limit = 15): array
    {
        $artistId = trim($artistId);
        if ($artistId === '') {
            return [];
        }

        $markets = array_values(array_unique(array_filter([
            $this->market(),
            'US',
            'GB',
        ])));

        foreach ($markets as $market) {
            $data = $this->getJson("artists/{$artistId}/top-tracks", [
                'market' => $market,
            ]);
            if (! is_array($data)) {
                continue;
            }
            $raw = $data['tracks'] ?? [];
            if (is_array($raw) && $raw !== []) {
                return array_slice($raw, 0, $limit);
            }
        }

        return [];
    }

    /**
     * GET /v1/{path}
     *
     * @return array<string, mixed>|null
     */
    public function getJson(string $path, array $query = []): ?array
    {
        $url = 'https://api.spotify.com/v1/'.ltrim($path, '/');

        for ($attempt = 0; $attempt < 8; $attempt++) {
            $token = $this->getAccessToken();
            if (! $token) {
                return null;
            }

            $response = Http::timeout(25)->withToken($token)->get($url, $query);

            if ($response->status() === 429) {
                $wait = (int) $response->header('Retry-After', (string) min(2 + $attempt, 60));
                sleep(max(1, min($wait, 60)));

                continue;
            }

            if ($response->status() === 401) {
                Cache::forget('spotify_access_token');

                continue;
            }

            if (! $response->ok()) {
                Log::debug('Spotify Web API isteği başarısız', [
                    'path' => $path,
                    'status' => $response->status(),
                    'body' => Str::limit((string) $response->body(), 400),
                ]);

                return null;
            }

            /** @var array<string, mixed>|null */
            $json = $response->json();

            return is_array($json) ? $json : null;
        }

        return null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function searchArtists(string $query, int $limit = 50, int $offset = 0): array
    {
        $data = $this->getJson('search', [
            'q' => $query,
            'type' => 'artist',
            'market' => $this->market(),
            'limit' => min(50, max(1, $limit)),
            'offset' => min(950, max(0, $offset)),
        ]);

        if (! is_array($data)) {
            return [];
        }

        return $data['artists']['items'] ?? [];
    }

    /**
     * GET /v1/artists/{id}
     *
     * @return array<string, mixed>|null
     */
    public function getArtist(string $artistId): ?array
    {
        $artistId = trim($artistId);
        if ($artistId === '') {
            return null;
        }

        return $this->getJson("artists/{$artistId}");
    }

    /**
     * Veritabanındaki isim ile Spotify’daki sanatçı adı uyumlu mu (yanlış spotify_id ile başka sanatçı görseli önlemek için).
     */
    public function spotifyArtistMatchesLocalName(string $spotifyId, string $localName): bool
    {
        $spotifyId = trim($spotifyId);
        if ($spotifyId === '') {
            return false;
        }
        $data = $this->getArtist($spotifyId);
        if (! is_array($data) || empty($data['name'])) {
            return false;
        }

        return PersonNameMatch::likelySame($localName, (string) $data['name']);
    }

    /**
     * Spotify sanatçı profil görseli (images dizisindeki ilk geçerli URL; genelde en büyük boy).
     */
    public function getArtistImageUrl(string $artistId): ?string
    {
        $data = $this->getArtist($artistId);
        if (! is_array($data)) {
            return null;
        }
        $images = $data['images'] ?? [];
        if (! is_array($images)) {
            return null;
        }
        foreach ($images as $img) {
            if (is_array($img) && ! empty($img['url']) && is_string($img['url'])) {
                return $img['url'];
            }
        }

        return null;
    }

    /**
     * @param  list<string>  $ids  En fazla 50
     * @return list<array<string, mixed>|null>
     */
    public function getSeveralArtists(array $ids): array
    {
        $ids = array_values(array_filter(array_slice($ids, 0, 50)));
        if ($ids === []) {
            return [];
        }

        $data = $this->getJson('artists', [
            'ids' => implode(',', $ids),
        ]);

        return $data['artists'] ?? [];
    }

    /**
     * @return \Generator<string>
     */
    public function paginatePlaylistArtistIds(string $playlistId): \Generator
    {
        $market = $this->market();
        $maxPages = (int) config('services.spotify.import_max_playlist_track_pages', 4);
        $url = "https://api.spotify.com/v1/playlists/{$playlistId}/tracks";
        $query = ['market' => $market, 'limit' => 50];

        for ($page = 0; $page < $maxPages; $page++) {
            $token = $this->getAccessToken();
            if (! $token) {
                break;
            }

            $response = Http::timeout(25)->withToken($token)->get($url, $query);
            if ($response->status() === 429) {
                sleep((int) $response->header('Retry-After', 3));

                continue;
            }
            if ($response->status() === 401) {
                Cache::forget('spotify_access_token');

                continue;
            }
            if (! $response->ok()) {
                break;
            }

            $data = $response->json();
            $items = $data['items'] ?? [];
            foreach ($items as $row) {
                $track = $row['track'] ?? null;
                if (! is_array($track)) {
                    continue;
                }
                foreach ($track['artists'] ?? [] as $a) {
                    if (! empty($a['id'])) {
                        yield (string) $a['id'];
                    }
                }
            }

            $next = $data['next'] ?? null;
            if (! is_string($next) || $next === '') {
                break;
            }
            $url = $next;
            $query = [];
        }
    }

    /**
     * @return list<array{id: string, name: string, release_date: string|null, image: string|null, url: string|null}>
     */
    public function getArtistAlbumsPreview(string $artistId, int $limit = 10): array
    {
        $artistId = trim($artistId);
        if ($artistId === '') {
            return [];
        }

        $data = $this->getJson("artists/{$artistId}/albums", [
            'market' => $this->market(),
            'include_groups' => 'album,single',
            'limit' => min(50, max(1, $limit)),
        ]);

        if (! is_array($data)) {
            return [];
        }

        $items = $data['items'] ?? [];
        $out = [];
        foreach ($items as $album) {
            if (! is_array($album)) {
                continue;
            }
            $id = $album['id'] ?? '';
            if ($id === '') {
                continue;
            }
            $img = $this->largestSpotifyImageUrl(is_array($album['images'] ?? null) ? $album['images'] : []);
            $out[] = [
                'id' => (string) $id,
                'name' => (string) ($album['name'] ?? ''),
                'release_date' => isset($album['release_date']) ? (string) $album['release_date'] : null,
                'image' => $img,
                'url' => $album['external_urls']['spotify'] ?? null,
            ];
        }

        return $out;
    }

    /**
     * Sanatçının Spotify’daki albüm/single kapaklarından ilkinin en geniş görsel URL’si (avatar için).
     * Albüm listesi yayın tarihine göre gelir; kapak yoksa null.
     */
    public function getArtistAlbumCoverImageUrl(string $artistId): ?string
    {
        $artistId = trim($artistId);
        if ($artistId === '') {
            return null;
        }

        $data = $this->getJson("artists/{$artistId}/albums", [
            'market' => $this->market(),
            'include_groups' => 'album,single',
            'limit' => 20,
        ]);

        if (! is_array($data)) {
            return null;
        }

        $items = $data['items'] ?? [];
        if (! is_array($items)) {
            return null;
        }

        foreach ($items as $album) {
            if (! is_array($album)) {
                continue;
            }
            $url = $this->largestSpotifyImageUrl($album['images'] ?? []);
            if ($url !== null) {
                return $url;
            }
        }

        return null;
    }

    /**
     * @param  array<int, mixed>  $images
     */
    private function largestSpotifyImageUrl(array $images): ?string
    {
        $bestUrl = null;
        $bestW = -1;
        foreach ($images as $img) {
            if (! is_array($img) || empty($img['url']) || ! is_string($img['url'])) {
                continue;
            }
            $w = isset($img['width']) ? (int) $img['width'] : 0;
            if ($w >= $bestW) {
                $bestW = $w;
                $bestUrl = $img['url'];
            }
        }

        return $bestUrl;
    }

    private function getAccessToken(): ?string
    {
        $cached = Cache::get('spotify_access_token');
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $clientId = trim((string) config('services.spotify.client_id'));
        $clientSecret = trim((string) config('services.spotify.client_secret'));

        if ($clientId === '' || $clientSecret === '') {
            return null;
        }

        $response = Http::timeout(20)
            ->asForm()
            ->withBasicAuth($clientId, $clientSecret)
            ->post('https://accounts.spotify.com/api/token', [
                'grant_type' => 'client_credentials',
            ]);

        if (! $response->ok()) {
            Log::warning('Spotify access token alınamadı', [
                'status' => $response->status(),
                'body' => Str::limit((string) $response->body(), 500),
            ]);

            return null;
        }

        $token = $response->json('access_token');
        if (! is_string($token) || $token === '') {
            Log::warning('Spotify token yanıtında access_token yok');

            return null;
        }

        Cache::put('spotify_access_token', $token, now()->addMinutes(50));

        return $token;
    }
}
