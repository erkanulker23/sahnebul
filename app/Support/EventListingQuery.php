<?php

namespace App\Support;

use App\Models\Event;
use Illuminate\Database\Eloquent\Builder;

/**
 * /etkinlikler ve şehir seç sayfalarında aynı etkinlik kümesi ve sıralama.
 */
final class EventListingQuery
{
    public static function base(): Builder
    {
        return Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->listedPublicly());
    }

    public static function applyDefaultOrder(Builder $query): Builder
    {
        return $query
            ->orderByRaw(
                'CASE
                    WHEN DATE(events.start_date) = CURDATE() THEN 0
                    WHEN DATE(events.start_date) = DATE_ADD(CURDATE(), INTERVAL 1 DAY) THEN 1
                    WHEN events.start_date > NOW() THEN 2
                    ELSE 3
                 END'
            )
            ->orderBy('events.start_date');
    }

    /**
     * Kullanıcı konumu (lat/lng): mekân koordinatına göre km — önce yakın, koordinatsız mekânlar sonda.
     * Şehir seç sayfasında ilçe filtresiyle birlikte kullanılabilir (daraltma + yakınlık sırası).
     */
    public static function applyProximityOrderFirst(Builder $query, float $lat, float $lng): Builder
    {
        return $query
            ->join('venues as proximity_venues', 'proximity_venues.id', '=', 'events.venue_id')
            ->select('events.*')
            ->selectRaw(
                '(CASE WHEN proximity_venues.latitude IS NOT NULL AND proximity_venues.longitude IS NOT NULL '
                .'THEN (6371 * acos(LEAST(1, GREATEST(-1, cos(radians(?)) * cos(radians(proximity_venues.latitude)) '
                .'* cos(radians(proximity_venues.longitude) - radians(?)) + sin(radians(?)) * sin(radians(proximity_venues.latitude)))))) '
                .'ELSE 999999 END) AS proximity_km',
                [$lat, $lng, $lat]
            )
            ->orderBy('proximity_km')
            ->orderBy('events.start_date');
    }
}
