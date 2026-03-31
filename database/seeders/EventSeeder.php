<?php

namespace Database\Seeders;

use App\Models\Artist;
use App\Models\Event;
use App\Models\Venue;
use App\Services\EventArtistLinkResolver;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class EventSeeder extends Seeder
{
    public function run(): void
    {
        $babylon = Venue::where('slug', 'babylon')->first();
        $zorlu = Venue::where('slug', 'zorlu-psm')->first();
        $nardis = Venue::where('slug', 'nardis-jazz-club')->first();
        $kucukciftlik = Venue::where('slug', 'kucukciftlik-park')->first();
        $jolly = Venue::where('slug', 'jolly-joker')->first();
        $jollyBursa = Venue::where('slug', 'jolly-joker-bursa')->first();
        $ifHall = Venue::where('slug', 'if-performance-hall')->first();
        $mebAnkara = Venue::where('slug', 'meb-sura-salonu')->first();

        if (! $babylon || ! $zorlu || ! $nardis) {
            return;
        }

        $events = [
            [
                'venue' => $babylon,
                'title' => 'Duman Konseri',
                'description' => 'Duman grubunun özel Babylon performansı. En sevilen şarkıları canlı dinleyin.',
                'artists' => ['duman'],
                'days_from_now' => 14,
            ],
            [
                'venue' => $babylon,
                'title' => 'Teoman - Akustik Gece',
                'description' => 'Teoman\'ın samimi akustik performansı. Sınırlı bilet.',
                'artists' => ['teoman'],
                'days_from_now' => 21,
            ],
            [
                'venue' => $zorlu,
                'title' => 'Teoman - Bugün Sahne',
                'description' => 'Bu akşam özel repertuvarla canlı performans.',
                'artists' => ['teoman'],
                'days_from_now' => 0,
            ],
            [
                'venue' => $zorlu,
                'title' => 'Teoman - Geceyarisi Senfonisi',
                'description' => 'Teoman\'ın hit şarkıları ve özel repertuvarıyla uzun soluklu gece konseri.',
                'artists' => ['teoman'],
                'days_from_now' => 32,
            ],
            [
                'venue' => $jolly ?? $babylon,
                'title' => 'Teoman - Unplugged',
                'description' => 'Akustik düzenlemeler, hikayeler ve dinleyiciyle yakın etkileşim.',
                'artists' => ['teoman'],
                'days_from_now' => 54,
            ],
            [
                'venue' => $kucukciftlik ?? $zorlu,
                'title' => 'Teoman - Yaz Açık Hava Konseri',
                'description' => 'Açık havada nostalji ve yeni dönem şarkılarla dev konser.',
                'artists' => ['teoman'],
                'days_from_now' => 78,
            ],
            [
                'venue' => $babylon,
                'title' => 'Mor ve Ötesi Live',
                'description' => 'Mor ve Ötesi ile unutulmaz bir rock gecesi.',
                'artists' => ['mor-ve-otesi'],
                'days_from_now' => 28,
            ],
            [
                'venue' => $zorlu,
                'title' => 'Şebnem Ferah - Zorlu PSM',
                'description' => 'Türk rock\'ın kraliçesi dev sahnede.',
                'artists' => ['sebnem-ferah'],
                'days_from_now' => 45,
            ],
            [
                'venue' => $zorlu,
                'title' => 'Tarkan - Yeni Albüm Tanıtım',
                'description' => 'Tarkan yeni albümünden şarkıları ilk kez canlı seslendiriyor. Sahne şovu, dans ekibi ve özel konuk performanslarıyla gecenin en çok konuşulan etkinliklerinden biri olacak.',
                'artists' => ['tarkan'],
                'days_from_now' => 60,
            ],
            [
                'venue' => $zorlu,
                'title' => 'maNga - 25. Yıl Konseri',
                'description' => 'maNga 25. kuruluş yılını dev konserle kutluyor.',
                'artists' => ['manga'],
                'days_from_now' => 90,
            ],
            [
                'venue' => $babylon,
                'title' => 'Stand-up: Gece Kuşağı',
                'description' => 'Yerli komedyenlerle tek perde.',
                'artists' => ['teoman'],
                'days_from_now' => 11,
                'event_type' => 'stand-up',
            ],
            [
                'venue' => $mebAnkara ?? $zorlu,
                'title' => 'Hamlet — Modern Uyarlaması',
                'description' => 'Klasik metin, çağdaş yorum.',
                'artists' => ['cem-adrian'],
                'days_from_now' => 19,
                'event_type' => 'tiyatro',
            ],
            [
                'venue' => $kucukciftlik ?? $zorlu,
                'title' => 'Yaz Müzik Festivali — 1. Gün',
                'description' => 'Çok sahneli gün boyu festival programı.',
                'artists' => ['manga'],
                'days_from_now' => 95,
                'event_type' => 'festival',
            ],
            [
                'venue' => $nardis,
                'title' => 'Can Gox Trio',
                'description' => 'Can Gox ve triosuyla özel caz gecesi.',
                'artists' => ['can-gox'],
                'days_from_now' => 7,
            ],
            [
                'venue' => $nardis,
                'title' => 'İmer Demirer Quartet',
                'description' => 'İmer Demirer ve grubu Nardis\'te.',
                'artists' => ['imer-demirer'],
                'days_from_now' => 10,
            ],
            [
                'venue' => $babylon,
                'title' => 'Gripin - Pop Rock Gecesi',
                'description' => 'Gripin\'in en sevilen şarkıları canlı.',
                'artists' => ['gripin'],
                'days_from_now' => 35,
            ],
            [
                'venue' => $babylon,
                'title' => 'Athena - Ska Parti',
                'description' => 'Athena ile ska punk partisi. Eurovision klasikleri dahil.',
                'artists' => ['athena'],
                'days_from_now' => 42,
            ],
            [
                'venue' => $zorlu,
                'title' => 'Sezen Aksu - Özel Konser',
                'description' => 'Minik Serçe\'den unutulmaz bir gece.',
                'artists' => ['sezen-aksu'],
                'days_from_now' => 75,
            ],
            [
                'venue' => $babylon,
                'title' => 'Duman + Teoman - Özel Etkinlik',
                'description' => 'İki dev isim aynı sahnede. Tarihi performans.',
                'artists' => ['duman', 'teoman'],
                'days_from_now' => 120,
            ],
            [
                'venue' => $nardis,
                'title' => 'İlhan Erşahin - Nublu Nights',
                'description' => 'New York\'tan İstanbul\'a caz köprüsü.',
                'artists' => ['ilhan-ersahin'],
                'days_from_now' => 17,
            ],
            [
                'venue' => $babylon,
                'title' => 'Pentagram - Metal Gecesi',
                'description' => 'Türkiye\'nin ilk metal grubu Babylon\'da.',
                'artists' => ['pentagram'],
                'days_from_now' => 50,
            ],
            [
                'venue' => $zorlu,
                'title' => 'Cem Adrian - Soul Night',
                'description' => 'Cem Adrian\'ın eşsiz sesi Zorlu PSM\'de. Geniş repertuvar, uzun setlist ve sürpriz akustik bölüm ile detaylı bir konser deneyimi.',
                'artists' => ['cem-adrian'],
                'days_from_now' => 85,
            ],
            [
                'venue' => $babylon,
                'title' => 'Jakuzi - Elektronik Gece',
                'description' => 'Jakuzi\'nin synth-pop performansı.',
                'artists' => ['jakuzi'],
                'days_from_now' => 25,
            ],
            [
                'venue' => $babylon,
                'title' => 'Ayna - Anadolu Ezgileri',
                'description' => 'Ayna ile modern Türk halk müziği.',
                'artists' => ['ayna'],
                'days_from_now' => 55,
            ],
            [
                'venue' => $kucukciftlik ?? $zorlu,
                'title' => 'Gaye Su Akyol - Açık Hava',
                'description' => 'Bağımsız rock\'ın güçlü sesi açık havada.',
                'artists' => ['gaye-su-akyol'],
                'days_from_now' => 70,
            ],
            [
                'venue' => $jolly ?? $babylon,
                'title' => 'Kargo - 90\'lar Nostaljisi',
                'description' => 'Türk rock\'ın klasikleri Kargo\'dan.',
                'artists' => ['kargo'],
                'days_from_now' => 95,
            ],
            [
                'venue' => $nardis,
                'title' => 'Kerem Görsev Trio',
                'description' => 'Türk caz piyanisti ve triosu.',
                'artists' => ['kerem-gorsev'],
                'days_from_now' => 12,
            ],
            // Geçmiş etkinlikler (past events)
            [
                'venue' => $babylon,
                'title' => 'Duman - Geçen Ay',
                'description' => 'Duman Babylon\'da unutulmaz bir gece yaşattı.',
                'artists' => ['duman'],
                'days_from_now' => -30,
            ],
            [
                'venue' => $nardis,
                'title' => 'Can Gox - Caz Gecesi',
                'description' => 'Can Gox Nardis\'te muhteşem performansıyla hayran bıraktı.',
                'artists' => ['can-gox'],
                'days_from_now' => -14,
            ],
            [
                'venue' => $babylon,
                'title' => 'Teoman - Özel Performans',
                'description' => 'Teoman hayranlarıyla buluştu.',
                'artists' => ['teoman'],
                'days_from_now' => -45,
            ],
            [
                'venue' => $zorlu,
                'title' => 'Teoman - Kış Konseri',
                'description' => 'Yoğun ilgi gören kapalı gişe Teoman gecesi.',
                'artists' => ['teoman'],
                'days_from_now' => -90,
            ],
            [
                'venue' => $zorlu,
                'title' => 'Mor ve Ötesi - Yaz Konseri',
                'description' => 'Mor ve Ötesi Zorlu PSM\'de dev sahneye çıktı.',
                'artists' => ['mor-ve-otesi'],
                'days_from_now' => -60,
            ],
            // Anasayfa slider: bugün + önümüzdeki günler (tarihler seed anındaki now() ile göreceli)
            [
                'venue' => $nardis,
                'title' => 'Anasayfa Demo - Öğle Caz Seansı',
                'description' => 'Bugün öğlen Nardis\'te caz. Anasayfa bugünkü etkinlikler slider örneği.',
                'artists' => ['can-gox'],
                'days_from_now' => 0,
                'hour' => 13,
                'minute' => 30,
                'cover_image' => 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?q=80&w=1200&auto=format&fit=crop',
            ],
            [
                'venue' => $babylon,
                'title' => 'Anasayfa Demo - Akustik Öncesi',
                'description' => 'Bugün akşamüstü akustik set. Anasayfa slider örneği.',
                'artists' => ['gripin'],
                'days_from_now' => 0,
                'hour' => 18,
                'minute' => 0,
                'cover_image' => 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1200&auto=format&fit=crop',
            ],
            [
                'venue' => $babylon,
                'title' => 'Anasayfa Demo - Gece Rock',
                'description' => 'Gece yarısına kadar rock. Bu hafta slider için de yarın ve sonraki günlerde etkinlikler var.',
                'artists' => ['duman'],
                'days_from_now' => 1,
                'hour' => 20,
                'minute' => 30,
                'cover_image' => 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1200&auto=format&fit=crop',
            ],
            [
                'venue' => $jolly ?? $babylon,
                'title' => 'Anasayfa Demo - Cuma Gecesi',
                'description' => 'Hafta sonuna giriş konseri.',
                'artists' => ['athena'],
                'days_from_now' => 2,
                'hour' => 21,
                'minute' => 0,
                'cover_image' => 'https://images.unsplash.com/photo-1540039154733-95a5463cb46b?q=80&w=1200&auto=format&fit=crop',
            ],
            [
                'venue' => $kucukciftlik ?? $zorlu,
                'title' => 'Anasayfa Demo - Açık Hava Cumartesi',
                'description' => 'Hafta ortası açık hava.',
                'artists' => ['manga'],
                'days_from_now' => 3,
                'hour' => 19,
                'minute' => 0,
                'cover_image' => 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1200&auto=format&fit=crop',
            ],
            [
                'venue' => $zorlu,
                'title' => 'Anasayfa Demo - Pazar Matinée',
                'description' => 'Aile dostu öğleden sonra konseri.',
                'artists' => ['cem-adrian'],
                'days_from_now' => 4,
                'hour' => 15,
                'minute' => 0,
                'cover_image' => 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop',
            ],
            [
                'venue' => $nardis,
                'title' => 'Anasayfa Demo - Jazz Night',
                'description' => 'Haftanın caz gecesi.',
                'artists' => ['imer-demirer'],
                'days_from_now' => 5,
                'hour' => 21,
                'minute' => 30,
                'cover_image' => 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1200&auto=format&fit=crop',
            ],
            // Çapraz doğrulama: aynı etkinlik sanatçı + mekan sayfasında; farklı bilet durumları
            // Not: `artists` dizisi yalnızca ArtistSeeder’da gerçekten var olan slug’lar olmalı (pivot boş kalmasın).
            [
                'venue' => $jollyBursa ?? $jolly ?? $babylon,
                'title' => 'Emre Aydın — Jolly Joker Bursa',
                'description' => 'Bursa akşamı; Sahnebul rezervasyonu açık örnek etkinlik.',
                'artists' => ['emre-aydin'],
                'days_from_now' => 24,
                'hour' => 21,
                'minute' => 0,
                'cover_image' => 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop',
                'ticket_acquisition_mode' => Event::TICKET_MODE_SAHNEBUL_RESERVATION,
                'sahnebul_reservation_enabled' => true,
            ],
            [
                'venue' => $jollyBursa ?? $jolly ?? $babylon,
                'title' => 'Buray — Bursa Harici Bilet',
                'description' => 'Biletler harici platformda; linkler etkinlik sayfasında listelenir.',
                'artists' => ['buray'],
                'days_from_now' => 26,
                'hour' => 20,
                'minute' => 30,
                'ticket_acquisition_mode' => Event::TICKET_MODE_EXTERNAL,
                'sahnebul_reservation_enabled' => false,
                'ticket_outlets' => [
                    ['label' => 'Biletix', 'url' => 'https://www.biletix.com/etkinlik/ornek-duman-bursa-1'],
                ],
            ],
            [
                'venue' => $jollyBursa ?? $jolly ?? $babylon,
                'title' => 'Simge — Bursa Telefon',
                'description' => 'Bilet ve bilgi için mekân telefon hattı.',
                'artists' => ['simge'],
                'days_from_now' => 29,
                'hour' => 19,
                'minute' => 45,
                'ticket_acquisition_mode' => Event::TICKET_MODE_PHONE,
                'sahnebul_reservation_enabled' => false,
                'ticket_outlets' => [],
            ],
            [
                'venue' => $jollyBursa ?? $jolly ?? $babylon,
                'title' => 'Hande Yener — Bursa (Kapasite Dolu)',
                'description' => 'Kapasite doldu; rozet tükendi göstermeli.',
                'artists' => ['hande-yener'],
                'days_from_now' => 33,
                'hour' => 21,
                'minute' => 0,
                'is_full' => true,
                'ticket_acquisition_mode' => Event::TICKET_MODE_SAHNEBUL_RESERVATION,
                'sahnebul_reservation_enabled' => true,
            ],
            [
                'venue' => $jollyBursa ?? $jolly ?? $babylon,
                'title' => 'Berkay + Simge — Bursa Ortak Sahne',
                'description' => 'İki sanatçı aynı etkinlikte; her iki profilde de listelenmeli.',
                'artists' => ['berkay', 'simge'],
                'days_from_now' => 40,
                'hour' => 20,
                'minute' => 0,
                'ticket_acquisition_mode' => Event::TICKET_MODE_EXTERNAL,
                'sahnebul_reservation_enabled' => false,
                'ticket_outlets' => [
                    ['label' => 'Passo', 'url' => 'https://www.passo.com.tr/tr/etkinlik/ornek'],
                ],
            ],
            [
                'venue' => $ifHall ?? $zorlu,
                'title' => 'Sertab Erener — IF Performance (İptal)',
                'description' => 'İptal edilmiş etkinlik örneği.',
                'artists' => ['sertab-erener'],
                'days_from_now' => 11,
                'hour' => 19,
                'minute' => 30,
                'event_status' => 'cancelled',
            ],
            [
                'venue' => $mebAnkara ?? $zorlu,
                'title' => 'Berkay — Ankara MEB Şura',
                'description' => 'Başkent konseri; harici bilet satışı.',
                'artists' => ['berkay'],
                'days_from_now' => 36,
                'hour' => 20,
                'minute' => 15,
                'ticket_acquisition_mode' => Event::TICKET_MODE_EXTERNAL,
                'sahnebul_reservation_enabled' => false,
                'ticket_outlets' => [
                    ['label' => 'Biletix', 'url' => 'https://www.biletix.com/etkinlik/ornek-berkay-ankara'],
                ],
            ],
            [
                'venue' => $ifHall ?? $babylon,
                'title' => 'Murat Boz — IF (Çift Platform)',
                'description' => 'Birden fazla harici satış adresi.',
                'artists' => ['murat-boz'],
                'days_from_now' => 15,
                'hour' => 21,
                'minute' => 30,
                'ticket_acquisition_mode' => Event::TICKET_MODE_EXTERNAL,
                'sahnebul_reservation_enabled' => false,
                'ticket_outlets' => [
                    ['label' => 'Biletix', 'url' => 'https://www.biletix.com/etkinlik/ornek-gripin-if'],
                    ['label' => 'Mobilet', 'url' => 'https://www.mobilet.com/tr/ornek-etkinlik'],
                ],
            ],
            [
                'venue' => $jollyBursa ?? $babylon,
                'title' => 'Kenan Doğulu — Bursa Akşam',
                'description' => 'Erken saat konseri.',
                'artists' => ['kenan-dogulu'],
                'days_from_now' => 8,
                'hour' => 18,
                'minute' => 0,
                'ticket_acquisition_mode' => Event::TICKET_MODE_SAHNEBUL_RESERVATION,
                'sahnebul_reservation_enabled' => true,
            ],
            [
                'venue' => $jollyBursa ?? $babylon,
                'title' => 'Mabel Matiz — Bursa Gece',
                'description' => 'Gece yarısına uzayan set.',
                'artists' => ['mabel-matiz'],
                'days_from_now' => 47,
                'hour' => 23,
                'minute' => 0,
                'ticket_acquisition_mode' => Event::TICKET_MODE_PHONE,
                'sahnebul_reservation_enabled' => false,
            ],
            [
                'venue' => $jollyBursa ?? $babylon,
                'title' => 'Sezen Aksu — Bursa Özel',
                'description' => 'Uzun soluklu performans.',
                'artists' => ['sezen-aksu'],
                'days_from_now' => 62,
                'hour' => 20,
                'minute' => 30,
                'ticket_acquisition_mode' => Event::TICKET_MODE_SAHNEBUL_RESERVATION,
                'sahnebul_reservation_enabled' => true,
            ],
        ];

        foreach ($events as $e) {
            $hour = $e['hour'] ?? 21;
            $minute = $e['minute'] ?? 0;
            $start = now()->addDays($e['days_from_now'])->setHour($hour)->setMinute($minute)->setSecond(0);
            $end = $start->copy()->addHours(3);

            $base = rand(150, 380);

            $mode = $e['ticket_acquisition_mode'] ?? Event::TICKET_MODE_SAHNEBUL_RESERVATION;
            $sahnebulOn = array_key_exists('sahnebul_reservation_enabled', $e)
                ? (bool) $e['sahnebul_reservation_enabled']
                : in_array($mode, [Event::TICKET_MODE_SAHNEBUL, Event::TICKET_MODE_SAHNEBUL_RESERVATION], true);
            $paytrOn = array_key_exists('paytr_checkout_enabled', $e)
                ? (bool) $e['paytr_checkout_enabled']
                : $mode === Event::TICKET_MODE_SAHNEBUL_CARD;
            $outlets = $e['ticket_outlets'] ?? [];

            $event = Event::updateOrCreate(
                [
                    'venue_id' => $e['venue']->id,
                    'slug' => Str::slug($e['title']).'-'.abs((int) $e['days_from_now']),
                ],
                [
                    'title' => $e['title'],
                    'description' => $e['description'],
                    'event_type' => $e['event_type'] ?? 'konser',
                    'event_rules' => "Etkinlik alanına girişte bilet ve kimlik kontrolü yapılır.\nDışarıdan yiyecek ve içecek getirilmesine izin verilmez.\nProfesyonel kamera ve kayıt ekipmanları için organizatör onayı gerekir.\nEtkinlik başlangıcından sonra iade/değişim organizatör kurallarına tabidir.",
                    'start_date' => $start,
                    'end_date' => $end,
                    'ticket_price' => $base,
                    'capacity' => $e['venue']->capacity,
                    'status' => $e['event_status'] ?? 'published',
                    'cover_image' => $e['cover_image'] ?? null,
                    'ticket_acquisition_mode' => $mode,
                    'sahnebul_reservation_enabled' => $sahnebulOn,
                    'paytr_checkout_enabled' => $paytrOn,
                    'is_full' => (bool) ($e['is_full'] ?? false),
                    'ticket_outlets' => is_array($outlets) ? $outlets : [],
                ]
            );

            $event->syncTicketTiers([
                [
                    'name' => 'Ayakta / Genel',
                    'description' => 'Stant alanı giriş',
                    'price' => $base,
                    'sort_order' => 0,
                ],
                [
                    'name' => 'Tribün',
                    'description' => 'Numaralı oturma',
                    'price' => $base + rand(80, 180),
                    'sort_order' => 1,
                ],
                [
                    'name' => 'VIP / Ön sıra',
                    'description' => 'Ön blok veya loca benzeri ayrıcalıklı alan',
                    'price' => $base + rand(200, 450),
                    'sort_order' => 2,
                ],
            ]);

            $order = 0;
            foreach ($e['artists'] as $artistSlug) {
                $artist = Artist::where('slug', $artistSlug)->first();
                if ($artist) {
                    $event->artists()->syncWithoutDetaching([
                        $artist->id => ['is_headliner' => $order === 0, 'order' => $order],
                    ]);
                    $order++;
                }
            }
            if ($event->artists()->count() === 0) {
                app(EventArtistLinkResolver::class)->attachIfEventHasNoArtists($event);
            }
        }
    }
}
