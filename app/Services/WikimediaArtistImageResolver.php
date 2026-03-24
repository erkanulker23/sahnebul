<?php

namespace App\Services;

use App\Support\PersonNameMatch;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Ücretsiz Wikimedia API: Vikipedi küçük resim + Wikidata P18 (Commons dosyası).
 * https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use — uygun kullanım ve User-Agent şart.
 *
 * Arama, aynı addaki sporcu/yabancı mesleklerle karışmayı azaltmak için şarkıcı/sanatçı bağlamı ve
 * Wikidata P106 (meslek) süzmesi kullanır.
 */
class WikimediaArtistImageResolver
{
    /** @var list<string> */
    private const WIKIDATA_MUSIC_OCCUPATION_QIDS = [
        'Q177220', // singer
        'Q639669', // musician
        'Q36834', // composer
        'Q2252262', // rapper
        'Q2643890', // singer-songwriter
        'Q855091', // guitarist
        'Q753702', // classical composer
        'Q2865819', // opera singer
        'Q183945', // record producer
        'Q5741069', // rock musician
        'Q213345', // DJ
    ];

    /** @var list<string> */
    private const WIKIDATA_SPORT_OCCUPATION_QIDS = [
        'Q937857', // association football player
        'Q3665646', // basketball player
        'Q10833314', // tennis player
        'Q13382484', // rugby union player
        'Q41328', // golfer
        'Q1317534', // Olympic athlete
        'Q11513337', // athlete
    ];

    /** Sadece siyasetçi vb. ise müzik yoksa görsel kullanılmaz. */
    private const WIKIDATA_POLITICS_OCCUPATION_QIDS = [
        'Q82955', // politician
        'Q193391', // diplomat
        'Q486839', // member of parliament
    ];

    private function http(): PendingRequest
    {
        return Http::timeout(30)->withHeaders([
            'User-Agent' => config('services.wikidata.user_agent', 'Sahnebul/1.0 (https://sahnebul.com; artist images)'),
        ]);
    }

    /**
     * Sanatçı adı için mümkünse Commons/Vikipedi görsel URL’si (doğrudan indirilebilir).
     *
     * @param  string|null  $countryCode  Örn. TR; müzik odaklı arama ifadelerini güçlendirir.
     */
    public function resolveImageUrl(string $artistName, ?string $countryCode = null): ?string
    {
        $name = trim($artistName);
        if ($name === '') {
            return null;
        }

        foreach (['tr', 'en'] as $lang) {
            $url = $this->resolveFromWikipedia($name, $lang, $countryCode);
            if ($url !== null) {
                return $url;
            }
        }

        foreach ($this->wikidataSearchQueries($name, $countryCode) as $query) {
            $url = $this->wikidataCommonsImageUrlForSearch($query, $name);
            if ($url !== null) {
                return $url;
            }
        }

        return null;
    }

