<?php

namespace App\Support;

use App\Models\Artist;
use App\Models\Event;
use App\Models\User;
use App\Services\AppSettingsService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Google yapılandırılmış veri (JSON-LD) — etkinlik, sanatçı ve site organizasyonu.
 */
final class PublicStructuredData
{
    /**
     * @return array{siteName: string, appUrl: string, logoAbsolute: ?string}
     */
    public static function siteContextForStructuredData(): array
    {
        $appSettings = app(AppSettingsService::class);
        $appUrl = rtrim((string) config('app.url'), '/');
        $sitePublic = $appSettings->getSitePublicSettings();
        $siteNameFromDb = isset($sitePublic['site_name']) ? trim((string) $sitePublic['site_name']) : '';
        $siteName = $siteNameFromDb !== '' ? $siteNameFromDb : (string) config('app.name', 'Sahnebul');
        $logoPath = isset($sitePublic['logo_path']) && is_string($sitePublic['logo_path']) ? trim($sitePublic['logo_path']) : '';
        $logoAbs = $logoPath !== '' ? $appSettings->publicStorageUrl($logoPath) : null;
        $logoAbsolute = is_string($logoAbs) && $logoAbs !== '' ? SeoFormatting::toAbsoluteUrl($logoAbs, $appUrl) : null;

        return [
            'siteName' => $siteName,
            'appUrl' => $appUrl,
            'logoAbsolute' => $logoAbsolute,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function organizationNode(string $siteName, string $appUrl, ?string $logoAbsolute): array
    {
        $base = rtrim($appUrl, '/');
        $node = [
            '@type' => 'Organization',
            '@id' => $base.'/#organization',
            'name' => $siteName,
            'url' => $base.'/',
        ];
        if ($logoAbsolute !== null && $logoAbsolute !== '') {
            $node['logo'] = [
                '@type' => 'ImageObject',
                'url' => $logoAbsolute,
            ];
        }

        return $node;
    }

    /**
     * Ana sayfa: Organization + WebSite (publisher, dil, Sitelinks arama kutusu).
     *
     * @return array<string, mixed>
     */
    public static function homePageGraph(): array
    {
        $ctx = self::siteContextForStructuredData();
        $siteName = $ctx['siteName'];
        $appUrl = rtrim($ctx['appUrl'], '/');
        $logoAbsolute = $ctx['logoAbsolute'];

        $org = self::organizationNode($siteName, $appUrl, $logoAbsolute);

        $website = [
            '@type' => 'WebSite',
            '@id' => $appUrl.'/#website',
            'url' => $appUrl.'/',
            'name' => $siteName,
            'inLanguage' => 'tr-TR',
            'publisher' => ['@id' => $appUrl.'/#organization'],
            'potentialAction' => [
                '@type' => 'SearchAction',
                'target' => $appUrl.'/etkinlikler?search={search_term_string}',
                'query-input' => 'required name=search_term_string',
            ],
        ];

        return [
            '@context' => 'https://schema.org',
            '@graph' => [$org, $website],
        ];
    }

    /**
     * @param  LengthAwarePaginator<User>  $paginator
     * @return array<string, mixed>|null
     */
    public static function organizationsIndexItemList(LengthAwarePaginator $paginator, string $appUrl): ?array
    {
        $appUrl = rtrim($appUrl, '/');
        $elements = [];
        $pos = 1;
        foreach ($paginator->items() as $row) {
            if (! $row instanceof User) {
                continue;
            }
            $slug = trim((string) ($row->organization_public_slug ?? ''));
            if ($slug === '') {
                continue;
            }
            $name = trim((string) ($row->organization_display_name ?? ''));
            if ($name === '') {
                $name = trim((string) $row->name);
            }
            $url = SeoFormatting::normalizeCanonical($appUrl, '/organizasyonlar/'.$slug);
            $elements[] = [
                '@type' => 'ListItem',
                'position' => $pos,
                'item' => $url,
                'name' => $name !== '' ? $name : $slug,
            ];
            $pos++;
            if ($pos > 24) {
                break;
            }
        }

        if ($elements === []) {
            return null;
        }

        return [
            '@context' => 'https://schema.org',
            '@type' => 'ItemList',
            'name' => 'Organizasyon firmaları',
            'numberOfItems' => count($elements),
            'itemListElement' => $elements,
        ];
    }

    /**
     * Tek etkinlik için schema.org Event düğümü (sanatçı profili @graph tekrarı ve etkinlik sayfası ile aynı @id).
     *
     * @return array<string, mixed>
     */
    public static function buildEventSchemaNode(Event $event): array
    {
        $ctx = self::siteContextForStructuredData();
        $siteName = $ctx['siteName'];
        $appUrl = $ctx['appUrl'];
        $canonical = SeoFormatting::normalizeCanonical($appUrl, '/etkinlikler/'.$event->publicUrlSegment());

        $plainDesc = SeoFormatting::stripHtmlToText((string) ($event->description ?? ''));
        $description = SeoFormatting::truncateMetaDescription(
            $plainDesc !== '' ? $plainDesc : $event->title.' — etkinlik detayı '.$siteName.' üzerinde.',
        );

        $venue = $event->venue;
        $venueName = $venue !== null ? (string) $venue->name : '';
        $venueAddress = $venue !== null ? (string) $venue->address : '';
        $cityName = ($venue !== null && $venue->relationLoaded('city') && $venue->city !== null)
            ? (string) $venue->city->name
            : '';
        $lat = ($venue !== null && $venue->latitude !== null) ? (float) $venue->latitude : null;
        $lng = ($venue !== null && $venue->longitude !== null) ? (float) $venue->longitude : null;

        $cover = $event->cover_image !== null ? (string) $event->cover_image : '';
        $listing = $event->listing_image !== null ? (string) $event->listing_image : '';
        $ogImage = SeoFormatting::absoluteMediaUrl($listing !== '' ? $listing : $cover, $appUrl);
        if ($ogImage === null && $venue !== null && $venue->cover_image) {
            $ogImage = SeoFormatting::absoluteMediaUrl((string) $venue->cover_image, $appUrl);
        }
        if ($ogImage === null) {
            $defaultOg = config('sahnebul.default_og_image');
            $ogImage = is_string($defaultOg) && $defaultOg !== ''
                ? SeoFormatting::toAbsoluteUrl($defaultOg, $appUrl)
                : null;
        }

        $startIso = $event->start_date !== null ? $event->start_date->format('c') : null;
        $endIso = $event->end_date !== null ? $event->end_date->format('c') : null;

        $eventStatusUri = $event->status === 'cancelled'
            ? 'https://schema.org/EventCancelled'
            : 'https://schema.org/EventScheduled';

        $slug = isset($event->event_type) && is_string($event->event_type) ? $event->event_type : null;
        $schemaType = EventListingTypes::schemaOrgEventType($slug);
        $performerThing = EventListingTypes::schemaOrgPerformerType($slug);

        $performer = [];
        if ($event->relationLoaded('artists')) {
            foreach ($event->artists as $a) {
                $n = trim((string) ($a->name ?? ''));
                if ($n !== '') {
                    $performer[] = ['@type' => $performerThing, 'name' => $n];
                }
            }
        }

        $location = [
            '@type' => 'Place',
            'name' => $venueName,
            'address' => [
                '@type' => 'PostalAddress',
                'streetAddress' => $venueAddress,
                'addressLocality' => $cityName,
                'addressCountry' => 'TR',
            ],
        ];
        if ($lat !== null && $lng !== null) {
            $location['geo'] = [
                '@type' => 'GeoCoordinates',
                'latitude' => $lat,
                'longitude' => $lng,
            ];
        }

        $typeLabel = EventListingTypes::labelFor($slug);
        $eventNode = [
            '@type' => $schemaType,
            '@id' => $canonical.'#event',
            'name' => $event->title,
            'url' => $canonical,
            'description' => $description,
            'inLanguage' => 'tr-TR',
            'eventAttendanceMode' => 'https://schema.org/OfflineEventAttendanceMode',
            'eventStatus' => $eventStatusUri,
            'location' => $location,
            'organizer' => ['@id' => rtrim($appUrl, '/').'/#organization'],
        ];
        if ($typeLabel !== null) {
            $eventNode['category'] = $typeLabel;
        }
        if (! ($event->entry_is_paid ?? true)) {
            $eventNode['isAccessibleForFree'] = true;
        }
        if ($startIso !== null) {
            $eventNode['startDate'] = $startIso;
        }
        if ($endIso !== null) {
            $eventNode['endDate'] = $endIso;
        }
        if ($ogImage !== null) {
            $eventNode['image'] = [$ogImage];
        }
        if (count($performer) === 1) {
            $eventNode['performer'] = $performer[0];
        } elseif (count($performer) > 1) {
            $eventNode['performer'] = $performer;
        }

        $offers = self::buildOffersForEvent($event, $canonical);
        if ($offers !== null) {
            $eventNode['offers'] = $offers;
        }

        return $eventNode;
    }

    /**
     * @return array<string, mixed>
     */
    public static function eventShowGraph(Event $event): array
    {
        $ctx = self::siteContextForStructuredData();
        $siteName = $ctx['siteName'];
        $appUrl = $ctx['appUrl'];
        $logoAbsolute = $ctx['logoAbsolute'];
        $canonical = SeoFormatting::normalizeCanonical($appUrl, '/etkinlikler/'.$event->publicUrlSegment());

        $org = self::organizationNode($siteName, $appUrl, $logoAbsolute);
        $eventNode = self::buildEventSchemaNode($event);

        $breadcrumbs = [
            '@type' => 'BreadcrumbList',
            '@id' => $canonical.'#breadcrumb',
            'itemListElement' => [
                [
                    '@type' => 'ListItem',
                    'position' => 1,
                    'name' => 'Ana sayfa',
                    'item' => rtrim($appUrl, '/').'/',
                ],
                [
                    '@type' => 'ListItem',
                    'position' => 2,
                    'name' => 'Etkinlikler',
                    'item' => rtrim($appUrl, '/').'/etkinlikler',
                ],
                [
                    '@type' => 'ListItem',
                    'position' => 3,
                    'name' => $event->title,
                    'item' => $canonical,
                ],
            ],
        ];

        return [
            '@context' => 'https://schema.org',
            '@graph' => [$org, $eventNode, $breadcrumbs],
        ];
    }

    /**
     * Google Search Console: Offer / AggregateOffer için önerilen validFrom (satışın geçerlilik başlangıcı).
     * Ayrı bir “bilet satış başlangıç” alanı yok; kayıt oluşturulma zamanı makul bir alt sınır.
     *
     * @param  array<string, mixed>  $offer
     * @return array<string, mixed>
     */
    private static function withOfferValidFrom(Event $event, array $offer): array
    {
        if ($event->created_at !== null) {
            $offer['validFrom'] = $event->created_at->format('c');
        }

        return $offer;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function buildOffersForEvent(Event $event, string $canonical): ?array
    {
        $mode = $event->ticket_acquisition_mode ?? Event::TICKET_MODE_SAHNEBUL;
        $outlets = is_array($event->ticket_outlets) ? $event->ticket_outlets : [];
        $ticketUrl = $canonical;
        if ($mode === Event::TICKET_MODE_EXTERNAL && $outlets !== []) {
            $u = isset($outlets[0]['url']) ? trim((string) $outlets[0]['url']) : '';
            if ($u !== '' && filter_var($u, FILTER_VALIDATE_URL)) {
                $ticketUrl = $u;
            }
        }

        $availability = $event->is_full
            ? 'https://schema.org/SoldOut'
            : 'https://schema.org/InStock';

        if (! ($event->entry_is_paid ?? true)) {
            return self::withOfferValidFrom($event, [
                '@type' => 'Offer',
                'url' => $ticketUrl,
                'price' => 0,
                'priceCurrency' => 'TRY',
                'availability' => $availability,
            ]);
        }

        $prices = [];
        foreach ($event->ticketTiers as $t) {
            if (isset($t->price) && is_numeric($t->price)) {
                $prices[] = (float) $t->price;
            }
        }
        if ($prices === [] && $event->ticket_price !== null) {
            $prices[] = (float) $event->ticket_price;
        }

        if (count($prices) >= 2) {
            return self::withOfferValidFrom($event, [
                '@type' => 'AggregateOffer',
                'url' => $ticketUrl,
                'lowPrice' => min($prices),
                'highPrice' => max($prices),
                'priceCurrency' => 'TRY',
                'availability' => $availability,
                'offerCount' => count($prices),
            ]);
        }

        if (count($prices) === 1) {
            return self::withOfferValidFrom($event, [
                '@type' => 'Offer',
                'url' => $ticketUrl,
                'price' => round($prices[0], 2),
                'priceCurrency' => 'TRY',
                'availability' => $availability,
            ]);
        }

        return self::withOfferValidFrom($event, [
            '@type' => 'Offer',
            'url' => $ticketUrl,
            'availability' => $availability,
        ]);
    }

    /**
     * @param  iterable<int, mixed>  $upcomingEvents  Yaklaşan yayınlanmış etkinlikler (venue + city yüklü; JSON-LD için artists ve ticketTiers önerilir)
     * @return array<string, mixed>
     */
    public static function artistShowGraph(Artist $artist, iterable $upcomingEvents = []): array
    {
        $ctx = self::siteContextForStructuredData();
        $siteName = $ctx['siteName'];
        $appUrl = $ctx['appUrl'];
        $logoAbsolute = $ctx['logoAbsolute'];
        $canonical = SeoFormatting::normalizeCanonical($appUrl, '/sanatcilar/'.$artist->slug);

        $org = self::organizationNode($siteName, $appUrl, $logoAbsolute);

        $name = (string) $artist->name;
        $bioPlain = SeoFormatting::stripHtmlToText((string) ($artist->bio ?? ''));
        $genre = isset($artist->genre) && is_string($artist->genre) ? trim($artist->genre) : '';
        $keywordLead = $name.' konserleri, performansları ve etkinlikleri';
        $genreSuffix = $genre !== '' ? ' Tür: '.$genre.'.' : '';
        $description = SeoFormatting::truncateMetaDescription(
            $bioPlain !== ''
                ? $keywordLead.'. '.$bioPlain
                : $keywordLead.'. Yaklaşan ve geçmiş konserler Sahnebul’da.'.$genreSuffix,
        );

        $avatar = SeoFormatting::absoluteMediaUrl(
            is_string($artist->avatar) ? $artist->avatar : null,
            $appUrl,
        );
        $banner = SeoFormatting::absoluteMediaUrl(
            is_string($artist->banner_image ?? null) ? (string) $artist->banner_image : null,
            $appUrl,
        );

        $sameAs = self::collectArtistSameAs($artist);

        $musicGroup = [
            '@type' => 'MusicGroup',
            '@id' => $canonical.'#artist',
            'name' => $name,
            'url' => $canonical,
            'description' => $description,
            'inLanguage' => 'tr-TR',
        ];
        if ($genre !== '') {
            $musicGroup['genre'] = $genre;
        }
        $images = array_values(array_filter([$banner, $avatar]));
        if ($images !== []) {
            $musicGroup['image'] = $images;
        }
        if ($sameAs !== []) {
            $musicGroup['sameAs'] = $sameAs;
        }

        $breadcrumbs = [
            '@type' => 'BreadcrumbList',
            '@id' => $canonical.'#breadcrumb',
            'itemListElement' => [
                [
                    '@type' => 'ListItem',
                    'position' => 1,
                    'name' => 'Ana sayfa',
                    'item' => rtrim($appUrl, '/').'/',
                ],
                [
                    '@type' => 'ListItem',
                    'position' => 2,
                    'name' => 'Sanatçılar',
                    'item' => rtrim($appUrl, '/').'/sanatcilar',
                ],
                [
                    '@type' => 'ListItem',
                    'position' => 3,
                    'name' => $name,
                    'item' => $canonical,
                ],
            ],
        ];

        $graph = [$org, $musicGroup];

        $listed = [];
        foreach ($upcomingEvents as $ev) {
            if ($ev instanceof Event) {
                $listed[] = $ev;
            }
        }
        $listed = array_slice($listed, 0, 24);

        if ($listed !== []) {
            $listItems = [];
            $pos = 1;
            foreach ($listed as $ev) {
                $eventUrl = SeoFormatting::normalizeCanonical($appUrl, '/etkinlikler/'.$ev->publicUrlSegment());
                $listItems[] = [
                    '@type' => 'ListItem',
                    'position' => $pos,
                    'name' => $ev->title,
                    'item' => $eventUrl,
                ];
                $pos++;
            }
            $graph[] = [
                '@type' => 'ItemList',
                '@id' => $canonical.'#upcoming-events',
                'name' => $name.' — yaklaşan etkinlikler',
                'numberOfItems' => count($listItems),
                'itemListElement' => $listItems,
            ];
            foreach ($listed as $ev) {
                $graph[] = self::buildEventSchemaNode($ev);
            }
        }

        $graph[] = $breadcrumbs;

        return [
            '@context' => 'https://schema.org',
            '@graph' => $graph,
        ];
    }

    /**
     * @return list<string>
     */
    private static function collectArtistSameAs(Artist $artist): array
    {
        $out = [];
        $website = isset($artist->website) ? trim((string) $artist->website) : '';
        if ($website !== '' && preg_match('#^https?://#i', $website) === 1) {
            $out[] = $website;
        }
        if (! (bool) ($artist->spotify_auto_link_disabled ?? false)) {
            $spotifyUrl = isset($artist->spotify_url) ? trim((string) $artist->spotify_url) : '';
            if ($spotifyUrl !== '' && preg_match('#^https?://#i', $spotifyUrl) === 1) {
                $out[] = $spotifyUrl;
            }
        }
        $links = is_array($artist->social_links) ? $artist->social_links : [];
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
