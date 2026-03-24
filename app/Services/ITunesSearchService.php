<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Apple iTunes Search API — anahtar gerektirmez, Spotify Premium / Web API şartı yoktur.
 *
 * @see https://performance-partners.apple.com/search-api
 */
class ITunesSearchService
{
    private const BASE = 'https://itunes.apple.com/search';

    public function country(): string
    {
        return config('services.itunes.country', 'TR');
    }

    /**
     * Spotify Web API latestTracks ile aynı şekil (Show.tsx uyumu).
     *
     * @return list<array{
     *     id: string|null,
     *     name: string,
     *     spotify_url: string|null,
     *     preview_url: string|null,
     *     album_name: string|null,
     *     album_image: string|null,
     *     release_date: string|null,
     *     duration_ms: int|null,
     *     artists: list<string>
     * }>
     */
    public function latestTracksByArtistName(string $artistName, int $limit = 15): array
    {
        $artistName = trim($artistName);
        if ($artistName === '') {
            return [];
        }

        $fetchLimit = min(50, max($limit * 4, $limit));
        $results = $this->search(['term' => $artistName, 'entity' => 'song', 'limit' => $fetchLimit]);
        if ($results === []) {
            return [];
        }

        $normalizedRequested = $this->normalizeArtistName($artistName);
        $out = [];
        foreach ($results as $row) {
            if (! is_array($row)) {
                continue;
            }
            $an = (string) ($row['artistName'] ?? '');
            if (! $this->artistNameMatches($an, $artistName, $normalizedRequested)) {
                continue;
            }
            $preview = $row['previewUrl'] ?? null;
            $art = $row['artworkUrl100'] ?? null;
            $name = (string) ($row['trackName'] ?? '');
            if ($name === '') {
                continue;
            }
            $out[] = [
                'id' => isset($row['trackId']) ? (string) $row['trackId'] : null,
                'name' => $name,
                'spotify_url' => null,
                'preview_url' => is_string($preview) && $preview !== '' ? $preview : null,
                'album_name' => isset($row['collectionName']) ? (string) $row['collectionName'] : null,
                'album_image' => is_string($art) && $art !== '' ? $this->upgradeArtworkSize($art) : null,
                'release_date' => isset($row['releaseDate']) ? (string) $row['releaseDate'] : null,
                'duration_ms' => isset($row['trackTimeMillis']) ? (int) $row['trackTimeMillis'] : null,
                'artists' => $an !== '' ? [$an] : [],
            ];
            if (count($out) >= $limit) {
                break;
            }
        }

        return $out;
    }

    /**
     * @return list<array{id: string, name: string, release_date: string|null, image: string|null, url: string|null}>
     */
    public function albumsByArtistName(string $artistName, int $limit = 20): array
    {
        $artistName = trim($artistName);
        if ($artistName === '') {
            return [];
        }

        $results = $this->search(['term' => $artistName, 'entity' => 'album', 'limit' => min(50, max(1, $limit * 2))]);
        if ($results === []) {
            return [];
        }

        $normalizedRequested = $this->normalizeArtistName($artistName);
        $seen = [];
        $out = [];
        foreach ($results as $row) {
            if (! is_array($row)) {
                continue;
            }
            $an = (string) ($row['artistName'] ?? '');
            if (! $this->artistNameMatches($an, $artistName, $normalizedRequested)) {
                continue;
            }
            $id = isset($row['collectionId']) ? (string) $row['collectionId'] : '';
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $art = $row['artworkUrl100'] ?? null;
            $name = (string) ($row['collectionName'] ?? '');
            if ($name === '') {
                continue;
            }
            $rd = $row['releaseDate'] ?? null;
            $out[] = [
                'id' => $id,
                'name' => $name,
                'release_date' => is_string($rd) && $rd !== '' ? $this->shortReleaseDate($rd) : null,
                'image' => is_string($art) && $art !== '' ? $this->upgradeArtworkSize($art) : null,
                'url' => isset($row['collectionViewUrl']) && is_string($row['collectionViewUrl']) ? $row['collectionViewUrl'] : null,
            ];
            if (count($out) >= $limit) {
                break;
            }
        }

        return $out;
    }

    public function artistArtworkUrl(string $artistName): ?string
    {
        $artistName = trim($artistName);
        if ($artistName === '') {
            return null;
        }

        $results = $this->search(['term' => $artistName, 'entity' => 'musicArtist', 'limit' => 10]);
        $normalizedRequested = $this->normalizeArtistName($artistName);
        foreach ($results as $row) {
            if (! is_array($row)) {
                continue;
            }
            $an = (string) ($row['artistName'] ?? '');
            if (! $this->artistNameMatches($an, $artistName, $normalizedRequested)) {
                continue;
            }
            foreach (['artworkUrl100', 'artworkUrl60', 'artworkUrl30'] as $key) {
                $u = $row[$key] ?? null;
                if (is_string($u) && $u !== '') {
                    return $this->upgradeArtworkSize($u);
                }
            }
        }

        return null;
    }

    /**
     * @return list<mixed>
     */
    private function search(array $query): array
    {
        $query['country'] = $this->country();

        try {
            $response = Http::timeout(22)->get(self::BASE, $query);
        } catch (\Throwable $e) {
            Log::debug('iTunes Search isteği hatası', ['q' => $query, 'error' => $e->getMessage()]);

            return [];
        }

        if (! $response->ok()) {
            Log::debug('iTunes Search HTTP hatası', ['status' => $response->status(), 'q' => $query]);

            return [];
        }

        $json = $response->json();
        $results = $json['results'] ?? [];

        return is_array($results) ? $results : [];
    }

    private function normalizeArtistName(string $s): string
    {
        $s = mb_strtolower(trim($s), 'UTF-8');

        return preg_replace('/\s+/u', ' ', $s) ?? $s;
    }

    private function artistNameMatches(string $itunesArtist, string $requestedName, string $normalizedRequested): bool
    {
        if ($itunesArtist === '') {
            return false;
        }
        $a = $this->normalizeArtistName($itunesArtist);
        if ($a === $normalizedRequested) {
            return true;
        }
        $primary = preg_split('/\s+(?:feat\.|ft\.|featuring)\s+/iu', $itunesArtist, 2);
        $primaryName = is_array($primary) && isset($primary[0]) ? $primary[0] : $itunesArtist;
        if ($this->normalizeArtistName($primaryName) === $normalizedRequested) {
            return true;
        }
        if (mb_strlen($normalizedRequested) >= 3 && mb_strlen($a) >= 3) {
            if (mb_strpos($a, $normalizedRequested) !== false || mb_strpos($normalizedRequested, $a) !== false) {
                return true;
            }
        }

        return false;
    }

    private function upgradeArtworkSize(string $url): string
    {
        return str_replace(
            ['100x100bb', '60x60bb', '30x30bb'],
            '600x600bb',
            $url
        );
    }

    private function shortReleaseDate(string $iso): string
    {
        if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $iso, $m)) {
            return $m[1];
        }
        if (preg_match('/^(\d{4})/', $iso, $m)) {
            return $m[1];
        }

        return $iso;
    }
}
