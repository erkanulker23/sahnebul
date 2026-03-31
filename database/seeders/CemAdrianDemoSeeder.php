<?php

namespace Database\Seeders;

use App\Models\Artist;
use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\Venue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;

/**
 * Cem Adrian (slug: cem-adrian) için sahne paneli demo hesabı ve vitrin etkinlikleri.
 * Onaylı mekân yoksa minimal demo mekân oluşturur — böylece az verili ortamlarda da çalışır.
 */
class CemAdrianDemoSeeder extends Seeder
{
    public const DEMO_EMAIL = 'cem-adrian.demo@sahnebul.test';

    public const DEMO_PASSWORD = 'password';

    public function run(): void
    {
        $artist = Artist::query()->where('slug', 'cem-adrian')->first();
        if (! $artist) {
            return;
        }

        $user = User::updateOrCreate(
            ['email' => self::DEMO_EMAIL],
            [
                'name' => $artist->name,
                'password' => Hash::make(self::DEMO_PASSWORD),
                'role' => 'artist',
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        $artist->update(['user_id' => $user->id]);

        $goldPlan = SubscriptionPlan::query()->where('slug', 'gold-monthly')->first();
        if ($goldPlan) {
            UserSubscription::query()->where('user_id', $user->id)->delete();
            UserSubscription::create([
                'user_id' => $user->id,
                'subscription_plan_id' => $goldPlan->id,
                'status' => 'active',
                'starts_at' => now(),
                'ends_at' => now()->addYear(),
            ]);
        }

        $this->seedShowcaseEvents($artist, $this->ensureApprovedVenues());
    }

    /**
     * @return Collection<int, Venue>
     */
    private function ensureApprovedVenues(): Collection
    {
        $approved = Venue::query()->approved()->orderBy('id')->get();
        if ($approved->isNotEmpty()) {
            return $approved;
        }

        $city = City::query()->orderBy('id')->first();
        $category = Category::query()->orderBy('id')->first();
        if (! $city || ! $category) {
            return collect();
        }

        $cover = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1600&auto=format&fit=crop';

        foreach ([
            ['name' => 'Sahnebul Demo Konser Salonu', 'slug' => 'sahnebul-demo-konser-salonu', 'capacity' => 1200],
            ['name' => 'Sahnebul Demo Kulüp', 'slug' => 'sahnebul-demo-kulup', 'capacity' => 450],
        ] as $row) {
            Venue::query()->updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'name' => $row['name'],
                    'category_id' => $category->id,
                    'city_id' => $city->id,
                    'address' => 'Demo adres — vitrin etkinlikleri için otomatik oluşturuldu.',
                    'description' => 'Yerel veritabanında onaylı mekân yokken Cem Adrian vitrin etkinliklerinin bağlanması için eklenen demo kayıt.',
                    'capacity' => $row['capacity'],
                    'status' => 'approved',
                    'cover_image' => $cover,
                ]
            );
        }

        return Venue::query()->approved()->orderBy('id')->get();
    }

