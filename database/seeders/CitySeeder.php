<?php

namespace Database\Seeders;

use App\Models\City;
use App\Services\TurkeyProvincesSync;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CitySeeder extends Seeder
{
    public function run(): void
    {
        app(TurkeyProvincesSync::class)->sync();

        if (City::query()->whereNotNull('external_id')->count() > 0) {
            return;
        }

        $cities = [
            ['name' => 'İstanbul', 'latitude' => 41.0082, 'longitude' => 28.9784],
            ['name' => 'Ankara', 'latitude' => 39.9334, 'longitude' => 32.8597],
            ['name' => 'İzmir', 'latitude' => 38.4237, 'longitude' => 27.1428],
            ['name' => 'Antalya', 'latitude' => 36.8969, 'longitude' => 30.7133],
            ['name' => 'Bursa', 'latitude' => 40.1885, 'longitude' => 29.0610],
        ];

        foreach ($cities as $city) {
            City::create([
                'name' => $city['name'],
                'slug' => Str::slug($city['name']),
                'latitude' => $city['latitude'],
                'longitude' => $city['longitude'],
            ]);
        }
    }
}
