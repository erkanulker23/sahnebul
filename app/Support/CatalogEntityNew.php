<?php

namespace App\Support;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

final class CatalogEntityNew
{
    /** Kamu kataloğunda “yeni” rozeti: oluşturulmadan bu kadar gün içindeyse. */
    public const BADGE_DAYS = 3;

    public static function isWithinBadgeWindow(mixed $createdAt, bool $eligible): bool
    {
        if (! $eligible) {
            return false;
        }
        if ($createdAt === null) {
            return false;
        }

        $c = $createdAt instanceof CarbonInterface
            ? $createdAt->copy()
            : Carbon::parse($createdAt);

        return $c->addDays(self::BADGE_DAYS)->isFuture();
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
