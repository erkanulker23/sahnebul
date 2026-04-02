<?php

namespace App\Support;

use App\Models\Event;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * /etkinlikler ve şehir seç sayfalarında aynı etkinlik kümesi ve sıralama.
 */
final class EventListingQuery
{
    public static function base(): Builder
    {
        return Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->listedPublicly())
            ->whereNotNull('events.start_date')
            ->whereStillVisibleOnPublicListing();
    }

    public static function applyDefaultOrder(Builder $query): Builder
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return $query
                ->orderByRaw(
                    'CASE
                        WHEN events.end_date IS NOT NULL AND events.start_date <= datetime(\'now\') AND events.end_date >= datetime(\'now\') THEN 0
                        WHEN date(events.start_date) = date(\'now\') THEN 1
                        WHEN date(events.start_date) = date(\'now\', \'+1 day\') THEN 2
                        WHEN events.start_date > datetime(\'now\') THEN 3
                        ELSE 4
                     END'
                )
                ->orderBy('events.start_date');
        }

        return $query
            ->orderByRaw(
                'CASE
                    WHEN events.end_date IS NOT NULL AND events.start_date <= NOW() AND events.end_date >= NOW() THEN 0
                    WHEN DATE(events.start_date) = CURDATE() THEN 1
                    WHEN DATE(events.start_date) = DATE_ADD(CURDATE(), INTERVAL 1 DAY) THEN 2
                    WHEN events.start_date > NOW() THEN 3
                    ELSE 4
                 END'
            )
            ->orderBy('events.start_date');
    }

    /**
     * Kullanıcı konumu (lat/lng): mekân koordinatına göre km — önce yakın, koordinatsız mekânlar sonda.
     * (Yalnızca “en yakın etkinlik” gibi mesafe-öncelikli listeler için.)
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

    /**
     * Önce tarih (başlangıç), aynı zamanda yakın mekân öne — şehir/etkinlik listeleri için.
     */
    public static function applyDateThenProximityOrder(Builder $query, float $lat, float $lng): Builder
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
            ->orderBy('events.start_date')
            ->orderBy('proximity_km');
    }
}
