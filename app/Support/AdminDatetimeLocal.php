<?php

namespace App\Support;

use Carbon\CarbonInterface;

/**
 * HTML datetime-local: zaman dilimi içermez; değer uygulama saat dilimindeki duvar saati olmalı.
 * Inertia’nın varsayılan ISO (UTC) çıktısını kesmek (slice 0,16) İstanbul’da +3 kaydırır.
 */
final class AdminDatetimeLocal
{
    public static function format(?CarbonInterface $date): string
    {
        if ($date === null) {
            return '';
        }

        return $date->copy()->timezone(config('app.timezone'))->format('Y-m-d\TH:i');
    }
}
