<?php

namespace App\Support;

use App\Models\Event;
use App\Models\Venue;

/**
 * Mekân detay sayfası: başlık, meta açıklama ve JSON-LD (etkinlik / konser bağlamı).
 */
final class VenuePageSeo
{
    /**
     * @return array{headTitleSegment: string, metaDescription: string, structuredData: array<string, mixed>}
     */
    public static function forLoadedVenue(Venue $venue, string $appUrl): array
    {
        $appUrl = rtrim($appUrl, '/');
        $canonical = SeoFormatting::normalizeCanonical($appUrl, '/mekanlar/'.$venue->slug);

        $city = $venue->relationLoaded('city') && $venue->city !== null
            ? trim((string) $venue->city->name)
            : '';
        $category = $venue->relationLoaded('category') && $venue->category !== null
            ? trim((string) $venue->category->name)
            : '';

        $headTitleSegment = self::buildHeadTitleSegment($venue->name, $city, $category);

        $events = $venue->relationLoaded('events')
            ? $venue->events
            : collect();
        $upcoming = self::filterUpcomingEvents($events);
        $metaDescription = self::buildMetaDescription($venue, $city, $category, $upcoming);

        $structuredData = self::buildStructuredData($venue, $canonical, $appUrl, $metaDescription, $upcoming);

        return [
            'headTitleSegment' => $headTitleSegment,
            'metaDescription' => $metaDescription,
            'structuredData' => $structuredData,
        ];
    }

    private static function buildHeadTitleSegment(string $venueName, string $city, string $category): string
    {
        $venueName = trim($venueName) !== '' ? trim($venueName) : 'Mekan';
        $parts = [$venueName];
        if ($city !== '') {
            $parts[] = $city.' konser ve etkinlik mekanı';
        } else {
            $parts[] = 'konser ve etkinlik mekanı';
        }
        if ($category !== '') {
            $parts[] = $category;
        }

        return implode(' · ', $parts);
    }

    /**
     * @param  iterable<int, Event>  $events
     * @return list<Event>
     */
    private static function filterUpcomingEvents(iterable $events): array
    {
        $now = now();
        $out = [];
        foreach ($events as $e) {
            if (! $e instanceof Event) {
                continue;
            }
            if ($e->start_date === null || $e->start_date->lt($now)) {
                continue;
            }
            $out[] = $e;
        }

        return $out;
    }

    /**
     * @param  list<Event>  $upcoming
     */
    private static function buildMetaDescription(Venue $venue, string $city, string $category, array $upcoming): string
    {
        $name = trim($venue->name) !== '' ? trim($venue->name) : 'Mekan';
        $plain = SeoFormatting::stripHtmlToText((string) ($venue->description ?? ''));
        $lead = $plain !== ''
            ? SeoFormatting::truncateMetaDescription($plain, 118)
            : '';

        $loc = $city !== '' ? $name.' — '.$city : $name;
        $catBit = $category !== '' ? $category.' kategorisinde ' : '';

        $nUp = count($upcoming);
        $titles = array_map(fn (Event $e) => trim((string) $e->title), array_slice($upcoming, 0, 3));
        $titles = array_values(array_filter($titles, fn (string $t) => $t !== ''));

        if ($nUp > 0 && $titles !== []) {
            $sample = implode(', ', $titles);
            $more = $nUp > count($titles) ? sprintf(' ve %d etkinlik daha', $nUp - count($titles)) : '';
            $eventsLine = sprintf(
                'Yaklaşan konser ve etkinlikler: %s%s. ',
                $sample,
                $more
            );
        } elseif ($nUp > 0) {
            $eventsLine = sprintf('%d yaklaşan etkinlik ve konser programı. ', $nUp);
        } else {
            $eventsLine = 'Etkinlik takvimi, yorumlar ve rezervasyon bilgisi. ';
        }

        $tail = $catBit.'Sahnebul üzerinden programı inceleyin, yorumları okuyun ve rezervasyon yapın.';

        $raw = trim($lead !== '' ? $lead.' '.$eventsLine.$tail : $loc.'. '.$eventsLine.$tail);

        return SeoFormatting::truncateMetaDescription($raw);
    }

