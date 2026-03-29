<?php

namespace App\Services;

use App\Models\City;
use App\Support\CrawlerHttpResponseInspector;
use App\Support\SehirSecCityDistricts;
use App\Support\SehirSecMetaInference;
use DOMElement;
use DOMXPath;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class MarketplaceCrawlerService
{
    public function crawl(string $source): array
    {
        $sourceConfig = config("crawler.sources.{$source}");
        if (! is_array($sourceConfig) || empty($sourceConfig['url'])) {
            throw new RuntimeException("Crawler source not configured: {$source}");
        }

        if ($source === 'bubilet') {
            return $this->crawlBubiletTagListing($sourceConfig);
        }

        if ($source === 'bubilet_sehir_sec') {
            return $this->crawlBubiletSehirSecPage($sourceConfig);
        }

        if ($source === 'biletinial') {
            return $this->crawlBiletinialListing($sourceConfig);
        }

        $html = Http::timeout((int) config('crawler.timeout', 20))
            ->withHeaders(['User-Agent' => (string) config('crawler.user_agent')])
            ->get((string) $sourceConfig['url'])
            ->throw()
            ->body();

        $events = $this->extractJsonLdEvents($html);
        if (empty($events)) {
            $events = $source === 'biletix'
                ? $this->extractBiletixEvents($html)
                : [];
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

    /**
     * Bubilet etiket sayfasındaki etkinlik kartlarından link toplanır; her detay sayfasındaki JSON-LD Event okunur.
     *
     * @param  array<string, mixed>  $sourceConfig
     * @return list<array<string, mixed>>
     */
    private function crawlBubiletTagListing(array $sourceConfig): array
    {
        $listingUrls = $sourceConfig['listing_urls'] ?? null;
        if (! is_array($listingUrls) || $listingUrls === []) {
            $listingUrls = [(string) $sourceConfig['url']];
        }
        $listingUrls = array_values(array_unique(array_filter(array_map('strval', $listingUrls))));

        $pathToListing = [];
        $delayListingUs = max(0, (int) config('crawler.bubilet_listing_delay_us', 200_000));

        foreach ($listingUrls as $idx => $listingUrl) {
            if ($idx > 0 && $delayListingUs > 0) {
                usleep($delayListingUs);
            }
            $html = $this->bubiletGet($listingUrl);

            foreach ($this->extractBubiletEventPathsFromListingHtml($html) as $path) {
                $pathToListing[$path] = $listingUrl;
            }
        }

        $paths = array_keys($pathToListing);
        $normalized = [];
        $base = 'https://www.bubilet.com.tr';

        foreach ($paths as $i => $path) {
            if ($i > 0) {
                usleep(150000);
            }
            $url = $this->normalizeUrl($path, $base);
            $listingUrl = $pathToListing[$path] ?? '';
            $listingRef = $listingUrl !== '' ? $listingUrl : null;
            try {
                $detailHtml = $this->bubiletGet($url, $listingRef);
            } catch (\Throwable) {
                continue;
            }

            $ldEvents = $this->extractJsonLdEvents($detailHtml);
            foreach ($ldEvents as $event) {
                $type = strtolower((string) ($event['@type'] ?? ''));
                if ($type !== 'event') {
                    continue;
                }
                $event['url'] = $url;
                $row = $this->normalizeSchemaOrgEventRow($event, $sourceConfig);
                if ($row !== null) {
                    $meta = is_array($row['meta'] ?? null) ? $row['meta'] : [];
                    if ($listingUrl !== '') {
                        $meta['bubilet_listing_url'] = $listingUrl;
                    }
                    $row['meta'] = $meta;
                    $normalized[] = $row;
                }
                break;
            }
        }

        return $normalized;
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
        $response = Http::timeout($timeout)
            ->withHeaders($this->bubiletRequestHeaders($referer))
            ->get($url);

        $body = $response->body();

        if (CrawlerHttpResponseInspector::looksLikeCloudflareChallenge($body)) {
            throw new RuntimeException(CrawlerHttpResponseInspector::cloudflareBlockedMessage());
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

        $cookies = trim((string) config('crawler.bubilet_cookies', ''));

        if ($cookies !== '') {
            $headers['Cookie'] = $cookies;
        }

        return $headers;
    }

    /**
     * Bubilet /sehir-sec kartlarında ayrı kategori alanı olmadığı için başlıktan kabaca sınıflandırma.
     */
    private function inferBubiletSehirSecCategory(string $title): string
    {
        $t = mb_strtolower($title, 'UTF-8');
        if (str_contains($t, 'globetrotters')) {
            return 'Spor';
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
        if (str_contains($t, 'konser')) {
            return 'Konser';
        }

        return 'Konser';
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
        $category = (string) (Arr::get($event, 'eventAttendanceMode') ?? Arr::get($event, 'keywords') ?? 'Müzik');

        return [
            'title' => $name,
            'external_url' => (string) ($event['url'] ?? ''),
            'image_url' => is_array($event['image'] ?? null) ? (string) ($event['image'][0] ?? '') : (string) ($event['image'] ?? ''),
            'venue_name' => $venueName,
            'city_name' => $cityName,
            'category_name' => $this->normalizeCategoryName($category),
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
        if (preg_match_all('#href=(["\'])(/[^"\']+/etkinlik/[^"\']+)\1#u', $html, $matches)) {
            foreach ($matches[2] as $path) {
                $path = html_entity_decode($path, ENT_QUOTES | ENT_HTML5);
                if (str_contains($path, '/etkinlik/')) {
                    $paths[] = $path;
                }
            }
        }

        return $paths;
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
     * Biletinial müzik listesi → etkinlik detay URL'leri → her detaydaki schema.org Event mikro verisi (tarih / mekan / sanatçı).
     *
     * @param  array<string, mixed>  $sourceConfig
     * @return list<array<string, mixed>>
     */
    private function crawlBiletinialListing(array $sourceConfig): array
    {
        $listingUrl = (string) $sourceConfig['url'];
        $html = Http::timeout((int) config('crawler.timeout', 25))
            ->withHeaders(['User-Agent' => (string) config('crawler.user_agent')])
            ->get($listingUrl)
            ->throw()
            ->body();

        $paths = $this->extractBiletinialMuzikPathsFromListingHtml($html);
        $paths = array_values(array_unique($paths));
        $base = 'https://biletinial.com';
        $normalized = [];
        $maxDetailPages = max(10, min(120, (int) config('crawler.biletinial_max_detail_pages', 55)));

        foreach (array_slice($paths, 0, $maxDetailPages) as $i => $path) {
            if ($i > 0) {
                usleep(120000);
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

            foreach ($this->parseBiletinialDetailHtmlToSchemaEvents($detailHtml, $url) as $event) {
                $row = $this->normalizeSchemaOrgEventRow($event, $sourceConfig);
                if ($row !== null) {
                    $normalized[] = $row;
                }
            }
        }

        return $normalized;
    }

    /**
     * @return list<string>
     */
    private function extractBiletinialMuzikPathsFromListingHtml(string $html): array
    {
        $paths = [];
        // Etkinlik slug'ları rakam/tire içerir; yalnızca dil kökü "/tr-tr/muzik" hariç tutulur. (# ayırıcı kullanma — sınıf içinde kırılır.)
        if (preg_match_all('~href=["\'](/tr-tr/muzik/[^"\'?>\s]+)["\']~iu', $html, $m)) {
            foreach ($m[1] as $p) {
                $p = html_entity_decode($p, ENT_QUOTES | ENT_HTML5);
                $p = rtrim($p, '/');
                if ($p === '' || preg_match('#^/tr-tr/muzik/?$#u', $p)) {
                    continue;
                }
                if (substr_count($p, '/') < 3) {
                    continue;
                }
                $paths[$p] = true;
            }
        }

        return array_keys($paths);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function parseBiletinialDetailHtmlToSchemaEvents(string $html, string $pageUrl): array
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

            $out[] = [
                '@type' => 'Event',
                'name' => $pageTitle,
                'startDate' => $startRaw,
                'url' => $pageUrl,
                'description' => $description ?? '',
                'image' => $image ?? '',
                'performer' => $performer,
                'location' => $location,
                'keywords' => 'Müzik',
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

    private function flattenEventsFromLd(array $node): array
    {
        $results = [];
        $type = strtolower((string) ($node['@type'] ?? ''));

        if ($type === 'event') {
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
            default => 'Konser Alanı',
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
