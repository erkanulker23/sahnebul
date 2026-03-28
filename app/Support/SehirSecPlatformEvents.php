<?php

namespace App\Support;

use App\Http\Controllers\SehirSecController;
use App\Models\Event;
use Illuminate\Support\Facades\Schema;

final class SehirSecPlatformEvents
{
    private const PER_CITY_LIMIT = 24;

    /**
     * Şehir detay sayfası: tek şehir, isteğe bağlı kategori (dış kaynakla aynı isim eşlemesi).
     *
     * @return list<array<string, mixed>>
     */
    public static function listForCitySlug(string $citySlug, ?string $categoryNameExact = null): array
    {
        if (! Schema::hasTable('events')) {
            return [];
        }

        $allowed = array_keys(SehirSecController::CITY_ORDER);
        if (! in_array($citySlug, $allowed, true)) {
            return [];
        }

        $q = EventListingQuery::base()
            ->whereHas('venue.city', fn ($q) => $q->where('slug', $citySlug));

        if ($categoryNameExact !== null && $categoryNameExact !== '') {
            $q->whereHas('venue.category', fn ($q) => $q->where('name', $categoryNameExact));
        }

        $events = EventListingQuery::applyDefaultOrder(
            $q->with([
                'venue:id,name,slug,city_id,district_id,category_id,cover_image',
                'venue.city:id,name',
                'venue.district:id,name',
                'venue.category:id,name,slug',
                'artists:id,name,slug,avatar,genre',
            ])
        )
            ->limit(self::PER_CITY_LIMIT)
            ->get();

        return $events->map(fn (Event $e) => self::toPublicTicketCardProps($e))->all();
    }

    /**
     * Ana /sehir-sec: her sabit şehir slug’ı için bugünden itibaren yayınlanmış platform etkinlikleri.
     *
     * @return array<string, list<array<string, mixed>>>
     */
    public static function groupedBySehirSlug(): array
    {
        $slugs = array_keys(SehirSecController::CITY_ORDER);
        $out = array_fill_keys($slugs, []);

        if (! Schema::hasTable('events')) {
            return $out;
        }

        $events = EventListingQuery::applyDefaultOrder(
            EventListingQuery::base()
                ->whereHas('venue.city', fn ($q) => $q->whereIn('slug', $slugs))
                ->with([
                    'venue:id,name,slug,city_id,district_id,category_id,cover_image',
                    'venue.city:id,name,slug',
                    'venue.district:id,name',
                    'venue.category:id,name,slug',
                    'artists:id,name,slug,avatar,genre',
                ])
        )->get();

        foreach ($events as $event) {
            $slug = $event->venue?->city?->slug;
            if ($slug === null || ! in_array($slug, $slugs, true)) {
                continue;
            }
            if (count($out[$slug]) >= self::PER_CITY_LIMIT) {
                continue;
            }
            $out[$slug][] = self::toPublicTicketCardProps($event);
        }

        return $out;
    }

    /**
     * /etkinlikler ile aynı PublicEventTicketCard alanları.
     *
     * @return array<string, mixed>
     */
    public static function toPublicTicketCardProps(Event $event): array
    {
        $event->loadMissing([
            'venue.category',
            'venue.city',
            'venue.district',
            'artists',
        ]);

        $venue = $event->venue;

        return [
            'id' => $event->id,
            'slug' => $event->slug,
            'title' => $event->title,
            'start_date' => $event->start_date?->toIso8601String() ?? '',
            'end_date' => $event->end_date?->toIso8601String(),
            'cover_image' => $event->cover_image,
            'listing_image' => $event->listing_image,
            'status' => $event->status,
            'is_full' => $event->is_full,
            'ticket_acquisition_mode' => $event->ticket_acquisition_mode,
            'sahnebul_reservation_enabled' => $event->sahnebul_reservation_enabled,
            'entry_is_paid' => $event->entry_is_paid,
            'venue' => $venue === null ? [
                'name' => '',
                'slug' => '',
            ] : [
                'name' => $venue->name,
                'slug' => $venue->slug ?? '',
                'cover_image' => $venue->cover_image,
                'category' => $venue->category
                    ? ['name' => $venue->category->name, 'slug' => $venue->category->slug]
                    : null,
                'city' => $venue->city ? ['name' => $venue->city->name] : null,
                'district' => $venue->district ? ['name' => $venue->district->name] : null,
            ],
            'artists' => $event->artists
                ->map(fn ($a) => [
                    'id' => $a->id,
                    'name' => $a->name,
                    'slug' => $a->slug ?? '',
                    'avatar' => $a->avatar,
                    'genre' => $a->genre,
                ])
                ->values()
                ->all(),
        ];
    }
}