    /**
     * @param  list<Event>  $upcoming
     * @return array<string, mixed>
     */
    private static function buildStructuredData(
        Venue $venue,
        string $canonical,
        string $appUrl,
        string $desc,
        array $upcoming,
    ): array {
        $name = trim($venue->name) !== '' ? trim($venue->name) : 'Mekan';
        $city = $venue->relationLoaded('city') && $venue->city !== null
            ? trim((string) $venue->city->name)
            : '';
        $address = (string) ($venue->address ?? '');
        $cover = isset($venue->cover_image) ? trim((string) $venue->cover_image) : '';
        $ogImage = SeoFormatting::absoluteMediaUrl($cover !== '' ? $cover : null, $appUrl);

        $venueId = $canonical.'#venue';
        $sameAs = self::collectSameAs($venue);

        $localBusiness = [
            '@type' => ['LocalBusiness', 'EventVenue'],
            '@id' => $venueId,
            'name' => $name,
            'url' => $canonical,
            'description' => SeoFormatting::truncateMetaDescription($desc, 5000),
            'address' => [
                '@type' => 'PostalAddress',
                'streetAddress' => $address,
                'addressLocality' => $city,
                'addressCountry' => 'TR',
            ],
        ];

        if ($ogImage !== null) {
            $localBusiness['image'] = [$ogImage];
        }

        if ($venue->latitude !== null && $venue->longitude !== null) {
            $localBusiness['geo'] = [
                '@type' => 'GeoCoordinates',
                'latitude' => (float) $venue->latitude,
                'longitude' => (float) $venue->longitude,
            ];
        }

        $phone = isset($venue->phone) ? trim((string) $venue->phone) : '';
        if ($phone !== '') {
            $localBusiness['telephone'] = preg_replace('/\s+/', '', $phone) ?? $phone;
        }

        if ($sameAs !== []) {
            $localBusiness['sameAs'] = $sameAs;
        }

        $ratingAvg = (float) ($venue->rating_avg ?? 0);
        $reviewCount = (int) ($venue->reviews_count ?? 0);
        if ($reviewCount <= 0 && isset($venue->review_count)) {
            $reviewCount = (int) $venue->review_count;
        }

        if ($reviewCount > 0 && $ratingAvg > 0) {
            $localBusiness['aggregateRating'] = [
                '@type' => 'AggregateRating',
                'ratingValue' => (string) $ratingAvg,
                'bestRating' => '5',
                'worstRating' => '1',
                'reviewCount' => (string) $reviewCount,
            ];
        }

        if ($venue->relationLoaded('reviews') && $venue->reviews->isNotEmpty()) {
            $reviewNodes = [];
            foreach ($venue->reviews->take(8) as $r) {
                $row = [
                    '@type' => 'Review',
                    'author' => ['@type' => 'Person', 'name' => (string) ($r->user?->name ?? 'Kullanıcı')],
                    'datePublished' => $r->created_at !== null
                        ? $r->created_at->format('Y-m-d')
                        : '',
                    'reviewRating' => [
                        '@type' => 'Rating',
                        'ratingValue' => (string) $r->rating,
                        'bestRating' => '5',
                        'worstRating' => '1',
                    ],
                ];
                $comment = isset($r->comment) ? trim((string) $r->comment) : '';
                if ($comment !== '') {
                    $row['reviewBody'] = $comment;
                }
                $reviewNodes[] = $row;
            }
            if ($reviewNodes !== []) {
                $localBusiness['review'] = $reviewNodes;
            }
        }

        $graph = [
            [
                '@type' => 'BreadcrumbList',
                '@id' => $canonical.'#breadcrumb',
                'itemListElement' => [
                    [
                        '@type' => 'ListItem',
                        'position' => 1,
                        'name' => 'Ana sayfa',
                        'item' => $appUrl.'/',
                    ],
                    [
                        '@type' => 'ListItem',
                        'position' => 2,
                        'name' => 'Mekanlar',
                        'item' => $appUrl.'/mekanlar',
                    ],
                    [
                        '@type' => 'ListItem',
                        'position' => 3,
                        'name' => $name,
                        'item' => $canonical,
                    ],
                ],
            ],
            $localBusiness,
        ];

        if ($upcoming !== []) {
            $elements = [];
            $pos = 1;
            foreach (array_slice($upcoming, 0, 12) as $e) {
                $url = SeoFormatting::normalizeCanonical($appUrl, '/etkinlikler/'.$e->publicUrlSegment());
                $elements[] = [
                    '@type' => 'ListItem',
                    'position' => $pos,
                    'name' => (string) $e->title,
                    'item' => $url,
                ];
                $pos++;
            }
            if ($elements !== []) {
                $graph[] = [
                    '@type' => 'ItemList',
                    '@id' => $canonical.'#upcoming-events',
                    'name' => $name.' — yaklaşan konser ve etkinlikler',
                    'numberOfItems' => count($elements),
                    'itemListElement' => $elements,
                ];
            }
        }

        return [
            '@context' => 'https://schema.org',
            '@graph' => $graph,
        ];
    }

    /**
     * @return list<string>
     */
    private static function collectSameAs(Venue $venue): array
    {
        $out = [];
        $web = isset($venue->website) ? trim((string) $venue->website) : '';
        if ($web !== '' && preg_match('#^https?://#i', $web) === 1) {
            $out[] = $web;
        }
        $links = is_array($venue->social_links) ? $venue->social_links : [];
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
