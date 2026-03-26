<?php

namespace App\Support;

use App\Http\Controllers\SehirSecController;
use App\Models\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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
                'venue:id,name,city_id,district_id,category_id,cover_image',
                'venue.city:id,name',
                'venue.district:id,name',
                'venue.category:id,name',
                'ticketTiers:id,event_id,price',
            ])
        )
            ->limit(self::PER_CITY_LIMIT)
            ->get();

        return $events->map(fn (Event $e) => self::serializeCard($e, $citySlug))->all();
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
                    'venue:id,name,city_id,district_id,category_id,cover_image',
                    'venue.city:id,name,slug',
                    'venue.district:id,name',
                    'venue.category:id,name',
                    'ticketTiers:id,event_id,price',
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
            $out[$slug][] = self::serializeCard($event, $slug);
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    public static function serializeCard(Event $event, string $citySlug): array
    {
        $venue = $event->venue;
        $image = self::publicImageUrl($event->listingThumbnailPath()) ?? self::publicImageUrl($venue?->cover_image);

        $price = $event->minPrice();
        $priceLabel = $price !== null ? number_format($price, 2, ',', '.').' ₺' : null;

        return [
            'item_key' => 'evt-'.$event->id,
            'id' => $event->id,
            'title' => $event->title,
            'image_url' => $image,
            'venue_name' => $venue?->name,
            'dates_line' => $event->start_date?->timezone(config('app.timezone'))->translatedFormat('d F Y, H:i'),
            'price_label' => $priceLabel,
            'external_url' => null,
            'rank' => null,
            'city_slug' => $citySlug,
            'category_name' => $venue?->category?->name,
            'district_label' => $venue?->district?->name,
            'city_label' => $venue?->city?->name,
            'artist_type_label' => null,
            'internal_event_segment' => $event->publicUrlSegment(),
        ];
    }

    private static function publicImageUrl(?string $path): ?string
    {
        if ($path === null || trim($path) === '') {
            return null;
        }
        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }
}
