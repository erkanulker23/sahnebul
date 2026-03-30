<?php

namespace App\Support;

use App\Models\Event;
use Illuminate\Database\Eloquent\Builder;

/**
 * “Bu akşam / şu an” canlı harita: sürüyor veya bugün başlayacak etkinlikler.
 * Tarih koşulları MySQL ve SQLite ile uyumludur (CURDATE/NOW kullanılmaz).
 *
 * @param  Builder<Event>  $query
 * @return Builder<Event>
 */
final class LiveTonightEventQuery
{
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
