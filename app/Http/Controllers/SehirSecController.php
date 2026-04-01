<?php

namespace App\Http\Controllers;

use App\Models\City;
use App\Support\RequestGeoQuery;
use App\Support\SehirSecPlatformEvents;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SehirSecController extends Controller
{
    /** @var array<string, string> slug => görünen ad */
    public const CITY_ORDER = [
        'istanbul' => 'İstanbul',
        'ankara' => 'Ankara',
        'izmir' => 'İzmir',
        'antalya' => 'Antalya',
        'bursa' => 'Bursa',
        'eskisehir' => 'Eskişehir',
    ];

    /**
     * @return array{0: float, 1: float}
     */
    private static function cityCenterForSlug(string $slug): array
    {
        /** @var array<string, array{0: float, 1: float}> */
        static $fallback = [
            'istanbul' => [41.0082, 28.9784],
            'ankara' => [39.9334, 32.8597],
            'izmir' => [38.4237, 27.1428],
            'antalya' => [36.8969, 30.7133],
            'bursa' => [40.1885, 29.0610],
            'eskisehir' => [39.7767, 30.5206],
        ];

        $city = City::query()->where('slug', $slug)->first();
        if ($city !== null && $city->latitude !== null && $city->longitude !== null) {
            return [(float) $city->latitude, (float) $city->longitude];
        }

        return $fallback[$slug] ?? [39.0, 35.0];
    }

    public function __invoke(Request $request): Response
    {
        $geo = RequestGeoQuery::optionalNearLatLng($request);

        $bySlug = SehirSecPlatformEvents::groupedBySehirSlug(
            $geo['lat'] ?? null,
            $geo['lng'] ?? null
        );

        /** Sıralı dizi: her şehir kendi etkinlik listesiyle (Inertia/JSON’da nesne anahtarı karışmasın diye) */
        $citySections = [];
        foreach (self::CITY_ORDER as $slug => $label) {
            $citySections[] = [
                'slug' => $slug,
                'name' => $label,
                'events' => array_values($bySlug[$slug] ?? []),
            ];
        }

        if ($geo !== null) {
            usort($citySections, function (array $a, array $b) use ($geo): int {
                $ca = self::cityCenterForSlug($a['slug']);
                $cb = self::cityCenterForSlug($b['slug']);
                $da = RequestGeoQuery::haversineKm($geo['lat'], $geo['lng'], $ca[0], $ca[1]);
                $db = RequestGeoQuery::haversineKm($geo['lat'], $geo['lng'], $cb[0], $cb[1]);

                return $da <=> $db;
            });
        }

        $allowedSlugs = array_keys(self::CITY_ORDER);
        $initial = $request->query('sehir');
        if (! is_string($initial) || $initial === '' || ! in_array($initial, $allowedSlugs, true)) {
            $initial = null;
        }
        if ($initial !== null && empty($bySlug[$initial])) {
            $initial = null;
        }
        if ($initial === null) {
            foreach ($citySections as $section) {
                if ($section['events'] !== []) {
                    $initial = $section['slug'];
                    break;
                }
            }
        }
        if ($initial === null) {
            foreach ($allowedSlugs as $slug) {
                if (! empty($bySlug[$slug])) {
                    $initial = $slug;
                    break;
                }
            }
        }
        if ($initial === null) {
            $initial = 'istanbul';
        }

        return Inertia::render('SehirSec', [
            'citySections' => $citySections,
            'initialSlug' => $initial,
            'nearLat' => $geo['lat'] ?? null,
            'nearLng' => $geo['lng'] ?? null,
        ]);
    }
}
