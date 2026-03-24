<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Wikidata SPARQL — Türkiye ile ilişkili öğeler için Spotify sanatçı ID (P2207), isteğe bağlı görsel (P18).
 *
 * @see https://www.wikidata.org/wiki/Property:P2207
 */
class WikidataSparqlClient
{
    /**
     * Türkiye (Q43) ile çoklu ilişki yolları + etiket dili kısıtı olmadan daha fazla sonuç; OFFSET ile sayfalama.
     *
     * @return list<array{spotify_id: string, label: string, image: string|null, label_lang: string}>
     */
    public function collectTurkishSpotifyArtists(int $maxTotal): array
    {
        $maxTotal = max(1, min(10000, $maxTotal));
        $pageSize = min(500, $maxTotal);
        $offset = 0;
        /** @var array<string, array{spotify_id: string, label: string, image: string|null, label_lang: string}> */
        $byId = [];

        while (count($byId) < $maxTotal) {
            $need = $maxTotal - count($byId);
            $limit = min($pageSize, $need);
            $batch = $this->turkishArtistsPage($limit, $offset);
            if ($batch === []) {
                break;
            }
            foreach ($batch as $row) {
                $sid = $row['spotify_id'];
                if (! isset($byId[$sid])) {
                    $byId[$sid] = $row;
                    if (count($byId) >= $maxTotal) {
                        break 2;
                    }

                    continue;
                }
                if ($this->labelPreferenceRank($row['label_lang']) > $this->labelPreferenceRank($byId[$sid]['label_lang'])) {
                    $byId[$sid]['label'] = $row['label'];
                    $byId[$sid]['label_lang'] = $row['label_lang'];
                }
                if ($byId[$sid]['image'] === null && ($row['image'] ?? null) !== null) {
                    $byId[$sid]['image'] = $row['image'];
                }
            }
            if (count($batch) < $limit) {
                break;
            }
            $offset += $pageSize;
            if ($offset > 50000) {
                break;
            }
        }

        return array_values($byId);
    }

    private function labelPreferenceRank(string $lang): int
    {
        return match (strtolower($lang)) {
            'tr' => 5,
            'en' => 4,
            'de', 'fr', 'es', 'it' => 3,
            'mul' => 2,
            default => $lang !== '' ? 1 : 0,
        };
    }

    /**
     * @return list<array{spotify_id: string, label: string, image: string|null, label_lang: string}>
     */
    private function turkishArtistsPage(int $limit, int $offset): array
    {
        $limit = max(1, min(500, $limit));
        $offset = max(0, $offset);

        $sparql = <<<SPARQL
SELECT DISTINCT ?spotifyId ?itemLabel ?image ?labelLang WHERE {
  ?item wdt:P2207 ?spotifyId .
  ?item rdfs:label ?itemLabel .
  BIND(LANG(?itemLabel) AS ?labelLang)
  OPTIONAL { ?item wdt:P18 ?image . }
  {
    ?item wdt:P27 wd:Q43 .
  } UNION {
    ?item wdt:P495 wd:Q43 .
  } UNION {
    ?item wdt:P17 wd:Q43 .
  } UNION {
    ?item wdt:P159 ?hq .
    ?hq wdt:P17 wd:Q43 .
  } UNION {
    ?item wdt:P19 ?loc .
    ?loc wdt:P17 wd:Q43 .
  } UNION {
    ?item wdt:P20 ?loc .
    ?loc wdt:P17 wd:Q43 .
  } UNION {
    ?item wdt:P551 ?loc .
    ?loc wdt:P17 wd:Q43 .
  } UNION {
    ?item wdt:P937 ?loc .
    ?loc wdt:P17 wd:Q43 .
  } UNION {
    ?item wdt:P103 wd:Q256 .
  }
}
LIMIT {$limit}
OFFSET {$offset}
SPARQL;

        return $this->parseBindings($this->runQuery($sparql));
    }

    /**
     * @return array<string, mixed>|null
     */
    private function runQuery(string $sparql): ?array
    {
        $response = Http::timeout(180)
            ->withHeaders([
                'Accept' => 'application/sparql-results+json',
                'User-Agent' => (string) config('services.wikidata.user_agent', 'Sahnebul/1.0 (https://sahnebul.test)'),
            ])
            ->get('https://query.wikidata.org/sparql', [
                'query' => $sparql,
                'format' => 'json',
            ]);

        if (! $response->ok()) {
            return null;
        }

        /** @var array<string, mixed> */
        return $response->json();
    }

    /**
     * @param  array<string, mixed>|null  $json
     * @return list<array{spotify_id: string, label: string, image: string|null, label_lang: string}>
     */
    private function parseBindings(?array $json): array
    {
        if ($json === null) {
            return [];
        }

        $bindings = $json['results']['bindings'] ?? [];
        $out = [];

        foreach ($bindings as $b) {
            if (! is_array($b)) {
                continue;
            }
            $sid = $b['spotifyId']['value'] ?? null;
            $label = $b['itemLabel']['value'] ?? null;
            if (! is_string($sid) || $sid === '' || ! is_string($label) || $label === '') {
                continue;
            }
            $lang = $b['labelLang']['value'] ?? '';
            if (! is_string($lang)) {
                $lang = '';
            }
            $image = null;
            if (isset($b['image']['value']) && is_string($b['image']['value']) && $b['image']['value'] !== '') {
                $image = $this->normalizeCommonsImageUrl($b['image']['value']);
            }
            $out[] = ['spotify_id' => $sid, 'label' => $label, 'image' => $image, 'label_lang' => $lang];
        }

        return $out;
    }

    private function normalizeCommonsImageUrl(string $value): string
    {
        if (str_starts_with($value, 'http://')) {
            return 'https://'.substr($value, 7);
        }

        return $value;
    }
}
