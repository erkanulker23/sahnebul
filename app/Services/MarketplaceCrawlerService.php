<?php

namespace App\Services;

use App\Models\City;
use App\Support\BubiletCrawlerCookiesPath;
use App\Support\CrawlerHttpResponseInspector;
use App\Support\NetscapeCookieFileReader;
use App\Support\SehirSecCityDistricts;
use App\Support\SehirSecMetaInference;
use DOMElement;
use DOMXPath;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class MarketplaceCrawlerService
{
    /**
     * @param  array{bubilet_city_slugs?: list<string>}  $options
     * @return list<array<string, mixed>>
     */
    public function crawl(string $source, array $options = []): array
    {
        $sourceConfig = config("crawler.sources.{$source}");
        if (! is_array($sourceConfig) || empty($sourceConfig['url'])) {
            throw new RuntimeException("Crawler source not configured: {$source}");
        }

        if ($source === 'bubilet') {
            $slugs = isset($options['bubilet_city_slugs']) && is_array($options['bubilet_city_slugs'])
                ? array_values(array_filter(array_map('strval', $options['bubilet_city_slugs'])))
                : [];

            $q = $this->collectBubiletDetailQueue($sourceConfig, $slugs);

            return $this->fetchBubiletDetailRowsBatch($sourceConfig, $q);
        }

        if ($source === 'bubilet_sehir_sec') {
            return $this->crawlBubiletSehirSecPage($sourceConfig);
        }

        if ($source === 'biletinial') {
            $q = $this->collectBiletinialDetailQueue($sourceConfig);

            return $this->fetchBiletinialDetailRowsBatch($sourceConfig, $q, 0);
        }

        if ($source === 'biletsirasi') {
            $q = $this->collectBiletsirasiDetailQueue($sourceConfig);

            return $this->fetchBiletsirasiDetailRowsBatch($sourceConfig, $q, 0);
        }

        if ($source === 'biletix') {
            return $this->crawlBiletixPagedListing($sourceConfig);
        }

        $html = Http::timeout((int) config('crawler.timeout', 20))
            ->withHeaders(['User-Agent' => (string) config('crawler.user_agent')])
            ->get((string) $sourceConfig['url'])
            ->throw()
            ->body();

        $events = $this->extractJsonLdEvents($html);
        if (empty($events)) {
            $events = [];
        }
        $normalized = [];

        foreach ($events as $event) {
            $row = $this->normalizeSchemaOrgEventRow($event, $sourceConfig);
            if ($row !== null) {
                $normalized[] = $row;
            }
        }

        return $normalized;
    }

    public function supportsChunkedDetailCrawl(string $source): bool
    {
        return $source === 'bubilet' || $source === 'biletinial' || $source === 'biletsirasi';
    }

    /**
     * @param  array{bubilet_city_slugs?: list<string>}  $options
     * @return list<array{path: string, listing_url: string}>
     */
    public function collectDetailPathQueue(string $source, array $options = []): array
    {
        $sourceConfig = config("crawler.sources.{$source}");
        if (! is_array($sourceConfig)) {
            return [];
        }
        if ($source === 'bubilet') {
            $slugs = isset($options['bubilet_city_slugs']) && is_array($options['bubilet_city_slugs'])
                ? array_values(array_filter(array_map('strval', $options['bubilet_city_slugs'])))
                : [];

            return $this->collectBubiletDetailQueue($sourceConfig, $slugs);
        }
        if ($source === 'biletinial') {
            return $this->collectBiletinialDetailQueue($sourceConfig);
        }
        if ($source === 'biletsirasi') {
            return $this->collectBiletsirasiDetailQueue($sourceConfig);
        }

        return [];
    }

    /**
     * @param  array{bubilet_city_slugs?: list<string>}  $options
     * @param  list<array{path: string, listing_url: string}>  $batch
     * @return list<array<string, mixed>>
     */
    public function fetchDetailRowsBatch(string $source, array $options, array $batch, int $globalPathOffset = 0): array
    {
        $sourceConfig = config("crawler.sources.{$source}");
        if (! is_array($sourceConfig) || $batch === []) {
            return [];
        }
        if ($source === 'bubilet') {
            return $this->fetchBubiletDetailRowsBatch($sourceConfig, $batch);
        }
        if ($source === 'biletinial') {
            return $this->fetchBiletinialDetailRowsBatch($sourceConfig, $batch, $globalPathOffset);
        }
        if ($source === 'biletsirasi') {
            return $this->fetchBiletsirasiDetailRowsBatch($sourceConfig, $batch, $globalPathOffset);
        }

        return [];
    }

    /**
     * @param  array<string, mixed>  $sourceConfig
     * @param  list<string>  $citySlugs
     * @return list<array{path: string, listing_url: string}>
     */
    private function collectBubiletDetailQueue(array $sourceConfig, array $citySlugs = []): array
    {
        $listingUrls = $this->bubiletListingUrlsForCitySlugs($sourceConfig, $citySlugs);

        /** @var array<string, list<string>> $pathsByListingUrl */
        $pathsByListingUrl = [];
        $delayListingUs = max(0, (int) config('crawler.bubilet_listing_delay_us', 200_000));

        foreach ($listingUrls as $idx => $listingUrl) {
            if ($idx > 0 && $delayListingUs > 0) {
                usleep($delayListingUs);
            }
            $html = $this->bubiletGet($listingUrl);
            $paths = array_values(array_unique($this->extractBubiletEventPathsFromListingHtml($html)));
            if ($paths !== []) {
                $pathsByListingUrl[$listingUrl] = $paths;
            }
        }

        $detailCap = max(20, min(2000, (int) config('crawler.bubilet_max_detail_pages', 400)));

        return $this->mergeUniquePathsRoundRobinFromListings($pathsByListingUrl, $detailCap);
    }

    /**
     * @param  array<string, mixed>  $sourceConfig
     * @param  list<array{path: string, listing_url: string}>  $merged
     * @return list<array<string, mixed>>
     */
    private function fetchBubiletDetailRowsBatch(array $sourceConfig, array $merged): array
    {
        $normalized = [];
        $base = 'https://www.bubilet.com.tr';

        foreach ($merged as $i => $item) {
            $path = $item['path'];
            $listingUrl = $item['listing_url'];
            if ($i > 0) {
                usleep(150000);
            }
            $url = $this->normalizeUrl($path, $base);
            $listingRef = $listingUrl !== '' ? $listingUrl : null;
            try {
                $detailHtml = $this->bubiletGet($url, $listingRef);
            } catch (\Throwable) {
                continue;
            }

            $ldEvents = $this->extractJsonLdEvents($detailHtml);
            foreach ($ldEvents as $event) {
                if (! $this->schemaOrgLdRepresentsEvent($event['@type'] ?? null)) {
                    continue;
                }
                $event['url'] = $url;
                $row = $this->normalizeSchemaOrgEventRow($event, array_merge($sourceConfig, [
                    'city' => $this->bubiletFallbackCityNameFromListingUrl($listingUrl, $sourceConfig),
                ]));
                if ($row !== null) {
                    $meta = is_array($row['meta'] ?? null) ? $row['meta'] : [];
                    if ($listingUrl !== '') {
                        $meta['bubilet_listing_url'] = $listingUrl;
                    }
                    $row['meta'] = $meta;
                    $fromListing = $this->categoryNameFromBubiletListingUrl($listingUrl);
                    if ($fromListing !== null) {
                        $row['category_name'] = $fromListing;
                    }
                    $normalized[] = $row;
                }
                break;
            }
        }

        return $normalized;
    }

    /**
     * Liste URL'leri sırayla birleştirilip detay kotası ilk sayfalarla (ör. yalnızca konser) doldurulmasın diye
     * her kaynaktan sırayla bir yol alınarak birleştirilir.
     *
     * @param  array<string, list<string>>  $pathsByListingUrl
     * @return list<array{path: string, listing_url: string}>
     */
    private function mergeUniquePathsRoundRobinFromListings(array $pathsByListingUrl, int $maxTotal): array
    {
        $queues = [];
        foreach ($pathsByListingUrl as $listingUrl => $paths) {
            $listingUrl = (string) $listingUrl;
            if ($listingUrl === '' || ! is_array($paths) || $paths === []) {
                continue;
            }
            $queues[$listingUrl] = array_values(array_filter(array_map('strval', $paths), static fn (string $p): bool => $p !== ''));
        }
        if ($queues === []) {
            return [];
        }

        $out = [];
        $seen = [];
        $maxTotal = max(0, $maxTotal);

        while (count($out) < $maxTotal) {
            $progress = false;
            foreach ($queues as $listingUrl => &$q) {
                while ($q !== []) {
                    $path = array_shift($q);
                    if (isset($seen[$path])) {
                        continue;
                    }
                    $seen[$path] = true;
                    $out[] = ['path' => $path, 'listing_url' => $listingUrl];
                    $progress = true;
                    break;
                }
            }
            unset($q);
            if (! $progress) {
                break;
            }
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $sourceConfig
     * @param  list<string>  $citySlugs
     * @return list<string>
     */
    private function bubiletListingUrlsForCitySlugs(array $sourceConfig, array $citySlugs): array
    {
        $slugs = [];
        foreach ($citySlugs as $s) {
            $t = strtolower(trim((string) $s));
            if ($t !== '') {
                $slugs[] = $t;
            }
        }
        $slugs = array_values(array_unique($slugs));
        if ($slugs === []) {
            $def = (string) ($sourceConfig['default_city_slug'] ?? 'istanbul');
            $def = strtolower(trim($def));
            $slugs = [$def !== '' ? $def : 'istanbul'];
        }

        $tags = $sourceConfig['listing_tags'] ?? null;
        if (is_array($tags) && $tags !== []) {
            $base = 'https://www.bubilet.com.tr';
            $out = [];
            foreach ($slugs as $cs) {
                foreach ($tags as $tag) {
                    $tag = strtolower(trim((string) $tag));
                    if ($tag === '') {
                        continue;
                    }
                    $out[] = "{$base}/{$cs}/etiket/{$tag}";
                }
            }

            return array_values(array_unique($out));
        }

        $listingUrls = $sourceConfig['listing_urls'] ?? null;
        if (! is_array($listingUrls) || $listingUrls === []) {
            $listingUrls = [(string) $sourceConfig['url']];
        }
        $listingUrls = array_values(array_unique(array_filter(array_map('strval', $listingUrls))));
        $out = [];
        foreach ($listingUrls as $u) {
            if (preg_match('#^https://www\.bubilet\.com\.tr/([^/]+)/etiket/([^/?]+)#i', $u, $m)) {
                $tag = strtolower($m[2]);
                foreach ($slugs as $cs) {
                    $out[] = "https://www.bubilet.com.tr/{$cs}/etiket/{$tag}";
                }
            } else {
                $out[] = $u;
            }
        }

        return array_values(array_unique($out));
    }

    /**
     * @param  array<string, mixed>  $sourceConfig
     */
    private function bubiletFallbackCityNameFromListingUrl(string $listingUrl, array $sourceConfig): string
    {
        if (preg_match('#https://www\.bubilet\.com\.tr/([^/]+)/etiket/#i', $listingUrl, $m)) {
            $slug = strtolower($m[1]);
            $name = City::query()->where('slug', $slug)->value('name');
            if (is_string($name) && $name !== '') {
                return $name;
            }

            return Str::title(str_replace('-', ' ', $slug));
        }

        $fallback = $sourceConfig['city'] ?? null;

        return is_string($fallback) && $fallback !== '' ? $fallback : 'İstanbul';
    }

    /**
     * Liste URL'sindeki /etiket/{slug} parçasından kategori — JSON-LD çoğu zaman `eventAttendanceMode`
     * ile hep «Müzik»e düşüyordu; gerçek tür (tiyatro, stand-up vb.) etiketten gelir.
     */
    private function categoryNameFromBubiletListingUrl(string $listingUrl): ?string
    {
        if ($listingUrl === '') {
            return null;
        }
        if (preg_match('~\/etiket\/([^\/?#]+)~iu', $listingUrl, $m)) {
            return $this->categoryNameFromBubiletListingTag(rawurldecode($m[1]));
        }

        return null;
    }

    private function categoryNameFromBubiletListingTag(string $tagSlug): string
    {
        $t = mb_strtolower(str_replace(['-', '_', ' '], '', $tagSlug), 'UTF-8');

        return match (true) {
            str_contains($t, 'konser') => 'Müzik',
            str_contains($t, 'tiyatro') => 'Tiyatro',
            str_contains($t, 'muzikal') => 'Müzikal',
            str_contains($t, 'festival') => 'Festival',
            str_contains($t, 'elektronik') => 'Elektronik müzik',
            str_contains($t, 'standup') => 'Stand-up',
            str_contains($t, 'stand') && str_contains($t, 'up') => 'Stand-up',
            str_contains($t, 'cocuk') => 'Çocuk',
            str_contains($t, 'workshop') => 'Workshop',
            str_contains($t, 'spor') => 'Spor',
            str_contains($t, 'sergi') => 'Sergi',
            default => $this->normalizeCategoryName($tagSlug),
        };
    }

    /**
     * Bubilet /sehir-sec sayfasındaki şehir bölümlerinden popüler etkinlik kartlarını çıkarır.
     *
     * @param  array<string, mixed>  $sourceConfig
     * @return list<array<string, mixed>>
     */
    private function crawlBubiletSehirSecPage(array $sourceConfig): array
    {
        $listingUrl = (string) ($sourceConfig['url'] ?? 'https://www.bubilet.com.tr/sehir-sec');
        $html = $this->bubiletGet($listingUrl, null, (int) config('crawler.timeout', 30));

        $dom = new \DOMDocument;
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="UTF-8">'.$html);
        libxml_clear_errors();

        $xpath = new DOMXPath($dom);
        /** @var \DOMNodeList $anchors */
        $anchors = $xpath->query('//a[contains(@href, "/etkinlik/")]');
        $rows = [];
        $base = 'https://www.bubilet.com.tr';

        foreach ($anchors as $anchor) {
            if (! $anchor instanceof DOMElement) {
                continue;
            }

            $href = html_entity_decode($anchor->getAttribute('href'), ENT_QUOTES | ENT_HTML5);
            if ($href === '' || ! str_contains($href, '/etkinlik/')) {
                continue;
            }

            if (! preg_match('#^/([a-z0-9_-]+)/etkinlik/([a-z0-9_-]+)#u', $href, $hm)) {
                continue;
            }

            $citySlug = $hm[1];
            $externalUrl = $this->normalizeUrl($href, $base);

            $title = '';
            foreach ($anchor->getElementsByTagName('h3') as $h3) {
                $title = Str::of($h3->textContent)->replaceMatches('/\s+/', ' ')->trim()->toString();
                break;
            }

            if ($title === '') {
                continue;
            }

            $ps = [];
            foreach ($anchor->getElementsByTagName('p') as $p) {
                $t = Str::of($p->textContent)->replaceMatches('/\s+/', ' ')->trim()->toString();
                if ($t !== '') {
                    $ps[] = $t;
                }
            }

            $datesLine = $ps[0] ?? '';
            $venueLine = $ps[1] ?? '';

            $imgUrl = null;
            foreach ($anchor->getElementsByTagName('img') as $img) {
                if (! $img instanceof DOMElement) {
                    continue;
                }
                $src = html_entity_decode($img->getAttribute('src'), ENT_QUOTES | ENT_HTML5);
                if ($src !== '') {
                    $imgUrl = $this->normalizeUrl($src, $base);
                    break;
                }
            }

            $priceLabel = null;
            $priceInner = $xpath->query(".//*[contains(@class, 'text-emerald-400') and contains(@class, 'font-bold')]", $anchor);
            if ($priceInner->length > 0 && $priceInner->item(0) instanceof DOMElement) {
                $priceLabel = Str::of($priceInner->item(0)->textContent)->replaceMatches('/\s+/', ' ')->trim()->toString();
            }

            $rank = null;
            $aria = $anchor->getAttribute('aria-label');
            if (preg_match('/number\s+(\d+)/iu', $aria, $rm)) {
                $rank = (int) $rm[1];
            }

            $cityName = $this->bubiletCityNameFromSlug($citySlug);
            $start = $this->firstDateFromTurkishDatesLine($datesLine);
            $venueForMeta = $venueLine !== '' ? $venueLine : null;
            $districtSlug = SehirSecCityDistricts::matchSlugFromVenueLine($venueForMeta, $citySlug);
            $artist = SehirSecMetaInference::artistTypeFromTitle($title);

            $rows[] = [
                'title' => $title,
                'external_url' => $externalUrl,
                'image_url' => $imgUrl,
                'venue_name' => $venueForMeta,
                'city_name' => $cityName,
                'category_name' => $this->inferBubiletSehirSecCategory($title),
                'start_date' => $start?->toDateTimeString(),
                'description' => null,
                'meta' => [
                    'city_slug' => $citySlug,
                    'dates_line' => $datesLine !== '' ? $datesLine : null,
                    'price_label' => $priceLabel,
                    'rank' => $rank,
                    'source_page' => $listingUrl,
                    'district_slug' => $districtSlug,
                    'district_label' => $districtSlug !== null
                        ? SehirSecCityDistricts::labelForSlug($citySlug, $districtSlug)
                        : null,
                    'artist_type_slug' => $artist['slug'],
                    'artist_type_label' => $artist['label'],
                ],
            ];
        }

        return $rows;
    }

    private function bubiletGet(string $url, ?string $referer = null, ?int $timeoutOverride = null): string
    {
        $timeout = $timeoutOverride ?? (int) config('crawler.timeout', 20);
        $response = $this->bubiletHttpClient($timeout, $referer)->get($url);

        $body = $response->body();

        if (CrawlerHttpResponseInspector::looksLikeCloudflareChallenge($body)) {
            throw new RuntimeException(
                CrawlerHttpResponseInspector::cloudflareBlockedMessage($this->bubiletCookieHeaderString())
            );
        }

        if (! $response->successful()) {
            $snippet = Str::limit(trim(strip_tags($body)), 200, '…');
            if ($snippet === '') {
                $snippet = 'Yanıt özeti yok.';
            }

            throw new RuntimeException('HTTP '.$response->status().': '.$snippet);
        }

        return $body;
    }

    private function bubiletHttpClient(int $timeout, ?string $referer): PendingRequest
    {
        $request = Http::timeout($timeout)
            ->withHeaders($this->bubiletRequestHeaders($referer));

        $proxy = trim((string) config('crawler.bubilet_http_proxy', ''));
        if ($proxy !== '') {
            $request = $request->withOptions(['proxy' => $proxy]);
        }

        return $request;
    }

    /**
     * @return array<string, string>
     */
    private function bubiletRequestHeaders(?string $refererOverride): array
    {
        $ua = trim((string) config('crawler.bubilet_user_agent', ''));
        if ($ua === '') {
            $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
        }

        $referer = $refererOverride;
        if ($referer === null || $referer === '') {
            $referer = trim((string) config('crawler.bubilet_referer', 'https://www.bubilet.com.tr/'));
        }

        $headers = [
            'User-Agent' => $ua,
            'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language' => 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control' => 'no-cache',
            'Pragma' => 'no-cache',
            'Sec-Ch-Ua' => '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
            'Sec-Ch-Ua-Mobile' => '?0',
            'Sec-Ch-Ua-Platform' => '"Windows"',
            'Sec-Fetch-Dest' => 'document',
            'Sec-Fetch-Mode' => 'navigate',
            'Sec-Fetch-User' => '?1',
            'Upgrade-Insecure-Requests' => '1',
        ];

        if ($referer !== '') {
            $headers['Referer'] = $referer;
        }

        $headers['Sec-Fetch-Site'] = ($refererOverride !== null && $refererOverride !== '')
            ? 'same-origin'
            : 'none';

        $cookieHeader = $this->bubiletCookieHeaderString();
        if ($cookieHeader !== '') {
            $headers['Cookie'] = $cookieHeader;
        }

        return $headers;
    }

    private function bubiletCookieHeaderString(): string
    {
        $pairs = [];
        $resolved = BubiletCrawlerCookiesPath::resolve();
        if ($resolved !== null) {
            $pairs = NetscapeCookieFileReader::bubiletPairsFromNetscapeFile($resolved);
        }

        $envRaw = trim((string) config('crawler.bubilet_cookies', ''));
        foreach (NetscapeCookieFileReader::pairsFromSemicolonString($envRaw) as $k => $v) {
            $pairs[$k] = $v;
        }

        return NetscapeCookieFileReader::cookieHeaderFromPairs($pairs);
    }

    /**
     * Bubilet /sehir-sec kartlarında ayrı kategori alanı olmadığı için başlıktan kabaca sınıflandırma.
     */
    private function inferBubiletSehirSecCategory(string $title): string
    {
        $t = mb_strtolower($title, 'UTF-8');
        if (str_contains($t, 'globetrotters') || str_contains($t, 'futbol') || str_contains($t, 'basketbol') || str_contains($t, 'voleybol') || preg_match('/\bderbi\b|\bmaçı\b|\bgalatasaray\b|\bfenerbahçe\b|\bbeşiktaş\b/u', $t)) {
            return 'Spor';
        }
        if (str_contains($t, 'tiyatro') || str_contains($t, 'dramı') || str_contains($t, ' oyunu') || str_contains($t, 'sahne')) {
            return 'Tiyatro';
        }
        if (str_contains($t, 'festival')) {
            return 'Festival';
        }
        if (str_contains($t, 'stand up') || str_contains($t, 'stand-up') || str_contains($t, 'komedi gecesi')) {
            return 'Stand-up';
        }
        if (str_contains($t, 'sergi') || str_contains($t, 'müze')) {
            return 'Sergi';
        }
        if (str_contains($t, 'sinema') || str_contains($t, 'film gösterimi')) {
            return 'Sinema';
        }
        if (preg_match('/tolgshow|güldür|çok güzel hareketler|hayrettin|ilker ayrik|şehriban|memleket kahkahası|kaos night|zengin mutfağı|gerçekler acıdır|burda olan burda kalır/u', $t)) {
            return 'Gösteri';
        }
        if (str_contains($t, 'symphony') || (str_contains($t, 'potter') && str_contains($t, 'concert'))) {
            return 'Müzik';
        }
        if (str_contains($t, 'candle') && str_contains($t, 'echo')) {
            return 'Müzik';
        }
        if (str_contains($t, 'konser') || str_contains($t, 'canlı müzik') || str_contains($t, 'live')) {
            return 'Konser';
        }

        return 'Etkinlik';
    }

    private function bubiletCityNameFromSlug(string $slug): string
    {
        $slug = mb_strtolower($slug, 'UTF-8');

        return match ($slug) {
            'istanbul' => 'İstanbul',
            'ankara' => 'Ankara',
            'izmir' => 'İzmir',
            'antalya' => 'Antalya',
            'bursa' => 'Bursa',
            'eskisehir' => 'Eskişehir',
            default => Str::title(str_replace('-', ' ', $slug)),
        };
    }

    private function firstDateFromTurkishDatesLine(?string $line): ?Carbon
    {
        if ($line === null || trim($line) === '') {
            return null;
        }

        $months = [
            'ocak' => 'January',
            'şubat' => 'February',
            'mart' => 'March',
            'nisan' => 'April',
            'mayıs' => 'May',
            'haziran' => 'June',
            'temmuz' => 'July',
            'ağustos' => 'August',
            'eylül' => 'September',
            'ekim' => 'October',
            'kasım' => 'November',
            'aralık' => 'December',
        ];

        if (preg_match('/(\d{1,2})\s+([^\d,]+?)\s+(\d{4})/u', $line, $m)) {
            $day = $m[1];
            $monTr = mb_strtolower(trim($m[2]), 'UTF-8');
            $year = $m[3];
            $monEn = $months[$monTr] ?? null;
            if ($monEn !== null) {
                try {
                    return Carbon::parse("{$day} {$monEn} {$year}");
                } catch (\Throwable) {
                    return null;
                }
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function schemaOrgCategoryRaw(array $event): string
    {
        $keywords = Arr::get($event, 'keywords');
        if (is_string($keywords) && trim($keywords) !== '') {
            return trim($keywords);
        }
        if (is_array($keywords) && $keywords !== []) {
            $first = $keywords[0] ?? null;
            if (is_string($first) && trim($first) !== '') {
                return trim($first);
            }
            if (is_array($first)) {
                $n = $first['name'] ?? $first['@value'] ?? null;
                if (is_string($n) && trim($n) !== '') {
                    return trim($n);
                }
            }
        }

        $mode = Arr::get($event, 'eventAttendanceMode');
        if (is_string($mode) && trim($mode) !== '') {
            $lower = strtolower($mode);
            if (! str_contains($lower, 'schema.org')) {
                return trim($mode);
            }
        }

        return 'Müzik';
    }

    /**
     * @param  array<string, mixed>  $sourceConfig
     * @return array<string, mixed>|null
     */
    private function normalizeSchemaOrgEventRow(array $event, array $sourceConfig): ?array
    {
        $name = (string) ($event['name'] ?? '');
        if ($name === '') {
            return null;
        }

        $startDate = $this->parseDate(Arr::get($event, 'startDate'));
        $venueName = (string) (Arr::get($event, 'location.name') ?? '');
        $cityName = (string) (Arr::get($event, 'location.address.addressLocality') ?? $sourceConfig['city'] ?? 'İstanbul');
        $categoryRaw = $this->schemaOrgCategoryRaw($event);

        return [
            'title' => $name,
            'external_url' => (string) ($event['url'] ?? ''),
            'image_url' => is_array($event['image'] ?? null) ? (string) ($event['image'][0] ?? '') : (string) ($event['image'] ?? ''),
            'venue_name' => $venueName,
            'city_name' => $cityName,
            'category_name' => $this->normalizeCategoryName($categoryRaw),
            'start_date' => $startDate?->toDateTimeString(),
            'description' => (string) ($event['description'] ?? ''),
            'meta' => ['raw' => $event],
        ];
    }

    /**
     * @return list<string>
     */
    private function extractBubiletEventPathsFromListingHtml(string $html): array
    {
        $paths = [];
        $patterns = [
            '#href\s*=\s*(["\'])(/[^"\']+/etkinlik/[^"\']+)\1#u',
            '#href\s*=\s*(["\'])(https://www\.bubilet\.com\.tr/[^"\']+/etkinlik/[^"\']+)\1#iu',
        ];
        foreach ($patterns as $pattern) {
            if (! preg_match_all($pattern, $html, $matches)) {
                continue;
            }
            foreach ($matches[2] as $raw) {
                $path = html_entity_decode($raw, ENT_QUOTES | ENT_HTML5);
                if (preg_match('~^https://www\.bubilet\.com\.tr(/[^?\s#]*)~iu', $path, $m)) {
                    $path = $m[1];
                }
                if (str_contains($path, '/etkinlik/')) {
                    $paths[] = $path;
                }
            }
        }

        return array_values(array_unique($paths));
    }

    private function extractBiletixEvents(string $html): array
    {
        $items = [];
        preg_match_all('/<div[^>]*class="htevent"[^>]*>.*?<div class="clear"><\/div>\s*<\/div>/is', $html, $blocks);

        foreach (($blocks[0] ?? []) as $block) {
            preg_match('/itemprop="startDate"\s+content="([^"]*)"/i', $block, $dateMatch);
            preg_match('/itemprop="url"[^>]*href="([^"]+)"/i', $block, $urlMatch);
            preg_match('/itemprop="url"[^>]*>\\s*([^<]+)\\s*<\/a>/i', $block, $titleMatch);
            preg_match('/itemprop="addressLocality"[^>]*>([^<]+)</i', $block, $cityMatch);
            preg_match('/itemprop="name"[^>]*>([^<]+)</i', $block, $venueMatch);

            $title = trim(html_entity_decode($titleMatch[1] ?? '', ENT_QUOTES | ENT_HTML5));
            if ($title === '') {
                continue;
            }

            $items[] = [
                'name' => $title,
                'startDate' => trim($dateMatch[1] ?? ''),
                'url' => $this->normalizeUrl($urlMatch[1] ?? '', 'https://www.biletix.com'),
                'location' => [
                    'name' => trim(html_entity_decode($venueMatch[1] ?? 'Çeşitli Mekanlar', ENT_QUOTES | ENT_HTML5)),
                    'address' => ['addressLocality' => trim(html_entity_decode($cityMatch[1] ?? 'İstanbul', ENT_QUOTES | ENT_HTML5))],
                ],
            ];
        }

        return $items;
    }

    /**
     * @param  array<string, mixed>  $sourceConfig
     * @return list<array{path: string, listing_url: string}>
     */
    private function collectBiletinialDetailQueue(array $sourceConfig): array
    {
        $listingUrls = isset($sourceConfig['listing_urls']) && is_array($sourceConfig['listing_urls']) && $sourceConfig['listing_urls'] !== []
            ? array_values(array_unique(array_filter(array_map('strval', $sourceConfig['listing_urls']))))
            : [(string) $sourceConfig['url']];

        $listingDelayUs = max(0, (int) config('crawler.biletinial_listing_delay_us', 350_000));
        /** @var array<string, list<string>> $pathsByListingUrl */
        $pathsByListingUrl = [];

        foreach ($listingUrls as $idx => $listingUrl) {
            if ($idx > 0 && $listingDelayUs > 0) {
                usleep($listingDelayUs);
            }
            $html = Http::timeout((int) config('crawler.timeout', 25))
                ->withHeaders(['User-Agent' => (string) config('crawler.user_agent')])
                ->get($listingUrl)
                ->throw()
                ->body();

            $segment = $this->biletinialCategorySegmentFromListingUrl($listingUrl);
            $paths = $this->extractBiletinialEventPathsFromListingHtml($html, $segment);
            if ($paths !== []) {
                $pathsByListingUrl[$listingUrl] = array_values($paths);
            }
        }

        $maxDetailPages = max(10, min(800, (int) config('crawler.biletinial_max_detail_pages', 200)));

        return $this->mergeUniquePathsRoundRobinFromListings($pathsByListingUrl, $maxDetailPages);
    }

    /**
     * @param  array<string, mixed>  $sourceConfig
     * @param  list<array{path: string, listing_url: string}>  $merged
     * @return list<array<string, mixed>>
     */
    private function fetchBiletinialDetailRowsBatch(array $sourceConfig, array $merged, int $globalPathOffset = 0): array
    {
        $base = 'https://biletinial.com';
        $normalized = [];
        $detailDelayUs = max(0, (int) config('crawler.biletinial_detail_delay_us', 120_000));
        $chunkSize = max(1, (int) config('crawler.biletinial_detail_chunk_size', 5));
        $chunkPauseUs = max(0, (int) config('crawler.biletinial_chunk_pause_us', 550_000));

        foreach ($merged as $i => $item) {
            $path = $item['path'];
            $listingUrl = $item['listing_url'];
            $idx = $globalPathOffset + $i;
            if ($i > 0) {
                usleep($detailDelayUs);
                if ($idx > 0 && $idx % $chunkSize === 0) {
                    usleep($chunkPauseUs);
                }
            }
            $url = $this->normalizeUrl($path, $base);
            try {
                $detailHtml = Http::timeout((int) config('crawler.timeout', 25))
                    ->withHeaders(['User-Agent' => (string) config('crawler.user_agent')])
                    ->get($url)
                    ->throw()
                    ->body();
            } catch (\Throwable) {
                continue;
            }

            $listingSegment = $this->biletinialCategorySegmentFromListingUrl($listingUrl);
            foreach ($this->parseBiletinialDetailHtmlToSchemaEvents($detailHtml, $url, $listingSegment) as $event) {
                $row = $this->normalizeSchemaOrgEventRow($event, $sourceConfig);
                if ($row !== null) {
                    $row['category_name'] = $this->categoryNameFromBiletinialListingSegment($listingSegment);
                    $normalized[] = $row;
                }
            }
        }

        return $normalized;
    }

    /**
     * @return list<string>
     */
    private function biletsirasiListingCategorySlugs(): array
    {
        return [
            'stand-up',
            'tema-parki',
            'konser',
            'tiyatro',
            'spor',
            'sinema',
            'cocuk',
            'festival',
            'parti',
            'dans',
            'opera',
            'muzikal',
            'sergi',
            'gosteri',
            'atolye',
            'muze',
            'egitim',
            'konferans',
            'fuar',
            'sirk',
            'yemek',
            'diger',
        ];
    }

    private function biletsirasiCategorySlugRegexAlternation(): string
    {
        $slugs = $this->biletsirasiListingCategorySlugs();
        usort($slugs, fn (string $a, string $b): int => strlen($b) <=> strlen($a));

        return implode('|', array_map(static fn (string $s): string => preg_quote($s, '~'), $slugs));
    }

    /**
     * @return list<string>
     */
    private function extractBiletsirasiEventPathsFromListingHtml(string $html): array
    {
        $alt = $this->biletsirasiCategorySlugRegexAlternation();
        if (! preg_match_all('~href=["\'](/(?:'.$alt.')/([a-z0-9][a-z0-9-]*))["\']~iu', $html, $m)) {
            return [];
        }

        $paths = [];
        foreach ($m[1] as $raw) {
            $p = html_entity_decode((string) $raw, ENT_QUOTES | ENT_HTML5);
            $p = '/'.trim($p, '/');
            if (substr_count($p, '/') !== 2) {
                continue;
            }
            $paths[$p] = true;
        }

        return array_keys($paths);
    }

    /**
     * @param  array<string, mixed>  $sourceConfig
     * @return list<array{path: string, listing_url: string}>
     */
    private function collectBiletsirasiDetailQueue(array $sourceConfig): array
    {
        $listingUrls = isset($sourceConfig['listing_urls']) && is_array($sourceConfig['listing_urls']) && $sourceConfig['listing_urls'] !== []
            ? array_values(array_unique(array_filter(array_map('strval', $sourceConfig['listing_urls']))))
            : [(string) $sourceConfig['url']];

        $listingDelayUs = max(0, (int) config('crawler.biletsirasi_listing_delay_us', 250_000));
        /** @var array<string, list<string>> $pathsByListingUrl */
        $pathsByListingUrl = [];

        foreach ($listingUrls as $idx => $listingUrl) {
            if ($idx > 0 && $listingDelayUs > 0) {
                usleep($listingDelayUs);
            }
            $html = Http::timeout((int) config('crawler.timeout', 25))
                ->withHeaders(['User-Agent' => (string) config('crawler.user_agent')])
                ->get($listingUrl)
                ->throw()
                ->body();

            $paths = $this->extractBiletsirasiEventPathsFromListingHtml($html);
            if ($paths !== []) {
                $pathsByListingUrl[$listingUrl] = array_values($paths);
            }
        }

        $maxDetailPages = max(10, min(800, (int) config('crawler.biletsirasi_max_detail_pages', 300)));

        return $this->mergeUniquePathsRoundRobinFromListings($pathsByListingUrl, $maxDetailPages);
    }

    /**
     * @param  array<string, mixed>  $sourceConfig
     * @param  list<array{path: string, listing_url: string}>  $merged
     * @return list<array<string, mixed>>
     */
    private function fetchBiletsirasiDetailRowsBatch(array $sourceConfig, array $merged, int $globalPathOffset = 0): array
    {
        $base = 'https://biletsirasi.com';
        $normalized = [];
        $detailDelayUs = max(0, (int) config('crawler.biletsirasi_detail_delay_us', 100_000));
        $chunkSize = max(1, (int) config('crawler.biletsirasi_detail_chunk_size', 5));
        $chunkPauseUs = max(0, (int) config('crawler.biletsirasi_chunk_pause_us', 400_000));

        foreach ($merged as $i => $item) {
            $path = $item['path'];
            $idx = $globalPathOffset + $i;
            if ($i > 0) {
                usleep($detailDelayUs);
                if ($idx > 0 && $idx % $chunkSize === 0) {
                    usleep($chunkPauseUs);
                }
            }
            $url = $this->normalizeUrl($path, $base);
            try {
                $detailHtml = Http::timeout((int) config('crawler.timeout', 25))
                    ->withHeaders(['User-Agent' => (string) config('crawler.user_agent')])
                    ->get($url)
                    ->throw()
                    ->body();
            } catch (\Throwable) {
                continue;
            }

            foreach ($this->extractJsonLdEvents($detailHtml) as $event) {
                if (! $this->schemaOrgLdRepresentsEvent($event['@type'] ?? null)) {
                    continue;
                }
                $event['url'] = $url;
                $row = $this->normalizeSchemaOrgEventRow($event, $sourceConfig);
                if ($row !== null) {
                    $row['category_name'] = $this->categoryNameFromBiletsirasiEventPath($path);
                    $normalized[] = $row;
                }
            }
        }

        return $normalized;
    }

    private function categoryNameFromBiletsirasiEventPath(string $path): string
    {
        $path = trim($path, '/');
        $seg = mb_strtolower(explode('/', $path, 2)[0] ?? '', 'UTF-8');

        return match ($seg) {
            'konser' => 'Müzik',
            'tiyatro' => 'Tiyatro',
            'stand-up' => 'Stand-up',
            'spor' => 'Spor',
            'sinema' => 'Sinema',
            'cocuk' => 'Çocuk',
            'festival' => 'Festival',
            'parti' => 'Parti',
            'dans' => 'Dans',
            'opera' => 'Opera',
            'muzikal' => 'Müzikal',
            'sergi' => 'Sergi',
            'gosteri' => 'Gösteri',
            'atolye' => 'Workshop',
            'tema-parki' => 'Etkinlik',
            'muze' => 'Sergi',
            'egitim' => 'Eğitim',
            'konferans' => 'Konferans',
            'fuar' => 'Fuar',
            'sirk' => 'Gösteri',
            'yemek' => 'Etkinlik',
            'diger' => 'Etkinlik',
            default => $this->normalizeCategoryName(str_replace('-', ' ', $seg)),
        };
    }

    /**
     * Biletinial listeleme URL segmentine göre admin / dış kaynak kategorisi (konser dışı etkinlikler yanlışlıkla "Konser Alanı" olmasın).
     */
    private function categoryNameFromBiletinialListingSegment(string $segment): string
    {
        $slug = mb_strtolower(trim(str_replace(['/', '\\'], '', $segment)), 'UTF-8');
        $slug = str_replace('-', '', $slug);

        return match (true) {
            str_contains($slug, 'muzik') => 'Müzik',
            str_contains($slug, 'sinema') => 'Sinema',
            str_contains($slug, 'tiyatro') => 'Tiyatro',
            str_contains($slug, 'spor') => 'Spor',
            str_contains($slug, 'standup') => 'Stand-up',
            str_contains($slug, 'sehrineozel') => 'Etkinlik',
            str_contains($slug, 'etkinlik') => 'Etkinlik',
            str_contains($slug, 'cocuk') => 'Çocuk',
            str_contains($slug, 'sanat') => 'Sanat',
            default => Str::title(str_replace('-', ' ', trim($segment, '-'))),
        };
    }

    private function biletinialCategorySegmentFromListingUrl(string $listingUrl): string
    {
        $path = parse_url($listingUrl, PHP_URL_PATH) ?: '';
        $path = trim($path, '/');
        $parts = explode('/', $path);
        if (count($parts) >= 2 && strtolower($parts[0]) === 'tr-tr') {
            $rest = array_slice($parts, 1);
            if (count($rest) >= 2 && strtolower((string) $rest[0]) === 'etkinlikleri') {
                return $rest[0].'/'.(string) $rest[1];
            }

            return (string) $rest[0];
        }

        return 'muzik';
    }

    /**
     * @return list<string>
     */
    private function extractBiletinialEventPathsFromListingHtml(string $html, string $categorySegment): array
    {
        $paths = [];
        $segmentEsc = preg_quote($categorySegment, '~');
        if (! preg_match_all('~href=["\'](/tr-tr/'.$segmentEsc.'/[^"\'?>\s]+)["\']~iu', $html, $m)) {
            return [];
        }

        $segHash = preg_quote($categorySegment, '#');
        foreach ($m[1] as $p) {
            $p = html_entity_decode($p, ENT_QUOTES | ENT_HTML5);
            $p = rtrim($p, '/');
            if ($p === '' || preg_match('#^/tr-tr/'.$segHash.'/?$#iu', $p)) {
                continue;
            }
            if (substr_count($p, '/') < 3) {
                continue;
            }
            $paths[$p] = true;
        }

        return array_keys($paths);
    }

    /**
     * Biletix anasayfa: ?page= ile ek "htevent" kutuları (sayfa başına ~20 kart; üst üste binenler elenir).
     *
     * @param  array<string, mixed>  $sourceConfig
     * @return list<array<string, mixed>>
     */
    private function crawlBiletixPagedListing(array $sourceConfig): array
    {
        $baseUrl = (string) $sourceConfig['url'];
        $maxPages = max(1, min(60, (int) config('crawler.biletix_max_pages', 15)));
        $pageDelayUs = max(0, (int) config('crawler.biletix_page_delay_us', 280_000));
        $chunkSize = max(1, min(20, (int) config('crawler.biletix_page_chunk_size', 5)));
        $chunkPauseUs = max(0, (int) config('crawler.biletix_chunk_pause_us', 500_000));

        $seenKeys = [];
        $normalized = [];
        $staleDupPages = 0;

        for ($page = 1; $page <= $maxPages; $page++) {
            if ($page > 1) {
                usleep($pageDelayUs);
                if (($page - 1) % $chunkSize === 0) {
                    usleep($chunkPauseUs);
                }
            }

            $url = $this->biletixListingUrlForPage($baseUrl, $page);

            try {
                $html = Http::timeout((int) config('crawler.timeout', 20))
                    ->withHeaders(['User-Agent' => (string) config('crawler.user_agent')])
                    ->get($url)
                    ->throw()
                    ->body();
            } catch (\Throwable) {
                break;
            }

            $events = $this->extractJsonLdEvents($html);
            if ($events === []) {
                $events = $this->extractBiletixEvents($html);
            }

            if ($events === []) {
                break;
            }

            $pageNew = 0;
            foreach ($events as $event) {
                $row = $this->normalizeSchemaOrgEventRow($event, $sourceConfig);
                if ($row === null) {
                    continue;
                }
                $key = $this->biletixRowDedupeKey($row);
                if (isset($seenKeys[$key])) {
                    continue;
                }
                $seenKeys[$key] = true;
                $normalized[] = $row;
                $pageNew++;
            }

            if ($pageNew === 0) {
                $staleDupPages++;
                if ($staleDupPages >= 2) {
                    break;
                }
            } else {
                $staleDupPages = 0;
            }
        }

        return $normalized;
    }

    private function biletixListingUrlForPage(string $baseUrl, int $page): string
    {
        if ($page <= 1) {
            return $baseUrl;
        }

        $parts = parse_url($baseUrl);
        if ($parts === false || empty($parts['host'])) {
            return $baseUrl.(str_contains($baseUrl, '?') ? '&' : '?').'page='.$page;
        }

        $query = [];
        if (! empty($parts['query'])) {
            parse_str($parts['query'], $query);
        }
        $query['page'] = $page;
        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'];
        $path = $parts['path'] ?? '/';
        $qs = http_build_query($query);

        return $scheme.'://'.$host.$path.'?'.$qs;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function biletixRowDedupeKey(array $row): string
    {
        $url = (string) ($row['external_url'] ?? '');
        if ($url !== '') {
            return $url;
        }

        return sha1((string) ($row['title'] ?? '').'|'.serialize($row['start_date'] ?? '').'|'.($row['venue_name'] ?? ''));
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function parseBiletinialDetailHtmlToSchemaEvents(string $html, string $pageUrl, string $listingSegment = 'muzik'): array
    {
        $pageTitle = $this->biletinialPageDisplayTitle($html);
        if ($pageTitle === '') {
            return [];
        }

        $wrapped = '<?xml encoding="UTF-8">'.$html;
        $prev = libxml_use_internal_errors(true);
        $dom = new \DOMDocument;
        $dom->loadHTML($wrapped, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        libxml_use_internal_errors($prev);

        $xpath = new DOMXPath($dom);
        $nodes = $xpath->query("//*[contains(@itemtype, 'schema.org/Event')]");
        if ($nodes === false || $nodes->length === 0) {
            return [];
        }

        $out = [];
        foreach ($nodes as $eventEl) {
            if (! $eventEl instanceof DOMElement) {
                continue;
            }

            $startRaw = $this->biletinialMicrodataStartDate($eventEl);
            if ($startRaw === null || trim($startRaw) === '') {
                continue;
            }

            $placeEl = $this->biletinialFirstDescendantItempropElement($eventEl, 'location');
            if (! $placeEl instanceof DOMElement) {
                continue;
            }

            $venueName = $this->biletinialVenueNameFromPlace($placeEl);
            if ($venueName === '') {
                continue;
            }

            $street = $this->biletinialMetaContentInSubtree($placeEl, 'streetAddress')
                ?? $this->biletinialMetaContentInSubtree($placeEl, 'address');
            $localityRaw = $this->biletinialMetaContentInSubtree($placeEl, 'addressLocality');
            $lat = $this->biletinialMetaContentInSubtree($placeEl, 'latitude');
            $lng = $this->biletinialMetaContentInSubtree($placeEl, 'longitude');
            $mekanHref = $placeEl->getAttribute('href');
            if ($mekanHref === '') {
                $a = $placeEl->getElementsByTagName('a')->item(0);
                $mekanHref = $a instanceof DOMElement ? $a->getAttribute('href') : '';
            }

            $performer = $this->biletinialMetaContentInSubtree($eventEl, 'performer');
            $image = $this->biletinialMetaContentInSubtree($eventEl, 'image');
            $description = $this->biletinialMetaContentInSubtree($eventEl, 'description');

            $inferredCity = $this->inferTurkishCityFromBiletinialAddress($localityRaw ?? '', $street ?? '', $venueName);

            $geo = [];
            if ($lat !== null && $lng !== null && is_numeric($lat) && is_numeric($lng) && (float) $lat !== 0.0 && (float) $lng !== 0.0) {
                $geo = [
                    '@type' => 'GeoCoordinates',
                    'latitude' => (float) $lat,
                    'longitude' => (float) $lng,
                ];
            }

            $location = [
                'name' => $venueName,
                'address' => [
                    'addressLocality' => $inferredCity,
                    'streetAddress' => $street ?: ($localityRaw ?? ''),
                ],
            ];
            if ($geo !== []) {
                $location['geo'] = $geo;
            }

            $kw = $this->categoryNameFromBiletinialListingSegment($listingSegment);

            $out[] = [
                '@type' => 'Event',
                'name' => $pageTitle,
                'startDate' => $startRaw,
                'url' => $pageUrl,
                'description' => $description ?? '',
                'image' => $image ?? '',
                'performer' => $performer,
                'location' => $location,
                'keywords' => $kw,
                'biletinial_venue_path' => $mekanHref !== '' ? $this->normalizeUrl($mekanHref, 'https://biletinial.com') : null,
            ];
        }

        return $out;
    }

    private function biletinialPageDisplayTitle(string $html): string
    {
        if (preg_match('/<meta\s+property=["\']og:title["\']\s+content=["\']([^"\']+)["\']/iu', $html, $m)) {
            $t = trim(html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5));

            return trim(preg_replace('/\s*Biletleri?\s*$/iu', '', $t) ?? $t);
        }

        if (preg_match('/<h1[^>]*>([^<]+)<\/h1>/iu', $html, $m)) {
            $t = trim(html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5));
            if (mb_stripos($t, 'önerdiklerimiz') !== false) {
                return '';
            }

            return $t;
        }

        return '';
    }

    private function biletinialMicrodataStartDate(DOMElement $eventEl): ?string
    {
        foreach ($eventEl->getElementsByTagName('time') as $time) {
            if ($time->getAttribute('itemprop') !== 'startDate') {
                continue;
            }
            $v = $time->getAttribute('datetime');
            if ($v !== '') {
                return $v;
            }
            $v = $time->getAttribute('content');
            if ($v !== '') {
                return $v;
            }
        }

        foreach ($eventEl->getElementsByTagName('meta') as $meta) {
            if ($meta->getAttribute('itemprop') === 'startDate') {
                $v = $meta->getAttribute('content');

                return $v !== '' ? $v : null;
            }
        }

        return null;
    }

    private function biletinialFirstDescendantItempropElement(DOMElement $root, string $prop): ?DOMElement
    {
        foreach ($root->getElementsByTagName('*') as $el) {
            if (! $el instanceof DOMElement) {
                continue;
            }
            if ($el->getAttribute('itemprop') === $prop) {
                return $el;
            }
        }

        return null;
    }

    private function biletinialVenueNameFromPlace(DOMElement $placeEl): string
    {
        foreach ($placeEl->getElementsByTagName('address') as $addr) {
            if ($addr->getAttribute('itemprop') === 'name') {
                $text = trim(preg_replace('/\s+/u', ' ', strip_tags($addr->textContent)) ?? '');

                return $text;
            }
        }

        return '';
    }

    private function biletinialMetaContentInSubtree(DOMElement $root, string $prop): ?string
    {
        foreach ($root->getElementsByTagName('meta') as $meta) {
            if ($meta->getAttribute('itemprop') === $prop) {
                $v = trim(html_entity_decode($meta->getAttribute('content'), ENT_QUOTES | ENT_HTML5));

                return $v !== '' ? $v : null;
            }
        }

        return null;
    }

    /**
     * Biletinial adres satırlarından şehir adı (City model / eşleştirme için).
     */
    private function inferTurkishCityFromBiletinialAddress(string $localityRaw, string $streetRaw, string $venueName): string
    {
        $blob = $localityRaw.' '.$streetRaw.' '.$venueName;
        if (preg_match_all('/\b(\d{5})\b/u', $blob, $pcodes)) {
            foreach ($pcodes[1] as $five) {
                $plate = (int) substr($five, 0, 2);
                $cityFromPlate = $this->turkishProvincePlateToCityName($plate);
                if ($cityFromPlate !== null) {
                    return $cityFromPlate;
                }
            }
        }

        $haystack = mb_strtolower($localityRaw.' '.$streetRaw.' '.$venueName, 'UTF-8');
        foreach ($this->turkishCityNamesLongestFirst() as $city) {
            $c = mb_strtolower($city, 'UTF-8');
            if ($c !== '' && str_contains($haystack, $c)) {
                return $city;
            }
        }

        if (preg_match('#/([A-Za-zÇçĞğİıÖöŞşÜü\s]+)\s*$#u', $localityRaw, $m)) {
            $candidate = trim($m[1]);
            if (mb_strlen($candidate) >= 2 && mb_strlen($candidate) <= 40) {
                return Str::title($candidate);
            }
        }
        if (preg_match('#/([A-Za-zÇçĞğİıÖöŞşÜü\s]+)\s*$#u', $streetRaw, $m)) {
            $candidate = trim($m[1]);
            if (mb_strlen($candidate) >= 2 && mb_strlen($candidate) <= 40) {
                return Str::title($candidate);
            }
        }

        return 'İstanbul';
    }

    private function turkishProvincePlateToCityName(int $plate): ?string
    {
        static $map = [
            1 => 'Adana', 2 => 'Adıyaman', 3 => 'Afyonkarahisar', 4 => 'Ağrı', 5 => 'Amasya', 6 => 'Ankara', 7 => 'Antalya',
            8 => 'Artvin', 9 => 'Aydın', 10 => 'Balıkesir', 11 => 'Bilecik', 12 => 'Bingöl', 13 => 'Bitlis', 14 => 'Bolu',
            15 => 'Burdur', 16 => 'Bursa', 17 => 'Çanakkale', 18 => 'Çankırı', 19 => 'Çorum', 20 => 'Denizli',
            21 => 'Diyarbakır', 22 => 'Edirne', 23 => 'Elazığ', 24 => 'Erzincan', 25 => 'Erzurum', 26 => 'Eskişehir',
            27 => 'Gaziantep', 28 => 'Giresun', 29 => 'Gümüşhane', 30 => 'Hakkâri', 31 => 'Hatay', 32 => 'Isparta',
            33 => 'Mersin', 34 => 'İstanbul', 35 => 'İzmir', 36 => 'Kars', 37 => 'Kastamonu', 38 => 'Kayseri',
            39 => 'Kırklareli', 40 => 'Kırşehir', 41 => 'Kocaeli', 42 => 'Konya', 43 => 'Kütahya', 44 => 'Malatya',
            45 => 'Manisa', 46 => 'Kahramanmaraş', 47 => 'Mardin', 48 => 'Muğla', 49 => 'Muş', 50 => 'Nevşehir',
            51 => 'Niğde', 52 => 'Ordu', 53 => 'Rize', 54 => 'Sakarya', 55 => 'Samsun', 56 => 'Siirt', 57 => 'Sinop',
            58 => 'Sivas', 59 => 'Tekirdağ', 60 => 'Tokat', 61 => 'Trabzon', 62 => 'Tunceli', 63 => 'Şanlıurfa',
            64 => 'Uşak', 65 => 'Van', 66 => 'Yozgat', 67 => 'Zonguldak', 68 => 'Aksaray', 69 => 'Bayburt',
            70 => 'Karaman', 71 => 'Kırıkkale', 72 => 'Batman', 73 => 'Şırnak', 74 => 'Bartın', 75 => 'Ardahan',
            76 => 'Iğdır', 77 => 'Yalova', 78 => 'Karabük', 79 => 'Kilis', 80 => 'Osmaniye', 81 => 'Düzce',
        ];

        return $map[$plate] ?? null;
    }

    /**
     * @return list<string>
     */
    private function turkishCityNamesLongestFirst(): array
    {
        static $cached = null;
        if ($cached !== null) {
            return $cached;
        }

        try {
            $fromDb = City::query()->orderByRaw('CHAR_LENGTH(name) DESC')->pluck('name')->all();
            if ($fromDb !== []) {
                $cached = array_values(array_unique(array_map('strval', $fromDb)));

                return $cached;
            }
        } catch (\Throwable) {
        }

        $cached = [
            'Kahramanmaraş', 'Şanlıurfa', 'Gaziantep', 'Kocaeli', 'Balıkesir', 'Tekirdağ', 'Yalova', 'Karabük',
            'İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa', 'Adana', 'Konya', 'Eskişehir', 'Mersin', 'Kayseri',
            'Trabzon', 'Samsun', 'Denizli', 'Malatya', 'Erzurum', 'Van', 'Diyarbakır', 'Sakarya', 'Muğla', 'Aydın',
            'Manisa', 'Hatay', 'Kütahya', 'Çanakkale', 'Edirne', 'Bolu', 'Zonguldak', 'Nevşehir', 'Elazığ', 'Ordu',
        ];
        usort($cached, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));

        return $cached;
    }

    private function extractJsonLdEvents(string $html): array
    {
        $events = [];
        preg_match_all('/<script[^>]+type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/is', $html, $matches);

        foreach (($matches[1] ?? []) as $jsonText) {
            $decoded = json_decode(html_entity_decode(trim($jsonText), ENT_QUOTES | ENT_HTML5), true);
            if (! is_array($decoded)) {
                continue;
            }
            $events = array_merge($events, $this->flattenEventsFromLd($decoded));
        }

        return $events;
    }

    private function schemaOrgLdRepresentsEvent(mixed $type): bool
    {
        $types = [];
        if (is_string($type)) {
            $types = [$type];
        } elseif (is_array($type)) {
            foreach ($type as $t) {
                if (is_string($t)) {
                    $types[] = $t;
                }
            }
        }
        foreach ($types as $raw) {
            $t = strtolower(trim($raw));
            if ($t === '') {
                continue;
            }
            if (str_contains($t, '://schema.org/')) {
                $t = substr($t, (int) strrpos($t, '/') + 1);
            }
            if ($t === 'event' || str_ends_with($t, 'event') || $t === 'festival') {
                return true;
            }
        }

        return false;
    }

    private function flattenEventsFromLd(array $node): array
    {
        $results = [];
        if ($this->schemaOrgLdRepresentsEvent($node['@type'] ?? null)) {
            return [$node];
        }

        foreach ($node as $value) {
            if (is_array($value)) {
                if (array_is_list($value)) {
                    foreach ($value as $item) {
                        if (is_array($item)) {
                            $results = array_merge($results, $this->flattenEventsFromLd($item));
                        }
                    }
                } else {
                    $results = array_merge($results, $this->flattenEventsFromLd($value));
                }
            }
        }

        return $results;
    }

    private function parseDate(mixed $date): ?Carbon
    {
        if (! is_string($date) || trim($date) === '') {
            return null;
        }

        $normalized = str_replace('::', ':', trim($date));

        try {
            return Carbon::parse($normalized);
        } catch (\Throwable) {
            return null;
        }
    }

    private function normalizeCategoryName(string $raw): string
    {
        $lower = mb_strtolower($raw, 'UTF-8');

        return match (true) {
            str_contains($lower, 'tiyatro') => 'Tiyatro',
            str_contains($lower, 'spor') => 'Spor',
            str_contains($lower, 'festival') => 'Festival',
            str_contains($lower, 'stand') => 'Stand-up',
            str_contains($lower, 'sinema') || str_contains($lower, 'film') => 'Sinema',
            str_contains($lower, 'sergi') || str_contains($lower, 'müze') => 'Sergi',
            str_contains($lower, 'workshop') || str_contains($lower, 'atölye') => 'Workshop',
            str_contains($lower, 'çocuk') || str_contains($lower, 'aile') => 'Çocuk',
            str_contains($lower, 'opera') || str_contains($lower, 'bale') => 'Sahne sanatları',
            str_contains($lower, 'müzik') || str_contains($lower, 'konser') => 'Müzik',
            str_contains($lower, 'theatre') || str_contains($lower, 'theater') => 'Tiyatro',
            str_contains($lower, 'sports') => 'Spor',
            default => 'Etkinlik',
        };
    }

    private function normalizeUrl(string $pathOrUrl, string $base): string
    {
        if (str_starts_with($pathOrUrl, 'http://') || str_starts_with($pathOrUrl, 'https://')) {
            return $pathOrUrl;
        }

        return rtrim($base, '/').'/'.ltrim($pathOrUrl, '/');
    }
}
