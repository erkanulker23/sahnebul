<?php

namespace App\Services;

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

        $html = Http::timeout((int) config('crawler.timeout', 20))
            ->withHeaders(['User-Agent' => (string) config('crawler.user_agent')])
            ->get((string) $sourceConfig['url'])
            ->throw()
            ->body();

        $events = $this->extractJsonLdEvents($html);
        if (empty($events)) {
            $events = $source === 'biletix'
                ? $this->extractBiletixEvents($html)
                : $this->extractBiletinialEvents($html);
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
        $listingUrl = (string) $sourceConfig['url'];
        $html = Http::timeout((int) config('crawler.timeout', 20))
            ->withHeaders(['User-Agent' => (string) config('crawler.user_agent')])
            ->get($listingUrl)
            ->throw()
            ->body();

        $paths = $this->extractBubiletEventPathsFromListingHtml($html);
        $paths = array_values(array_unique($paths));
        $normalized = [];
        $base = 'https://www.bubilet.com.tr';

        foreach ($paths as $i => $path) {
            if ($i > 0) {
                usleep(150000);
            }
            $url = $this->normalizeUrl($path, $base);
            try {
                $detailHtml = Http::timeout((int) config('crawler.timeout', 20))
                    ->withHeaders(['User-Agent' => (string) config('crawler.user_agent')])
                    ->get($url)
                    ->throw()
                    ->body();
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
        $html = Http::timeout((int) config('crawler.timeout', 30))
            ->withHeaders(['User-Agent' => (string) config('crawler.user_agent')])
            ->get($listingUrl)
            ->throw()
            ->body();

        $dom = new \DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="UTF-8">' . $html);
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
        if (preg_match_all('#href="(/[^"]+/etkinlik/[^"]+)"#u', $html, $matches)) {
            foreach ($matches[1] as $path) {
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

    private function extractBiletinialEvents(string $html): array
    {
        $items = [];
        preg_match_all('/<a[^>]+href="([^"]*\/tr-tr\/[^"]+)"[^>]*>(.*?)<\/a>/is', $html, $links, PREG_SET_ORDER);

        foreach ($links as $link) {
            $title = trim(strip_tags(html_entity_decode($link[2], ENT_QUOTES | ENT_HTML5)));
            if (mb_strlen($title, 'UTF-8') < 4) {
                continue;
            }

            $items[] = [
                'name' => $title,
                'url' => $this->normalizeUrl($link[1], 'https://biletinial.com'),
                'location' => [
                    'name' => 'Çeşitli Mekanlar',
                    'address' => ['addressLocality' => 'İstanbul'],
                ],
            ];
        }

        return $items;
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

        return rtrim($base, '/') . '/' . ltrim($pathOrUrl, '/');
    }
}