    private function seedShowcaseEvents(Artist $artist, Collection $venues): void
    {
        if ($venues->isEmpty()) {
            return;
        }

        $rules = "Etkinlik alanına girişte bilet ve kimlik kontrolü yapılır.\nDışarıdan yiyecek ve içecek getirilmesine izin verilmez.\nProfesyonel kamera ve kayıt ekipmanları için organizatör onayı gerekir.\nEtkinlik başlangıcından sonra iade/değişim organizatör kurallarına tabidir.";

        $definitions = [
            [
                'slug' => 'cem-adrian-vitrin-akustik',
                'title' => 'Cem Adrian — Akustik Gece',
                'description' => 'Dar sahne, yakın mikrofon mesafesi ve iki setlik akustik program. Sevilen şarkıların sade düzenlemeleri; doğrudan performans odaklı akış.',
                'days_from_now' => 9,
                'hour' => 20,
                'minute' => 30,
                'cover_image' => 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop',
                'ticket_acquisition_mode' => Event::TICKET_MODE_SAHNEBUL_RESERVATION,
                'sahnebul_reservation_enabled' => true,
                'ticket_outlets' => [],
            ],
            [
                'slug' => 'cem-adrian-vitrin-acik-hava',
                'title' => 'Cem Adrian — Açık Hava Konseri',
                'description' => 'Açık hava düzeni. Yağmur planı: aynı gün kapalı salona veya ertesi güne ertelenir (duyuru mekân ve @sahnebul). Engelli erişimi A kapısından.',
                'days_from_now' => 16,
                'hour' => 21,
                'minute' => 0,
                'cover_image' => 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1200&auto=format&fit=crop',
                'ticket_acquisition_mode' => Event::TICKET_MODE_EXTERNAL,
                'sahnebul_reservation_enabled' => false,
                'ticket_outlets' => [
                    ['label' => 'Biletix', 'url' => 'https://www.biletix.com/'],
                    ['label' => 'Passo', 'url' => 'https://www.passo.com.tr/'],
                ],
            ],
            [
                'slug' => 'cem-adrian-vitrin-kulup',
                'title' => 'Cem Adrian — Kulüp Özel',
                'description' => 'Sınırlı kontenjan; ön bölüm önceden rezervasyonlu olabilir. İlk set 21:15, kısa ara, ikinci set 22:30.',
                'days_from_now' => 6,
                'hour' => 21,
                'minute' => 15,
                'cover_image' => 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?q=80&w=1200&auto=format&fit=crop',
                'ticket_acquisition_mode' => Event::TICKET_MODE_PHONE,
                'sahnebul_reservation_enabled' => false,
                'ticket_outlets' => [],
            ],
            [
                'slug' => 'cem-adrian-vitrin-salon',
                'title' => 'Cem Adrian — Büyük Salon',
                'description' => 'Tam kadro grup ve ışık tasarımı. Öğrenci indirimi gişede kimlik ile; online satışta kodlar kontenjanlıdır (örnek: OGRENCI).',
                'days_from_now' => 27,
                'hour' => 20,
                'minute' => 0,
                'cover_image' => 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1200&auto=format&fit=crop',
                'ticket_acquisition_mode' => Event::TICKET_MODE_EXTERNAL,
                'sahnebul_reservation_enabled' => false,
                'ticket_outlets' => [
                    ['label' => 'Mobilet', 'url' => 'https://www.mobilet.com/tr/'],
                ],
            ],
            [
                'slug' => 'cem-adrian-vitrin-sehir',
                'title' => 'Cem Adrian — Turne Durağı',
                'description' => 'Şehir dışı durak; ayakta ve oturmalı karma düzen. Otopark ve gece çıkışı için mekân yönlendirmesine uyun.',
                'days_from_now' => 13,
                'hour' => 21,
                'minute' => 30,
                'cover_image' => 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1200&auto=format&fit=crop',
                'ticket_acquisition_mode' => Event::TICKET_MODE_SAHNEBUL_RESERVATION,
                'sahnebul_reservation_enabled' => true,
                'ticket_outlets' => [],
            ],
            [
                'slug' => 'cem-adrian-vitrin-gecmis',
                'title' => 'Cem Adrian — Geçen Ay (Arşiv)',
                'description' => 'Geniş repertuvar ve uzun final ile tamamlanan gece; dinleyici talebiyle ek şarkılarla kapanış.',
                'days_from_now' => -22,
                'hour' => 20,
                'minute' => 0,
                'cover_image' => 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1200&auto=format&fit=crop',
                'ticket_acquisition_mode' => Event::TICKET_MODE_SAHNEBUL_RESERVATION,
                'sahnebul_reservation_enabled' => true,
                'ticket_outlets' => [],
            ],
        ];

        $i = 0;
        foreach ($definitions as $def) {
            /** @var Venue $venue */
            $venue = $venues[$i % $venues->count()];
            $i++;

            $start = now()->addDays($def['days_from_now'])->setHour($def['hour'])->setMinute($def['minute'])->setSecond(0);
            $end = $start->copy()->addHours(3);
            $base = random_int(280, 520);

            $event = Event::query()->updateOrCreate(
                ['slug' => $def['slug']],
                [
                    'venue_id' => $venue->id,
                    'title' => $def['title'],
                    'description' => $def['description'],
                    'event_rules' => $rules,
                    'start_date' => $start,
                    'end_date' => $end,
                    'ticket_price' => $base,
                    'capacity' => $venue->capacity ?? 500,
                    'status' => 'published',
                    'cover_image' => $def['cover_image'],
                    'ticket_acquisition_mode' => $def['ticket_acquisition_mode'],
                    'sahnebul_reservation_enabled' => (bool) $def['sahnebul_reservation_enabled'],
                    'paytr_checkout_enabled' => $def['ticket_acquisition_mode'] === Event::TICKET_MODE_SAHNEBUL_CARD,
                    'is_full' => false,
                    'ticket_outlets' => $def['ticket_outlets'],
                ]
            );

            $event->syncTicketTiers([
                ['name' => 'Ayakta / Genel', 'description' => 'Genel giriş', 'price' => $base, 'sort_order' => 0],
                ['name' => 'Tribün', 'description' => 'Numaralı oturma', 'price' => $base + 120, 'sort_order' => 1],
                ['name' => 'VIP', 'description' => 'Ön sıra / ayrıcalıklı alan', 'price' => $base + 320, 'sort_order' => 2],
            ]);

            $event->artists()->sync([
                $artist->id => ['is_headliner' => true, 'order' => 0],
            ]);
        }
    }
}
