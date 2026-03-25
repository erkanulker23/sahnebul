<?php

namespace App\Support;

/**
 * İlk tam sayfa yanıtında (X-Inertia yok) Open Graph / Twitter / canonical üretir.
 * Sosyal ve arama önizlemeleri JS çalıştırmadan meta görsün diye Blade ile yazılır.
 */
final class InertiaDocumentMeta
{
    /**
     * @param  array<string, mixed>|null  $page
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}> , jsonLd?: array<string, mixed>|list<array<string, mixed>>}|null
     */
    public static function fromInertiaPage(?array $page): ?array
    {
        if ($page === null || ! isset($page['component'], $page['props']) || ! is_array($page['props'])) {
            return null;
        }

        $component = (string) $page['component'];
        $props = $page['props'];
        $pathUrl = isset($page['url']) ? (string) $page['url'] : '/';

        $seo = is_array($props['seo'] ?? null) ? $props['seo'] : [];
        $siteName = (string) ($seo['siteName'] ?? config('app.name', 'Sahnebul'));
        $appUrl = rtrim((string) ($seo['appUrl'] ?? config('app.url', 'http://localhost')), '/');
        $defaultDesc = (string) ($seo['defaultDescription'] ?? '');
        if ($defaultDesc === '') {
            $defaultDesc = 'Sahnebul ile Türkiye’deki konser mekanlarını, etkinlikleri ve sanatçıları keşfedin; rezervasyon ve Gold üyelik seçeneklerine göz atın.';
        }
        $locale = (string) ($seo['locale'] ?? 'tr_TR');
        $defaultOg = $seo['defaultImage'] ?? config('sahnebul.default_og_image');
        $defaultOgAbs = is_string($defaultOg) && $defaultOg !== ''
            ? SeoFormatting::toAbsoluteUrl($defaultOg, $appUrl)
            : null;

        return match ($component) {
            'Artists/Show' => self::artistShow($props, $pathUrl, $siteName, $appUrl, $defaultDesc, $locale, $defaultOgAbs),
            'Artists/Index' => self::artistsIndex($pathUrl, $siteName, $appUrl, $defaultDesc, $locale, $defaultOgAbs),
            'Venues/Show' => self::venueShow($props, $pathUrl, $siteName, $appUrl, $defaultDesc, $locale, $defaultOgAbs),
            'Venues/Index' => self::venuesIndex($props, $pathUrl, $siteName, $appUrl, $defaultDesc, $locale, $defaultOgAbs),
            'Events/Show' => self::eventShow($props, $pathUrl, $siteName, $appUrl, $defaultDesc, $locale, $defaultOgAbs),
            'Events/Index' => self::eventsIndex($pathUrl, $siteName, $appUrl, $defaultDesc, $locale, $defaultOgAbs),
            'Blog/Show' => self::blogShow($props, $pathUrl, $siteName, $appUrl, $defaultDesc, $locale, $defaultOgAbs),
            'Blog/Index' => self::blogIndex($pathUrl, $siteName, $appUrl, $defaultDesc, $locale, $defaultOgAbs),
            'Contact' => self::contact($pathUrl, $siteName, $appUrl, $defaultDesc, $locale, $defaultOgAbs),
            'Pages/Show' => self::legalPage($props, $pathUrl, $siteName, $appUrl, $defaultDesc, $locale, $defaultOgAbs),
            'SehirSec' => self::sehirSec($pathUrl, $siteName, $appUrl, $defaultDesc, $locale, $defaultOgAbs),
            'SehirSec/CityEvents' => self::sehirSecCity($props, $pathUrl, $siteName, $appUrl, $defaultDesc, $locale, $defaultOgAbs),
            'SehirSec/ExternalEventShow' => self::externalEventShow($props, $pathUrl, $siteName, $appUrl, $defaultDesc, $locale, $defaultOgAbs),
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}>, jsonLd?: array<string, mixed>}
     */
    private static function artistShow(
        array $props,
        string $pathUrl,
        string $siteName,
        string $appUrl,
        string $defaultDesc,
        string $locale,
        ?string $defaultOgAbs,
    ): array {
        $artist = is_array($props['artist'] ?? null) ? $props['artist'] : [];
        $name = (string) ($artist['name'] ?? 'Sanatçı');
        $bio = isset($artist['bio']) ? (string) $artist['bio'] : '';
        $genre = isset($artist['genre']) && is_string($artist['genre']) ? trim($artist['genre']) : '';
        $avatar = isset($artist['avatar']) ? (string) $artist['avatar'] : '';

        $pageTitle = $name.' Konserleri, Performansları ve Etkinlikleri';
        $fullTitle = SeoFormatting::buildDocumentTitle($pageTitle, $siteName);
        $keywordLead = $name.' konserleri, performansları ve etkinlikleri';
        $bioPlain = SeoFormatting::stripHtmlToText($bio);
        $genreSuffix = $genre !== '' ? ' Tür: '.$genre.'.' : '';
        $fallback = $keywordLead.'. Yaklaşan ve geçmiş konserler, canlı performanslar ve etkinlik takvimi Sahnebul’da.'.$genreSuffix;
        $desc = SeoFormatting::truncateMetaDescription(
            $bioPlain !== '' ? $keywordLead.'. '.$bioPlain : $fallback,
        );

        $canonical = SeoFormatting::normalizeCanonical($appUrl, $pathUrl);
        $ogImage = SeoFormatting::absoluteMediaUrl($avatar, $appUrl) ?? $defaultOgAbs;

        $sameAs = self::collectHttpUrls(is_array($artist['social_links'] ?? null) ? $artist['social_links'] : []);
        $jsonLd = [
            '@context' => 'https://schema.org',
            '@type' => 'MusicGroup',
            'name' => $name,
            'url' => $canonical,
            'description' => $desc,
        ];
        if ($ogImage !== null) {
            $jsonLd['image'] = [$ogImage];
        }
        if ($sameAs !== []) {
            $jsonLd['sameAs'] = $sameAs;
        }

        return [
            'title' => $fullTitle,
            'tags' => self::baseTags($fullTitle, $desc, $canonical, $siteName, $locale, $ogImage, 'website'),
            'jsonLd' => $jsonLd,
        ];
    }

