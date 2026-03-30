<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\Venue;
use Illuminate\Database\Seeder;

/**
 * Canlı sahne /kesfet/bu-aksam sayfasını yerelde doldurmak için örnek mekân ve etkinlikler.
 * Çalıştır: php artisan db:seed --class=LiveSceneDemoSeeder
 */
class LiveSceneDemoSeeder extends Seeder
{
    public function run(): void
    {
        $istanbul = City::query()->where('slug', 'istanbul')->first();
        /** CategorySeeder: Str::slug('Klüp') => klup */
        $klub = Category::query()->where('slug', 'klup')->first();
        $bar = Category::query()->where('slug', 'bar')->first();
        $konserAlani = Category::query()->where('slug', 'konser-alani')->first();
        $tiyatro = Category::query()->where('slug', 'tiyatro-salonu')->first();

        if (! $istanbul || ! $klub || ! $bar) {
            $this->command?->warn('İstanbul veya kategori (klup/bar) yok. php artisan db:seed --class=CategorySeeder && CitySeeder');

            return;
        }

        $cover = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1200&auto=format&fit=crop';

        $venues = [
            [
                'slug' => 'canli-demo-atlas-kulup',
                'name' => '[Demo] Atlas Kulüp — Canlı Test',
                'category' => $klub,
                'address' => 'Demo Cad. No:1 Beyoğlu, İstanbul',
                'latitude' => 41.0369,
                'longitude' => 28.9850,
            ],
            [
                'slug' => 'canli-demo-sahne-bar',
                'name' => '[Demo] Sahne Bar — Stand-up',
                'category' => $bar,
                'address' => 'Demo Sok. No:7 Kadıköy, İstanbul',
                'latitude' => 40.9902,
                'longitude' => 29.0252,
            ],
            [
                'slug' => 'canli-demo-arena-konser',
                'name' => '[Demo] Arena Konser Alanı',
                'category' => $konserAlani ?? $klub,
                'address' => 'Demo Bulvar No:3 Şişli, İstanbul',
                'latitude' => 41.0608,
                'longitude' => 28.9877,
            ],
            [
                'slug' => 'canli-demo-oyun-sahnesi',
                'name' => '[Demo] Oyun Sahnesi Tiyatro',
                'category' => $tiyatro ?? $konserAlani ?? $klub,
                'address' => 'Demo Meydan No:2 Beşiktaş, İstanbul',
                'latitude' => 41.0422,
                'longitude' => 29.0083,
            ],
        ];

        $createdVenues = [];
        foreach ($venues as $row) {
            $createdVenues[$row['slug']] = Venue::query()->updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'category_id' => $row['category']->id,
                    'city_id' => $istanbul->id,
                    'name' => $row['name'],
                    'description' => 'Canlı sahne demo verisi — üretimde silinebilir.',
                    'address' => $row['address'],
                    'latitude' => $row['latitude'],
                    'longitude' => $row['longitude'],
                    'capacity' => 500,
                    'status' => 'approved',
                    'is_active' => true,
                    'is_featured' => false,
                    'cover_image' => $cover,
                ]
            );
        }

        $kulup = $createdVenues['canli-demo-atlas-kulup'];
        $demoBar = $createdVenues['canli-demo-sahne-bar'];
        $arena = $createdVenues['canli-demo-arena-konser'];
        $tiyatroVenue = $createdVenues['canli-demo-oyun-sahnesi'];

        $now = now();

        /** Aynı kulüpte 3 etkinlik → haritada yüksek yoğunluk */
        $eventDefs = [
            [
                'slug' => 'canli-demo-dj-set-1',
                'venue' => $kulup,
                'title' => '[Demo] DJ Set — şu an devam ediyor',
                'event_type' => 'konser',
                'start' => $now->copy()->subHours(2),
                /** Bitiş şart: tek gün + başlangıç geçtiyse listede kalmak için end_date gerekir */
                'end' => $now->copy()->addHours(4),
            ],
            [
                'slug' => 'canli-demo-dj-set-2',
                'venue' => $kulup,
                'title' => '[Demo] Gece platoları',
                'event_type' => 'konser',
                'start' => $now->copy()->addHour(),
                'end' => null,
            ],
            [
                'slug' => 'canli-demo-canli-performans',
                'venue' => $kulup,
                'title' => '[Demo] Canlı performans (gece)',
                'event_type' => 'konser',
                'start' => $now->copy()->addHours(3),
                'end' => null,
            ],
            [
                'slug' => 'canli-demo-stand-up-line',
                'venue' => $demoBar,
                'title' => '[Demo] Stand-up: Açık mikrofon',
                'event_type' => 'stand-up',
                'start' => $now->copy()->addMinutes(90),
                'end' => null,
            ],
            [
                'slug' => 'canli-demo-rock-gecesi',
                'venue' => $arena,
                'title' => '[Demo] Rock gecesi — kapı açılış',
                'event_type' => 'konser',
                'start' => $now->copy()->addMinutes(45),
                'end' => null,
            ],
            [
                'slug' => 'canli-demo-festival-on',
                'venue' => $arena,
                'title' => '[Demo] Festival ön konser',
                'event_type' => 'festival',
                'start' => $now->copy()->subMinutes(30),
                'end' => $now->copy()->addHours(5),
            ],
            [
                'slug' => 'canli-demo-tiyatro-perde',
                'venue' => $tiyatroVenue,
                'title' => '[Demo] Perde: Şehir Hikâyeleri',
                'event_type' => 'tiyatro',
                'start' => $now->copy()->subHour(),
                'end' => $now->copy()->addHours(2),
            ],
        ];

        foreach ($eventDefs as $def) {
            Event::query()->updateOrCreate(
                ['slug' => $def['slug']],
                [
                    'venue_id' => $def['venue']->id,
                    'title' => $def['title'],
                    'description' => 'Demo etkinlik — LiveScene / bu-aksam testi.',
                    'start_date' => $def['start'],
                    'end_date' => $def['end'] ?? null,
                    'event_type' => $def['event_type'],
                    'status' => 'published',
                    'entry_is_paid' => true,
                    'ticket_price' => 150,
                ]
            );
        }

        $this->command?->info('LiveScene demo: '.count($eventDefs).' etkinlik, '.count($venues).' mekân güncellendi.');
        $this->command?->line('Sayfa: '.route('discover.tonight', absolute: true));
    }
}
