<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Kamu listelerinde ?near_lat=&near_lng= ile konuma göre sıralama.
 */
final class RequestGeoQuery
{
    /**
     * @return array{lat: float, lng: float}|null
     */
    public static function optionalNearLatLng(Request $request): ?array
    {
        $nearLatRaw = $request->query('near_lat');
        $nearLngRaw = $request->query('near_lng');
        if (! is_numeric($nearLatRaw) || ! is_numeric($nearLngRaw)) {
            return null;
        }
        $la = (float) $nearLatRaw;
        $ln = (float) $nearLngRaw;
        if ($la < -90 || $la > 90 || $ln < -180 || $ln > 180) {
            return null;
        }

        return ['lat' => $la, 'lng' => $ln];
    }

    public static function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) * sin($dLng / 2);

        return $earth * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