    /**
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}>, jsonLd?: array<string, mixed>}
     */
    private static function artistsIndex(
        string $pathUrl,
        string $siteName,
        string $appUrl,
        string $defaultDesc,
        string $locale,
        ?string $defaultOgAbs,
    ): array {
        $pageTitle = 'Sanatçılar - Sahnebul';
        $fullTitle = SeoFormatting::buildDocumentTitle($pageTitle, $siteName);
        $desc = 'Türkiye’deki konser ve etkinlik sanatçılarını keşfedin; konser takvimleri ve mekan bilgileri Sahnebul’da.';
        $canonical = SeoFormatting::normalizeCanonical($appUrl, $pathUrl);

        return [
            'title' => $fullTitle,
            'tags' => self::baseTags($fullTitle, $desc, $canonical, $siteName, $locale, $defaultOgAbs, 'website'),
        ];
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}>, jsonLd?: array<string, mixed>}
     */
    private static function venueShow(
        array $props,
        string $pathUrl,
        string $siteName,
        string $appUrl,
        string $defaultDesc,
        string $locale,
        ?string $defaultOgAbs,
    ): array {
        $venue = is_array($props['venue'] ?? null) ? $props['venue'] : [];
        $name = (string) ($venue['name'] ?? 'Mekan');
        $description = isset($venue['description']) ? (string) $venue['description'] : '';
        $cover = isset($venue['cover_image']) ? (string) $venue['cover_image'] : '';
        $city = is_array($venue['city'] ?? null) ? (string) ($venue['city']['name'] ?? '') : '';
        $category = is_array($venue['category'] ?? null) ? (string) ($venue['category']['name'] ?? '') : '';
        $address = (string) ($venue['address'] ?? '');

        $pageTitle = $name.' - Sahnebul';
        $fullTitle = SeoFormatting::buildDocumentTitle($pageTitle, $siteName);
        $plainDesc = SeoFormatting::stripHtmlToText($description);
        $desc = SeoFormatting::truncateMetaDescription(
            $plainDesc !== '' ? $plainDesc : $name.' — '.$city.'. '.($category !== '' ? $category.'. ' : '').'Yorumlar, takvim ve rezervasyon Sahnebul’da.',
        );

        $canonical = SeoFormatting::normalizeCanonical($appUrl, $pathUrl);
        $ogImage = SeoFormatting::absoluteMediaUrl($cover, $appUrl) ?? $defaultOgAbs;

        $jsonLd = [
            '@context' => 'https://schema.org',
            '@type' => ['LocalBusiness', 'EventVenue'],
            'name' => $name,
            'url' => $canonical,
            'description' => $desc,
            'address' => [
                '@type' => 'PostalAddress',
                'streetAddress' => $address,
                'addressLocality' => $city,
                'addressCountry' => 'TR',
            ],
        ];
        if ($ogImage !== null) {
            $jsonLd['image'] = [$ogImage];
        }

        return [
            'title' => $fullTitle,
            'tags' => self::baseTags($fullTitle, $desc, $canonical, $siteName, $locale, $ogImage, 'website'),
            'jsonLd' => $jsonLd,
        ];
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}>, jsonLd?: array<string, mixed>}
     */
    private static function venuesIndex(
        array $props,
        string $pathUrl,
        string $siteName,
        string $appUrl,
        string $defaultDesc,
        string $locale,
        ?string $defaultOgAbs,
    ): array {
        $isVenuesPage = (bool) ($props['isVenuesPage'] ?? false);
        if ($isVenuesPage) {
            $pageTitle = 'Mekanlar - Sahnebul';
            $desc = 'Konser salonları, kulüpler ve etkinlik mekanlarını keşfedin; yorumlar, etkinlik takvimi ve rezervasyon Sahnebul’da.';
        } else {
            $pageTitle = 'Sahnebul — Konser, etkinlik ve mekan keşfi';
            $desc = $defaultDesc;
        }
        $fullTitle = SeoFormatting::buildDocumentTitle($pageTitle, $siteName);
        $canonical = SeoFormatting::normalizeCanonical($appUrl, $pathUrl);

        $out = [
            'title' => $fullTitle,
            'tags' => self::baseTags($fullTitle, SeoFormatting::truncateMetaDescription($desc), $canonical, $siteName, $locale, $defaultOgAbs, 'website'),
        ];

        if (! $isVenuesPage) {
            $out['jsonLd'] = [
                '@context' => 'https://schema.org',
                '@type' => 'WebSite',
                'name' => $siteName,
                'url' => $appUrl.'/',
                'potentialAction' => [
                    '@type' => 'SearchAction',
                    'target' => $appUrl.'/mekanlar?search={search_term_string}',
                    'query-input' => 'required name=search_term_string',
                ],
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}>, jsonLd?: array<string, mixed>}
     */
    private static function eventShow(
        array $props,
        string $pathUrl,
        string $siteName,
        string $appUrl,
        string $defaultDesc,
        string $locale,
        ?string $defaultOgAbs,
    ): array {
        $event = is_array($props['event'] ?? null) ? $props['event'] : [];
        $title = (string) ($event['title'] ?? 'Etkinlik');
        $description = isset($event['description']) ? (string) $event['description'] : '';
        $cover = isset($event['cover_image']) ? (string) $event['cover_image'] : '';
        $start = $event['start_date'] ?? null;
        $venue = is_array($event['venue'] ?? null) ? $event['venue'] : [];
        $venueName = (string) ($venue['name'] ?? '');
        $venueAddress = (string) ($venue['address'] ?? '');
        $cityName = is_array($venue['city'] ?? null) ? (string) ($venue['city']['name'] ?? '') : '';
        $artists = is_array($event['artists'] ?? null) ? $event['artists'] : [];

        $pageTitle = $title.' - Etkinlik';
        $fullTitle = SeoFormatting::buildDocumentTitle($pageTitle, $siteName);
        $plainDesc = SeoFormatting::stripHtmlToText($description);
        $dateStr = is_string($start) ? $start : (is_object($start) && method_exists($start, 'format') ? $start->format('c') : '');
        $localDate = '';
        if (is_string($start) && $start !== '') {
            try {
                $localDate = (new \DateTimeImmutable($start))->format('d.m.Y H:i');
            } catch (\Throwable) {
                $localDate = $start;
            }
        }
        $dateLine = $localDate !== '' ? 'Tarih: '.$localDate.'.' : 'Tarih yakında açıklanacak.';
        $desc = SeoFormatting::truncateMetaDescription(
            $plainDesc !== '' ? $plainDesc : $title.' — '.$venueName.($cityName !== '' ? ', '.$cityName : '').'. '.$dateLine.' Bilet ve detaylar Sahnebul’da.',
        );

        $canonical = SeoFormatting::normalizeCanonical($appUrl, $pathUrl);
        $ogImage = SeoFormatting::absoluteMediaUrl($cover, $appUrl);
        if ($ogImage === null) {
            foreach ($artists as $a) {
                if (! is_array($a)) {
                    continue;
                }
                $disp = isset($a['display_image']) ? (string) $a['display_image'] : '';
                $av = isset($a['avatar']) ? (string) $a['avatar'] : '';
                $ogImage = SeoFormatting::absoluteMediaUrl($disp !== '' ? $disp : $av, $appUrl);
                if ($ogImage !== null) {
                    break;
                }
            }
        }
        if ($ogImage === null && isset($venue['cover_image'])) {
            $ogImage = SeoFormatting::absoluteMediaUrl((string) $venue['cover_image'], $appUrl);
        }
        if ($ogImage === null) {
            $ogImage = $defaultOgAbs;
        }

        $startIso = '';
        if (is_string($start) && $start !== '') {
            try {
                $startIso = (new \DateTimeImmutable($start))->format('c');
            } catch (\Throwable) {
                $startIso = $start;
            }
        }

        $performer = [];
        foreach ($artists as $a) {
            if (! is_array($a)) {
                continue;
            }
            $n = (string) ($a['name'] ?? '');
            if ($n === '') {
                continue;
            }
            $performer[] = ['@type' => 'MusicGroup', 'name' => $n];
        }

        $jsonLd = [
            '@context' => 'https://schema.org',
            '@type' => 'MusicEvent',
            'name' => $title,
            'url' => $canonical,
            'description' => $desc,
            'eventAttendanceMode' => 'https://schema.org/OfflineEventAttendanceMode',
            'eventStatus' => 'https://schema.org/EventScheduled',
            'location' => [
                '@type' => 'Place',
                'name' => $venueName,
                'address' => [
                    '@type' => 'PostalAddress',
                    'streetAddress' => $venueAddress,
                    'addressLocality' => $cityName,
                    'addressCountry' => 'TR',
                ],
            ],
        ];
        if ($startIso !== '') {
            $jsonLd['startDate'] = $startIso;
        }
        if ($ogImage !== null) {
            $jsonLd['image'] = [$ogImage];
        }
        if ($performer !== []) {
            $jsonLd['performer'] = count($performer) === 1 ? $performer[0] : $performer;
        }

        return [
            'title' => $fullTitle,
            'tags' => self::baseTags($fullTitle, $desc, $canonical, $siteName, $locale, $ogImage, 'article'),
            'jsonLd' => $jsonLd,
        ];
    }

    /**
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}>, jsonLd?: array<string, mixed>}
     */
    private static function eventsIndex(
        string $pathUrl,
        string $siteName,
        string $appUrl,
        string $defaultDesc,
        string $locale,
        ?string $defaultOgAbs,
    ): array {
        $pageTitle = 'Etkinlikler & Konserler & Performanslar - Sahnebul';
        $fullTitle = SeoFormatting::buildDocumentTitle($pageTitle, $siteName);
        $desc = 'Zaman, tarz, kategori ve konuma göre filtreleyin; yaklaşan konserleri, performansları ve etkinlikleri keşfedin. Sahnebul’da bilet fiyatları ve mekan bilgileri.';
        $canonical = SeoFormatting::normalizeCanonical($appUrl, $pathUrl);

        return [
            'title' => $fullTitle,
            'tags' => self::baseTags($fullTitle, $desc, $canonical, $siteName, $locale, $defaultOgAbs, 'website'),
        ];
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}>, jsonLd?: array<string, mixed>}
     */
    private static function blogShow(
        array $props,
        string $pathUrl,
        string $siteName,
        string $appUrl,
        string $defaultDesc,
        string $locale,
        ?string $defaultOgAbs,
    ): array {
        $post = is_array($props['post'] ?? null) ? $props['post'] : [];
        $title = (string) ($post['title'] ?? 'Blog');
        $content = isset($post['content']) ? (string) $post['content'] : '';
        $cover = isset($post['cover_image']) ? (string) $post['cover_image'] : '';
        $publishedAt = isset($post['published_at']) ? (string) $post['published_at'] : '';
        $author = is_array($post['author'] ?? null) ? (string) ($post['author']['name'] ?? '') : '';

        $fullTitle = SeoFormatting::buildDocumentTitle($title, $siteName);
        $plain = SeoFormatting::stripHtmlToText($content);
        $desc = SeoFormatting::truncateMetaDescription(
            $plain !== '' ? $plain : $title.' — Sahnebul blog.',
        );
        $canonical = SeoFormatting::normalizeCanonical($appUrl, $pathUrl);
        $ogImage = SeoFormatting::absoluteMediaUrl($cover, $appUrl) ?? $defaultOgAbs;

        $publishedIso = '';
        if ($publishedAt !== '') {
            try {
                $publishedIso = (new \DateTimeImmutable($publishedAt))->format('c');
            } catch (\Throwable) {
                $publishedIso = $publishedAt;
            }
        }

        $tags = self::baseTags($fullTitle, $desc, $canonical, $siteName, $locale, $ogImage, 'article');
        if ($publishedIso !== '') {
            $tags[] = ['t' => 'meta', 'attrs' => ['property' => 'article:published_time', 'content' => $publishedIso]];
        }
        if ($author !== '') {
            $tags[] = ['t' => 'meta', 'attrs' => ['name' => 'author', 'content' => $author]];
        }

        $jsonLd = [
            '@context' => 'https://schema.org',
            '@type' => 'BlogPosting',
            'headline' => $title,
            'url' => $canonical,
            'description' => $desc,
        ];
        if ($ogImage !== null) {
            $jsonLd['image'] = [$ogImage];
        }
        if ($publishedIso !== '') {
            $jsonLd['datePublished'] = $publishedIso;
        }
        if ($author !== '') {
            $jsonLd['author'] = ['@type' => 'Person', 'name' => $author];
        }

        return [
            'title' => $fullTitle,
            'tags' => $tags,
            'jsonLd' => $jsonLd,
        ];
    }

    /**
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}>, jsonLd?: array<string, mixed>}
     */
    private static function blogIndex(
        string $pathUrl,
        string $siteName,
        string $appUrl,
        string $defaultDesc,
        string $locale,
        ?string $defaultOgAbs,
    ): array {
        $pageTitle = 'Blog - Sahnebul';
        $fullTitle = SeoFormatting::buildDocumentTitle($pageTitle, $siteName);
        $desc = 'Konser kültürü, mekan ipuçları ve Sahnebul haberleri; blog yazılarımızı keşfedin.';
        $canonical = SeoFormatting::normalizeCanonical($appUrl, $pathUrl);

        return [
            'title' => $fullTitle,
            'tags' => self::baseTags($fullTitle, $desc, $canonical, $siteName, $locale, $defaultOgAbs, 'website'),
        ];
    }

    /**
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}>, jsonLd?: array<string, mixed>}
     */
    private static function contact(
        string $pathUrl,
        string $siteName,
        string $appUrl,
        string $defaultDesc,
        string $locale,
        ?string $defaultOgAbs,
    ): array {
        $pageTitle = 'İletişim - Sahnebul';
        $fullTitle = SeoFormatting::buildDocumentTitle($pageTitle, $siteName);
        $desc = 'Sahnebul ile iletişime geçin; öneri, iş birliği ve destek talepleriniz için formu kullanabilirsiniz.';
        $canonical = SeoFormatting::normalizeCanonical($appUrl, $pathUrl);

        return [
            'title' => $fullTitle,
            'tags' => self::baseTags($fullTitle, $desc, $canonical, $siteName, $locale, $defaultOgAbs, 'website'),
        ];
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}>, jsonLd?: array<string, mixed>}
     */
    private static function legalPage(
        array $props,
        string $pathUrl,
        string $siteName,
        string $appUrl,
        string $defaultDesc,
        string $locale,
        ?string $defaultOgAbs,
    ): array {
        $title = (string) ($props['title'] ?? 'Sayfa');
        $content = isset($props['content']) ? (string) $props['content'] : '';
        $pageTitle = $title.' - Sahnebul';
        $fullTitle = SeoFormatting::buildDocumentTitle($pageTitle, $siteName);
        $plain = SeoFormatting::stripHtmlToText($content);
        $desc = SeoFormatting::truncateMetaDescription(
            $plain !== '' ? $plain : $title.' — Sahnebul.',
        );
        $canonical = SeoFormatting::normalizeCanonical($appUrl, $pathUrl);

        return [
            'title' => $fullTitle,
            'tags' => self::baseTags($fullTitle, $desc, $canonical, $siteName, $locale, $defaultOgAbs, 'article'),
        ];
    }

    /**
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}>, jsonLd?: array<string, mixed>}
     */
    private static function sehirSec(
        string $pathUrl,
        string $siteName,
        string $appUrl,
        string $defaultDesc,
        string $locale,
        ?string $defaultOgAbs,
    ): array {
        $pageTitle = 'Şehrini seç';
        $fullTitle = SeoFormatting::buildDocumentTitle($pageTitle, $siteName);
        $desc = 'Şehrine göre Sahnebul etkinlikleri — /etkinlikler ile aynı yayınlanmış program.';
        $canonical = SeoFormatting::normalizeCanonical($appUrl, $pathUrl);

        return [
            'title' => $fullTitle,
            'tags' => self::baseTags($fullTitle, $desc, $canonical, $siteName, $locale, $defaultOgAbs, 'website'),
        ];
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}>, jsonLd?: array<string, mixed>}
     */
    private static function sehirSecCity(
        array $props,
        string $pathUrl,
        string $siteName,
        string $appUrl,
        string $defaultDesc,
        string $locale,
        ?string $defaultOgAbs,
    ): array {
        $cityName = (string) ($props['cityName'] ?? 'Şehir');
        $pageTitle = $cityName.' — Popüler etkinlikler';
        $fullTitle = SeoFormatting::buildDocumentTitle($pageTitle, $siteName);
        $desc = $cityName.' etkinlikleri — /etkinlikler ile aynı platform kaydı. İlçe, tür ve kategoriye göre süzebilirsiniz.';
        $canonical = SeoFormatting::normalizeCanonical($appUrl, $pathUrl);

        return [
            'title' => $fullTitle,
            'tags' => self::baseTags($fullTitle, $desc, $canonical, $siteName, $locale, $defaultOgAbs, 'website'),
        ];
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{title: string, tags: list<array{t: string, attrs: array<string, string>}>, jsonLd?: array<string, mixed>}
     */
    private static function externalEventShow(
        array $props,
        string $pathUrl,
        string $siteName,
        string $appUrl,
        string $defaultDesc,
        string $locale,
        ?string $defaultOgAbs,
    ): array {
        $event = is_array($props['event'] ?? null) ? $props['event'] : [];
        $title = (string) ($event['title'] ?? 'Etkinlik özeti');
        $venueName = isset($event['venue_name']) ? (string) $event['venue_name'] : '';
        $cityName = isset($event['city_name']) ? (string) $event['city_name'] : '';
        $description = isset($event['description']) ? (string) $event['description'] : '';
        $imageUrl = isset($event['image_url']) ? (string) $event['image_url'] : '';

        $pageTitle = $title.' - Etkinlik özeti';
        $fullTitle = SeoFormatting::buildDocumentTitle($pageTitle, $siteName);
        $descRaw = trim($description) !== '' ? $description : $title.($venueName !== '' ? ' — '.$venueName : '').($cityName !== '' ? ', '.$cityName : '').'. Tarih ve fiyat bilgisi bilgilendirme amaçlıdır.';
        $desc = SeoFormatting::truncateMetaDescription($descRaw);
        $canonical = SeoFormatting::normalizeCanonical($appUrl, $pathUrl);
        $ogImage = preg_match('#^https?://#i', $imageUrl) === 1 ? $imageUrl : null;
        if ($ogImage === null) {
            $ogImage = $defaultOgAbs;
        }

        return [
            'title' => $fullTitle,
            'tags' => self::baseTags($fullTitle, $desc, $canonical, $siteName, $locale, $ogImage, 'article'),
        ];
    }

    /**
     * @return list<array{t: string, attrs: array<string, string>}>
     */
    private static function baseTags(
        string $fullTitle,
        string $desc,
        string $canonical,
        string $siteName,
        string $locale,
        ?string $absImage,
        string $ogType,
    ): array {
        $robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

        $tags = [
            ['t' => 'meta', 'attrs' => ['name' => 'description', 'content' => $desc]],
            ['t' => 'meta', 'attrs' => ['name' => 'robots', 'content' => $robots]],
            ['t' => 'link', 'attrs' => ['rel' => 'canonical', 'href' => $canonical]],
            ['t' => 'link', 'attrs' => ['rel' => 'alternate', 'hreflang' => 'tr', 'href' => $canonical]],
            ['t' => 'link', 'attrs' => ['rel' => 'alternate', 'hreflang' => 'x-default', 'href' => $canonical]],
            ['t' => 'meta', 'attrs' => ['property' => 'og:type', 'content' => $ogType]],
            ['t' => 'meta', 'attrs' => ['property' => 'og:site_name', 'content' => $siteName]],
            ['t' => 'meta', 'attrs' => ['property' => 'og:locale', 'content' => $locale]],
            ['t' => 'meta', 'attrs' => ['property' => 'og:title', 'content' => $fullTitle]],
            ['t' => 'meta', 'attrs' => ['property' => 'og:description', 'content' => $desc]],
            ['t' => 'meta', 'attrs' => ['property' => 'og:url', 'content' => $canonical]],
            ['t' => 'meta', 'attrs' => ['name' => 'twitter:card', 'content' => $absImage !== null ? 'summary_large_image' : 'summary']],
            ['t' => 'meta', 'attrs' => ['name' => 'twitter:title', 'content' => $fullTitle]],
            ['t' => 'meta', 'attrs' => ['name' => 'twitter:description', 'content' => $desc]],
        ];

        if ($absImage !== null && $absImage !== '') {
            $tags[] = ['t' => 'meta', 'attrs' => ['property' => 'og:image', 'content' => $absImage]];
            $tags[] = ['t' => 'meta', 'attrs' => ['property' => 'og:image:secure_url', 'content' => $absImage]];
            $tags[] = ['t' => 'meta', 'attrs' => ['property' => 'og:image:alt', 'content' => $fullTitle]];
            $tags[] = ['t' => 'meta', 'attrs' => ['name' => 'twitter:image', 'content' => $absImage]];
        }

        return $tags;
    }

    /**
     * @param  array<string, mixed>  $links
     * @return list<string>
     */
    private static function collectHttpUrls(array $links): array
    {
        $out = [];
        foreach ($links as $url) {
            if (! is_string($url)) {
                continue;
            }
            $u = trim($url);
            if (preg_match('#^https?://#i', $u) === 1) {
                $out[] = $u;
            }
        }

        return array_values(array_unique($out));
    }
}
