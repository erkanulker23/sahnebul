<?php

namespace App\Support;

use App\Models\Event;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * Canlı harita: gece penceresi (applyTonightOrLiveWindow) ve 7 günlük keşif (applySevenDayMapWindow).
 * Tarih koşulları MySQL ve SQLite ile uyumludur (CURDATE/NOW kullanılmaz).
 *
 * @param  Builder<Event>  $query
 * @return Builder<Event>
 */
final class LiveTonightEventQuery
{
    /**
     * Bugünden itibaren 7 takvim günü (bugün dahil), etkinlik etkinlik takvimiyle örtüşüyorsa dahil.
     * Çok-gün etkinlikler: başlangıç/bitiş penceresi ile kesişim; tek gün: start_date pencere içinde.
     *
     * @param  Builder<Event>  $query
     * @return Builder<Event>
     */
    public static function applySevenDayMapWindow(Builder $query): Builder
    {
        $table = $query->getModel()->getTable();
        $windowStart = now()->copy()->startOfDay();
        $windowEnd = now()->copy()->addDays(6)->endOfDay();

        return $query->where(function (\Illuminate\Contracts\Database\Query\Builder $q) use ($table, $windowStart, $windowEnd) {
            $q->where(function (\Illuminate\Contracts\Database\Query\Builder $multi) use ($table, $windowStart, $windowEnd) {
                $multi->where("{$table}.start_date", '<=', $windowEnd)
                    ->whereNotNull("{$table}.end_date")
                    ->where("{$table}.end_date", '>=', $windowStart);
            })->orWhere(function (\Illuminate\Contracts\Database\Query\Builder $single) use ($table, $windowStart, $windowEnd) {
                $single->whereNull("{$table}.end_date")
                    ->whereBetween("{$table}.start_date", [$windowStart, $windowEnd]);
            });
        });
    }

    /**
     * Etkinliğin yerel «bugün» ile çakışıp çakışmadığı (/etkinlikler?period=today ile aynı mantık).
     */
    public static function eventOverlapsLocalToday(Event $event): bool
    {
        $start = $event->start_date;
        if (! $start instanceof CarbonInterface) {
            return false;
        }
        $todayStart = now()->copy()->startOfDay();
        $todayEnd = now()->copy()->endOfDay();
        $end = $event->end_date;

        if ($end instanceof CarbonInterface) {
            return $start <= $todayEnd && $end >= $todayStart;
        }

        return $start >= $todayStart && $start <= $todayEnd;
    }

    public static function applyTonightOrLiveWindow(Builder $query): Builder
    {
        $table = $query->getModel()->getTable();
        $now = now();
        $todayDate = today()->toDateString();

        return $query->where(function (\Illuminate\Contracts\Database\Query\Builder $q) use ($table, $now, $todayDate) {
            $q->where(function (\Illuminate\Contracts\Database\Query\Builder $live) use ($table, $now, $todayDate) {
                $live->where("{$table}.start_date", '<=', $now)
                    ->where(function (\Illuminate\Contracts\Database\Query\Builder $end) use ($table, $now, $todayDate) {
                        $end->where(function (\Illuminate\Contracts\Database\Query\Builder $e) use ($table, $now) {
                            $e->whereNotNull("{$table}.end_date")
                                ->where("{$table}.end_date", '>=', $now);
                        })->orWhere(function (\Illuminate\Contracts\Database\Query\Builder $e) use ($table, $todayDate) {
                            $e->whereNull("{$table}.end_date")
                                ->whereDate("{$table}.start_date", $todayDate);
                        });
                    });
            })->orWhere(function (\Illuminate\Contracts\Database\Query\Builder $later) use ($table, $now, $todayDate) {
                $later->whereDate("{$table}.start_date", $todayDate)
                    ->where("{$table}.start_date", '>', $now);
            });
        });
    }
}
