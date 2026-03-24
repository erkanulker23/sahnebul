<?php

namespace App\Services;

/**
 * Spotify Web API üzerinden sanatçı keşfi: Türkiye pazarında browse kategorileri,
 * çalma listeleri ve çoklu arama sorguları ile ID toplar.
 *
 * @see https://developer.spotify.com/documentation/web-api
 */
class SpotifyArtistImporter
{
    public function __construct(private readonly SpotifyService $spotify) {}

    /**
     * @param  callable(string): void  $log
     * @return list<string>
     */
    public function discoverArtistIds(
        int $poolTarget,
        callable $log,
        bool $useBrowse = true,
        bool $useSearch = true,
    ): array {
        $seen = [];
        $ids = [];

        $addOne = function (string $id) use (&$seen, &$ids, $poolTarget): bool {
            if ($id === '' || isset($seen[$id])) {
                return false;
            }
            $seen[$id] = true;
            $ids[] = $id;

            return count($ids) >= $poolTarget;
        };

        if ($useBrowse) {
            $log('Keşif: Spotify browse (kategoriler → çalma listeleri → parçalar)...');
            foreach ($this->discoverFromBrowse($log, $poolTarget) as $id) {
                if ($addOne($id)) {
                    return $ids;
                }
            }
        }

        if ($useSearch && count($ids) < $poolTarget) {
            $log('Keşif: Arama sorguları (Türkiye pazarı, çoklu sayfa)...');
            foreach ($this->discoverFromSearchQueries($log) as $id) {
                if ($addOne($id)) {
                    return $ids;
                }
            }
        }

        return $ids;
    }

    /**
     * @return \Generator<string>
     */
    private function discoverFromBrowse(callable $log, int $maxYields): \Generator
    {
        $market = $this->spotify->market();
        $locale = config('services.spotify.locale', 'tr_TR');
        $localSeen = [];
        $n = 0;

        $categoryLimit = min(50, (int) config('services.spotify.import_max_categories', 30));
        $data = $this->spotify->getJson('browse/categories', [
            'country' => $market,
            'locale' => $locale,
            'limit' => $categoryLimit,
            'offset' => 0,
        ]);

        $categories = $data['categories']['items'] ?? [];
        $playlistsPerCat = (int) config('services.spotify.import_playlists_per_category', 5);

        foreach ($categories as $cat) {
            if ($n >= $maxYields) {
                break;
            }
            $cid = $cat['id'] ?? null;
            if (! $cid) {
                continue;
            }

            $pData = $this->spotify->getJson("browse/categories/{$cid}/playlists", [
                'country' => $market,
                'limit' => min(50, $playlistsPerCat),
                'offset' => 0,
            ]);
            $playlists = $pData['playlists']['items'] ?? [];

            foreach (array_slice($playlists, 0, $playlistsPerCat) as $pl) {
                if ($n >= $maxYields) {
                    break 2;
                }
                $pid = $pl['id'] ?? null;
                if (! $pid) {
                    continue;
                }
                foreach ($this->spotify->paginatePlaylistArtistIds((string) $pid) as $aid) {
                    if ($n >= $maxYields) {
                        break 3;
                    }
                    if (isset($localSeen[$aid])) {
                        continue;
                    }
                    $localSeen[$aid] = true;
                    $n++;
                    yield $aid;
                }
            }
        }

        $log("Browse aşamasında {$n} benzersiz sanatçı ID üretildi.");
    }

    /**
     * @return \Generator<string>
     */
    private function discoverFromSearchQueries(callable $log): \Generator
    {
        $localSeen = [];
        $n = 0;

        foreach ($this->searchQueries() as $q) {
            $offset = 0;
            while ($offset < 1000) {
                $items = $this->spotify->searchArtists($q, 50, $offset);
                if ($items === []) {
                    break;
                }
                foreach ($items as $item) {
                    $id = $item['id'] ?? null;
                    if (! $id || isset($localSeen[$id])) {
                        continue;
                    }
                    $localSeen[$id] = true;
                    $n++;
                    yield (string) $id;
                }
                $offset += 50;
                if (count($items) < 50) {
                    break;
                }
            }
        }

        $log("Arama aşamasında {$n} benzersiz sanatçı ID üretildi.");
    }

    /**
     * @return list<string>
     */
    private function searchQueries(): array
    {
        return array_values(array_unique([
            'turkish pop', 'turkish rock', 'turkish folk', 'turkish metal', 'turkish jazz',
            'turkish hip hop', 'turkish electronic', 'turkish blues', 'turkish classical',
            'türkçe pop', 'türkçe rock', 'türkü', 'arabesk', 'fantezi', 'anatolian rock',
            'istanbul indie', 'ankara rock', 'izmir', 'karadeniz', 'turkish singer-songwriter',
            'turkish alternative', 'turkish r&b', 'turkish trap', 'turkish reggae',
            'genre:pop', 'genre:rock', 'genre:hip-hop', 'genre:latin', 'genre:metal',
            'genre:indie', 'genre:jazz', 'genre:electronic', 'genre:folk',
            'genre:country', 'genre:r-n-b', 'genre:reggaeton', 'genre:k-pop',
            'a', 'e', 'i', 'k', 'm', 'n', 'o', 'r', 's', 't', 'u', 'y', 'z',
            'al', 'an', 'ar', 'as', 'ay', 'ba', 'be', 'bu', 'ca', 'ce', 'da', 'de',
            'el', 'em', 'en', 'er', 'es', 'ev', 'fa', 'fi', 'fu', 'ga', 'ge', 'gi',
            'ha', 'he', 'il', 'in', 'is', 'ka', 'ke', 'ki', 'ko', 'ku', 'la', 'le',
            'li', 'lu', 'ma', 'me', 'mi', 'mu', 'na', 'ne', 'ni', 'no', 'nu',
            'pa', 'pe', 'pi', 'po', 'pu', 'ra', 're', 'ri', 'ro', 'ru', 'sa', 'se',
            'si', 'so', 'su', 'ta', 'te', 'ti', 'to', 'tu', 'va', 've', 'vi',
            'vo', 'vu', 'ya', 'ye', 'yi', 'yo', 'yu', 'za', 'ze', 'zi', 'zo', 'zu',
        ]));
    }
}
