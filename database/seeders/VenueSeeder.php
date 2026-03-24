<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\City;
use App\Models\Venue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class VenueSeeder extends Seeder
{
    public function run(): void
    {
        $istanbul = City::where('slug', 'istanbul')->first();
        $ankara = City::where('slug', 'ankara')->first();
        $bar = Category::where('slug', 'bar')->first();
        $konser = Category::where('slug', 'konser-alani')->first(); // Str::slug('Konser Alanı')
        $kafe = Category::where('slug', 'kafe')->first();

        if (!$istanbul || !$bar) {
            return;
        }

        $venues = [
            [
                'name' => 'Babylon',
                'category' => $konser ?? $bar,
                'city' => $istanbul,
                'description' => 'İstanbul\'un en köklü canlı müzik mekanlarından biri. Yerli ve yabancı sanatçılara ev sahipliği yapar.',
                'address' => 'Asmalı Mescit Mah. Sehbender Sok. No:3 Beyoğlu',
                'latitude' => 41.0317,
                'longitude' => 28.9749,
                'capacity' => 500,
            ],
            [
                'name' => 'Zorlu PSM',
                'category' => $konser,
                'city' => $istanbul,
                'description' => 'Türkiye\'nin en büyük performans sanatları merkezi.',
                'address' => 'Levazım Mah. Koru Sokağı No:2 Beşiktaş',
                'latitude' => 41.0679,
                'longitude' => 29.0126,
                'capacity' => 2300,
            ],
            [
                'name' => 'Nardis Jazz Club',
                'category' => $bar ?? $kafe,
                'city' => $istanbul,
                'description' => 'Caz severler için eşsiz bir atmosfer.',
                'address' => 'Kuledibi Sok. No:14 Galata',
                'latitude' => 41.0242,
                'longitude' => 28.9740,
                'capacity' => 120,
            ],
            [
                'name' => 'KüçükÇiftlik Park',
                'category' => $konser,
                'city' => $istanbul,
                'description' => 'Açık hava konserleri ve festivaller için ideal mekan.',
                'address' => 'Mualla Eyüboğlu Sk. No:2 Bomonti',
                'latitude' => 41.0522,
                'longitude' => 28.9890,
                'capacity' => 3000,
                'phone' => '+90 212 000 00 00',
                'website' => 'https://kucukciftlikpark.com',
                'cover_image' => 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1600&auto=format&fit=crop',
            ],
            [
                'name' => 'Jolly Joker',
                'category' => $bar ?? $konser,
                'city' => $istanbul,
                'description' => 'Canlı rock ve pop performansları.',
                'address' => 'Reşitpaşa Mah. Eski Büyükdere Cad. No:19 Sarıyer',
                'latitude' => 41.1066,
                'longitude' => 29.0285,
                'capacity' => 800,
            ],
            [
                'name' => 'IF Performance Hall',
                'category' => $konser,
                'city' => $istanbul,
                'description' => 'Modern konser ve etkinlik salonu.',
                'address' => 'Maslak Mah. Eski Büyükdere Cad. No:1 Sarıyer',
                'latitude' => 41.1080,
                'longitude' => 29.0174,
                'capacity' => 1500,
            ],
        ];

        if ($ankara) {
            $venues[] = [
                'name' => 'MEB Şura Salonu',
                'category' => $konser,
                'city' => $ankara,
                'description' => 'Ankara\'nın önemli konser mekanlarından.',
                'address' => 'Atatürk Bulvarı No:98 Çankaya',
                'latitude' => 39.9225,
                'longitude' => 32.8538,
                'capacity' => 1200,
            ];
        }

        $bursa = City::where('slug', 'bursa')->first();
        if ($bursa) {
            $venues[] = [
                'name' => 'Jolly Joker Bursa',
                'category' => $bar ?? $konser,
                'city' => $bursa,
                'description' => 'Bursa’da canlı müzik ve stand-up için bilinen saha.',
                'address' => 'Osmangazi, FSM Bulvarı No:1',
                'latitude' => 40.1950,
                'longitude' => 29.0600,
                'capacity' => 650,
            ];
        }

        foreach ($venues as $v) {
            Venue::updateOrCreate(
                ['slug' => Str::slug($v['name'])],
                [
                    'category_id' => $v['category']->id,
                    'city_id' => $v['city']->id,
                    'name' => $v['name'],
                    'description' => $v['description'],
                    'address' => $v['address'],
                    'latitude' => $v['latitude'] ?? null,
                    'longitude' => $v['longitude'] ?? null,
                    'capacity' => $v['capacity'],
                    'phone' => $v['phone'] ?? null,
                    'website' => $v['website'] ?? null,
                    'cover_image' => $v['cover_image'] ?? null,
                    'status' => 'approved',
                ]
            );
        }
    }
}
