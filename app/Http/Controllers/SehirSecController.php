<?php

namespace App\Http\Controllers;

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

    public function __invoke(Request $request): Response
    {
        // Yalnızca platform etkinlikleri (/etkinlikler ile aynı kaynak ve sıralama)
        $bySlug = SehirSecPlatformEvents::groupedBySehirSlug();

        /** Sıralı dizi: her şehir kendi etkinlik listesiyle (Inertia/JSON’da nesne anahtarı karışmasın diye) */
        $citySections = [];
        foreach (self::CITY_ORDER as $slug => $label) {
            $citySections[] = [
                'slug' => $slug,
                'name' => $label,
                'events' => array_values($bySlug[$slug] ?? []),
            ];
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
        ]);
    }
}
