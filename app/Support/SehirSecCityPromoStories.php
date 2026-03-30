<?php

namespace App\Support;

use App\Models\Event;

/**
 * Şehir seç sayfası (/sehir-sec/{city}): kadrodaki sanatçılar için,
 * o şehirdeki yayında etkinliklerin tanıtım “hikâye” (video / Reels vb.) satırları — Instagram şeridi verisi.
 */
final class SehirSecCityPromoStories
{
    /**
     * @return list<array{artist: array{id: int, name: string, slug: string, avatar: ?string}, segments: list<array{event_id: int, event_title: string, event_slug_segment: string, embed_url: ?string, video_path: ?string, poster_path: ?string}>}>
     */
    public static function ringsForCitySlug(string $citySlug): array
    {
        $events = EventListingQuery::base()
            ->whereHas('venue.city', fn ($q) => $q->where('slug', $citySlug))
            ->where(function ($q) {
                $q->where(fn ($q2) => $q2->whereNotNull('promo_video_path')->where('promo_video_path', '!=', ''))
                    ->orWhere(fn ($q2) => $q2->whereNotNull('promo_embed_url')->where('promo_embed_url', '!=', ''))
                    ->orWhereNotNull('promo_gallery');
            })
            ->with(['artists:id,name,slug,avatar'])
            ->orderByRaw('CASE WHEN start_date IS NULL THEN 1 ELSE 0 END')
            ->orderBy('start_date')
            ->limit(200)
            ->get();

        $byArtist = [];

        foreach ($events as $event) {
            if (! $event instanceof Event) {
                continue;
            }
            $until = $event->promoProfileDisplayUntil();
            if ($until === null || $until->lt(now())) {
                continue;
            }
            $rows = $event->normalizedPromoGalleryRowsForPublic();
            $storyRows = [];
            foreach ($rows as $row) {
                if (! Event::promoRowHasPublicContent($row)) {
                    continue;
                }
                if (Event::promoRowKindForPublic($row) !== 'story') {
                    continue;
                }
                $storyRows[] = $row;
            }
            if ($storyRows === []) {
                continue;
            }

            $ts = $event->start_date?->getTimestamp() ?? \PHP_INT_MAX;

            foreach ($event->artists as $artist) {
                $id = (int) $artist->id;
                if (! isset($byArtist[$id])) {
                    $byArtist[$id] = [
                        'artist' => [
                            'id' => $id,
                            'name' => (string) $artist->name,
                            'slug' => (string) $artist->slug,
                            'avatar' => $artist->avatar ? (string) $artist->avatar : null,
                        ],
                        'segments' => [],
                        '_sort' => $ts,
                    ];
                }
                $byArtist[$id]['_sort'] = min($byArtist[$id]['_sort'], $ts);
                foreach ($storyRows as $row) {
                    $byArtist[$id]['segments'][] = [
                        'event_id' => $event->id,
                        'event_title' => (string) $event->title,
                        'event_slug_segment' => $event->publicUrlSegment(),
                        'embed_url' => isset($row['embed_url']) && is_string($row['embed_url']) ? $row['embed_url'] : null,
                        'video_path' => isset($row['video_path']) && is_string($row['video_path']) ? $row['video_path'] : null,
                        'poster_path' => isset($row['poster_path']) && is_string($row['poster_path']) ? $row['poster_path'] : null,
                    ];
                }
            }
        }

        $list = array_values($byArtist);
        usort($list, fn (array $a, array $b): int => ($a['_sort'] ?? 0) <=> ($b['_sort'] ?? 0));

        return array_map(static function (array $row): array {
            unset($row['_sort']);

            return $row;
        }, $list);
    }
}
