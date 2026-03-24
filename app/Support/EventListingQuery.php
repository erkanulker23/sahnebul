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
            ->whereHas('venue', fn ($q) => $q->approved());
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
}