    private function resolveFromWikipedia(string $name, string $lang, ?string $countryCode): ?string
    {
        $exactTitles = $lang === 'tr'
            ? ["{$name} (şarkıcı)", "{$name} (müzisyen)", $name]
            : ["{$name} (singer)", "{$name} (musician)", $name];

        foreach ($exactTitles as $title) {
            $thumb = $this->pageImageForTitle($title, $lang);
            if ($thumb !== null && PersonNameMatch::wikipediaTitleMatchesArtist($title, $name)) {
                return $thumb;
            }
        }

        foreach ($this->wikipediaSearchQueries($name, $lang, $countryCode) as $query) {
            $thumb = $this->wikipediaSearchToImage($query, $lang, $name);
            if ($thumb !== null) {
                return $thumb;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function wikipediaSearchQueries(string $name, string $lang, ?string $countryCode): array
    {
        $cc = strtoupper((string) $countryCode);
        $isTr = $cc === '' || $cc === 'TR';

        if ($lang === 'tr') {
            $queries = [
                "{$name} şarkıcı",
                "{$name} sanatçı",
                "{$name} pop şarkıcısı",
                $isTr ? "{$name} Türk şarkıcısı" : null,
                "{$name} müzisyen",
                $name,
            ];
        } else {
            $queries = [
                "{$name} singer",
                "{$name} musician",
                $isTr ? "{$name} Turkish singer" : null,
                $isTr ? "{$name} Turkish pop singer" : null,
                "{$name} pop singer",
                $name,
            ];
        }

        return array_values(array_unique(array_filter($queries)));
    }

    /**
     * @return list<string>
     */
    private function wikidataSearchQueries(string $name, ?string $countryCode): array
    {
        $cc = strtoupper((string) $countryCode);
        $isTr = $cc === '' || $cc === 'TR';

        $queries = [
            "{$name} şarkıcı",
            "{$name} singer",
            $isTr ? "{$name} Turkish singer" : null,
            "{$name} musician",
            $name,
        ];

        return array_values(array_unique(array_filter($queries)));
    }

    private function wikipediaSearchToImage(string $search, string $lang, string $artistName): ?string
    {
        $response = $this->http()->get("https://{$lang}.wikipedia.org/w/api.php", [
            'action' => 'query',
            'list' => 'search',
            'srsearch' => $search,
            'format' => 'json',
            'srlimit' => 8,
            'srnamespace' => 0,
        ]);

        $results = $response->json()['query']['search'] ?? [];
        if (! is_array($results)) {
            return null;
        }

        foreach ($results as $row) {
            $title = $row['title'] ?? null;
            if (! is_string($title) || $title === '') {
                continue;
            }
            if ($this->wikipediaTitleLikelyWrongPerson($title)) {
                continue;
            }
            if (! PersonNameMatch::wikipediaTitleMatchesArtist($title, $artistName)) {
                continue;
            }
            $thumb = $this->pageImageForTitle($title, $lang);
            if ($thumb !== null) {
                return $thumb;
            }
        }

        return null;
    }

    private function wikipediaTitleLikelyWrongPerson(string $title): bool
    {
        $t = mb_strtolower($title, 'UTF-8');
        $needles = [
            'futbolcu', 'futbol ', 'footballer', 'football team', 'national football',
            'basketbol', 'basketball', 'voleybol', 'volleyball', 'tenis ', 'tennis ',
            'f.c.', ' fc ', 'olympic athlete', 'racing driver',
            'chp ', ' chp', 'halk partisi', 'milletvekili', 'belediye başkan',
        ];
        foreach ($needles as $n) {
            if (str_contains($t, $n)) {
                return true;
            }
        }

        return false;
    }

    private function pageImageForTitle(string $title, string $lang): ?string
    {
        $response = $this->http()->get("https://{$lang}.wikipedia.org/w/api.php", [
            'action' => 'query',
            'titles' => $title,
            'prop' => 'pageimages|pageprops',
            'ppprop' => 'disambiguation',
            'format' => 'json',
            'formatversion' => 2,
            'piprop' => 'thumbnail|original',
            'pithumbsize' => 800,
        ]);

        $pages = $response->json()['query']['pages'] ?? [];
        if (! is_array($pages)) {
            return null;
        }

        foreach ($pages as $page) {
            if (! is_array($page)) {
                continue;
            }
            if (($page['missing'] ?? false) === true) {
                continue;
            }
            if (isset($page['pageid']) && (int) $page['pageid'] < 0) {
                continue;
            }
            if (isset($page['pageprops']['disambiguation'])) {
                continue;
            }

            return $page['thumbnail']['source'] ?? $page['original']['source'] ?? null;
        }

        return null;
    }

    private function wikidataCommonsImageUrlForSearch(string $search, string $artistName): ?string
    {
        $response = $this->http()->get('https://www.wikidata.org/w/api.php', [
            'action' => 'wbsearchentities',
            'search' => $search,
            'language' => 'tr',
            'uselang' => 'tr',
            'limit' => 12,
            'format' => 'json',
            'type' => 'item',
        ]);

        $searchHits = $response->json()['search'] ?? [];
        if (! is_array($searchHits)) {
            return null;
        }

        foreach ($searchHits as $hit) {
            $id = $hit['id'] ?? null;
            if (! is_string($id) || ! str_starts_with($id, 'Q')) {
                continue;
            }
            $label = is_string($hit['label'] ?? null) ? $hit['label'] : '';
            $description = isset($hit['description']) && is_string($hit['description']) ? $hit['description'] : null;
            if (! PersonNameMatch::wikidataHitMatchesArtist($label, $description, $artistName)) {
                continue;
            }
            $fileName = $this->wikidataP18IfArtistEligible($id);
            if ($fileName !== null) {
                return $this->commonsFilePathUrl($fileName);
            }
        }

        return null;
    }

    private function wikidataP18IfArtistEligible(string $entityId): ?string
    {
        $response = $this->http()->get('https://www.wikidata.org/w/api.php', [
            'action' => 'wbgetentities',
            'ids' => $entityId,
            'props' => 'claims',
            'format' => 'json',
        ]);

        $entity = $response->json()['entities'][$entityId] ?? null;
        if (! is_array($entity)) {
            return null;
        }

        if (! $this->wikidataOccupationsAllowPerformerImage($entity)) {
            return null;
        }

        $claims = $entity['claims']['P18'] ?? [];
        if (! is_array($claims) || $claims === []) {
            return null;
        }
        $first = $claims[0] ?? null;
        $val = $first['mainsnak']['datavalue']['value'] ?? null;

        return is_string($val) && $val !== '' ? $val : null;
    }

    /**
     * @param  array<string, mixed>  $entity
     */
    private function wikidataOccupationsAllowPerformerImage(array $entity): bool
    {
        $claims = $entity['claims']['P106'] ?? [];
        if (! is_array($claims) || $claims === []) {
            return true;
        }

        $occupationQids = [];
        foreach ($claims as $claim) {
            if (! is_array($claim)) {
                continue;
            }
            $snak = $claim['mainsnak'] ?? null;
            if (! is_array($snak) || ($snak['datatype'] ?? '') !== 'wikibase-item') {
                continue;
            }
            $id = $snak['datavalue']['value']['id'] ?? null;
            if (is_string($id) && str_starts_with($id, 'Q')) {
                $occupationQids[] = $id;
            }
        }

        if ($occupationQids === []) {
            return true;
        }

        $music = array_intersect($occupationQids, self::WIKIDATA_MUSIC_OCCUPATION_QIDS);
        $sport = array_intersect($occupationQids, self::WIKIDATA_SPORT_OCCUPATION_QIDS);
        $politics = array_intersect($occupationQids, self::WIKIDATA_POLITICS_OCCUPATION_QIDS);

        if ($sport !== [] && $music === []) {
            return false;
        }

        if ($politics !== [] && $music === []) {
            return false;
        }

        return true;
    }

    private function commonsFilePathUrl(string $fileName): string
    {
        $normalized = str_replace(' ', '_', $fileName);

        return 'https://commons.wikimedia.org/wiki/Special:FilePath/'.rawurlencode($normalized);
    }
}
