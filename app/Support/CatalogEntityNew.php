<?php

namespace App\Support;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

final class CatalogEntityNew
{
    /**
     * Takvim günü (app.timezone): oluşturulma günü + bu kadar gün daha rozet gösterilir (dahil).
     * Ör. 24 Mart’ta eklenen kayıt 27 Mart sonuna kadar (28 Mart’tan itibaren değil) “yeni” kalır.
     */
    public const BADGE_EXTRA_DAYS_AFTER_CREATE_DAY = 3;

    public static function isWithinBadgeWindow(mixed $createdAt, bool $eligible): bool
    {
        if (! $eligible) {
            return false;
        }
        if ($createdAt === null) {
            return false;
        }

        $tz = config('app.timezone');
        $createdDay = $createdAt instanceof CarbonInterface
            ? $createdAt->copy()->timezone($tz)->startOfDay()
            : Carbon::parse($createdAt, $tz)->startOfDay();

        $lastBadgeDay = $createdDay->copy()->addDays(self::BADGE_EXTRA_DAYS_AFTER_CREATE_DAY);
        $today = now($tz)->startOfDay();

        return $today->lessThanOrEqualTo($lastBadgeDay);
    }

    public static function venueEligible(string $status, bool $isActive): bool
    {
        return $status === 'approved' && $isActive;
    }

    public static function artistEligible(string $status): bool
    {
        return $status === 'approved';
    }
}
