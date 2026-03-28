<?php

namespace App\Support;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * Takvim haftası değil: bugünden itibaren 7 takvim günü (bugün dahil), yalnızca start >= şu an.
 *
 * /sanatçılar, /mekanlar rozetleri, /etkinlikler?period=week ve ana sayfa "önümüzdeki günler" ile aynı pencere.
 */
final class UpcomingSevenDayEventWindow
{
    public static function upperBound(): CarbonInterface
    {
        return now()->copy()->addDays(6)->endOfDay();
    }

    public static function applyToEloquent(Builder $query, string $column = 'start_date'): Builder
    {
        return $query
            ->where($column, '>=', now())
            ->where($column, '<=', self::upperBound());
    }

    public static function applyToQuery(QueryBuilder $query, string $column): QueryBuilder
    {
        return $query
            ->where($column, '>=', now())
            ->where($column, '<=', self::upperBound());
    }
}
