<?php

namespace App\Support;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Aynı ziyaretçi (oturum veya giriş yapmış kullanıcı) için günde en fazla bir kez sayaç artırır.
 */
final class DailyUniqueEntityView
{
    public static function recordOncePerVisitorPerDay(Request $request, string $entityType, int $entityId, Closure $increment): void
    {
        $visitorKey = self::visitorKey($request);
        $date = now()->toDateString();
        $cacheKey = 'daily_entity_view:'.hash('sha256', "{$entityType}|{$entityId}|{$visitorKey}|{$date}");

        if (! Cache::add($cacheKey, 1, self::secondsUntilEndOfDay())) {
            return;
        }

        $increment();
    }

    private static function visitorKey(Request $request): string
    {
        $user = $request->user();
        if ($user !== null) {
            return 'user:'.$user->getAuthIdentifier();
        }

        /** Misafir: aynı IP + User-Agent aynı gün için tek sayım (paylaşımlı ağda kabullenilen yaklaşım). */
        return 'guest:'.hash('sha256', ($request->ip() ?? '')."\x1e".($request->userAgent() ?? ''));
    }

    private static function secondsUntilEndOfDay(): int
    {
        $end = now()->copy()->endOfDay();

        return max(60, (int) ($end->getTimestamp() - now()->getTimestamp()) + 1);
    }
}
