<?php

return [
    /**
     * AdminUserSeeder bu hesabı her `db:seed` ile günceller. .env kullanılmaz.
     * Tam yönetim paneli: role super_admin (isAdmin / tüm admin rotaları).
     */
    'super_admin' => [
        'email' => 'erkanulker0@gmail.com',
        'password' => 'password',
        'name' => 'Sahnebul Yönetici',
    ],

    /**
     * Veritabanında `footer` ayarı yokken Inertia / ön yüzde kullanılacak varsayılan footer.
     * AppSettingSeeder aynı yapıyı DB'ye yazar.
     */
    'default_footer' => [
        'brand' => 'SAHNEBUL',
        'description' => 'Türkiye genelinde mekanları, sanatçıları ve etkinlikleri keşfet.',
        'contact' => [
            'email' => 'iletisim@sahnebul.com',
            'phone' => '+90 212 111 11 11',
            'address' => 'İstanbul, Türkiye',
        ],
        'links' => [
            ['label' => 'Mekanlar', 'route' => 'venues.index'],
            ['label' => 'Sanatçılar', 'route' => 'artists.index'],
            ['label' => 'Etkinlikler', 'route' => 'events.index'],
            ['label' => 'Blog', 'route' => 'blog.index'],
            ['label' => 'İletişim', 'route' => 'contact'],
        ],
        'social' => [
            ['label' => 'Instagram', 'url' => 'https://instagram.com/sahnebul'],
            ['label' => 'X', 'url' => 'https://x.com/sahnebul'],
            ['label' => 'YouTube', 'url' => 'https://youtube.com/@sahnebul'],
        ],
        'copyright' => '© '.date('Y').' Sahnebul. Tüm hakları saklıdır.',
    ],

    /**
     * OG/Twitter önizlemesinde görsel yokken kullanılır (mutlak yol, public altında).
     * Üretimde 1200×630 PNG/JPEG önerilir; SVG bazı ağlarda sınırlı desteklenir.
     */
    'default_og_image' => env('SAHNE_DEFAULT_OG_IMAGE', '/images/sahnebul-og.svg'),

    /**
     * app_settings.site yokken veya alan boşken ön yüz / SEO varsayılanları.
     * Süper yönetici panelden (Ayarlar → Site & SEO) doldurur.
     *
     * @var array<string, mixed>
     */
    'default_site_public' => [
        'site_name' => null,
        'logo_path' => null,
        'favicon_path' => null,
        /** @deprecated Tek görsel; yerine home_hero_slide_paths kullanılır (okuma için hâlâ desteklenir). */
        'home_hero_image_path' => null,
        /** Ana sayfa hero slider — en fazla 3 yol, public storage `site/` altında. */
        'home_hero_slide_paths' => null,
        'seo' => [
            'default_description' => null,
            'default_og_image_path' => null,
            'keywords' => null,
            'twitter_handle' => null,
            'google_site_verification' => null,
            'yandex_verification' => null,
            'bing_verification' => null,
        ],
        /** Google Identity Services — yalnızca müşteri girişi / kayıt (OAuth istemci kimliği). */
        'google_sign_in' => [
            'enabled' => false,
            'client_id' => null,
            /** Laravel Crypt ile şifrelenmiş istemci sırrı (yalnızca sunucuda). */
            'client_secret' => null,
        ],
        'contact_email' => null,
        'support_email' => null,
        'phone' => null,
        'address' => null,
        /** Tam URL; admin panelden doldurulur — footer ve iletişim sayfasında listelenir. */
        'social_links' => [
            'instagram' => null,
            'facebook' => null,
            'twitter' => null,
            'youtube' => null,
            'linkedin' => null,
            'tiktok' => null,
        ],
    ],

    /**
     * Etkinlik hatırlatması SMS — SAHNEBUL_SMS_ENABLED=true ve sağlayıcı ayarları olunca gönderilir.
     * Kapalıyken tercih kaydedilir; EventReminderSmsService yalnızca log yazar.
     */
    'sms' => [
        'enabled' => (bool) env('SAHNEBUL_SMS_ENABLED', false),
    ],

    /**
     * Admin panelde çoklu tanıtım video URL içe aktarımı (sıralı yt-dlp) için PHP süre sınırı (saniye).
     * Nginx/Forge: site → Nginx şablonunda fastcgi_read_timeout aynı mertebede olmalı (ör. 900s).
     */
    'promo_url_import_time_limit' => (int) env('PROMO_URL_IMPORT_TIME_LIMIT', 900),

    /**
     * Admin SEO sayfaları — boş bırakılırsa kod içi varsayılan başlık/açıklama kullanılır.
     * Admin → SEO sayfalarında «SEO uyumlu doldur» bu metinleri forma yazar; kayıtlı DB şablonu yoksa ön yüz de bunları kullanır.
     * Anahtarlar PageSeoController ile aynı olmalıdır. Değişkenler: {site_name}, {year}, {default_description}, sayfaya özel etiketler.
     *
     * @var array<string, array{title?: string, description?: string}>
     */
    'default_page_seo' => [
        'home' => [
            'title' => '{site_name} — Konser, etkinlik ve mekân keşfi',
            'description' => 'Konser ve etkinlik takvimi, mekân ve sanatçı keşfi. {site_name}, {year}.',
        ],
        'venues_index' => [
            'title' => 'Konser ve etkinlik mekânları | {site_name}',
            'description' => 'Salon, kulüp ve canlı müzik mekânları; yorumlar ve program {site_name} üzerinden.',
        ],
        'venue_show' => [
            'title' => '{venue_name} — Mekân ve etkinlik programı',
            'description' => '{venue_name}: yorumlar, adres ve yaklaşan etkinlikler. Rezervasyon {site_name}’da.',
        ],
        'events_index' => [
            'title' => 'Yaklaşan konserler ve etkinlikler | {site_name}',
            'description' => 'Tarih, şehir ve türe göre filtreleyin. Bilet ve mekân bilgisi {site_name}’da, {year}.',
        ],
        'event_show' => [
            'title' => '{event_title} — Etkinlik',
            'description' => '{event_title}: etkinlik detayı, tarih ve bilet bilgisi {site_name}’da.',
        ],
        'artists_index' => [
            'title' => 'Sanatçılar ve gruplar | {site_name}',
            'description' => 'Konser sanatçıları ve gruplar; takvim ve mekân bağlantıları {site_name} üzerinden.',
        ],
        'artist_show' => [
            'title' => '{artist_name} — Konserleri ve etkinlikleri',
            'description' => '{artist_name} konser ve performans programı; yaklaşan tarihler ve mekân bilgisi {site_name}’da.',
        ],
        'contact' => [
            'title' => 'İletişim ve destek | {site_name}',
            'description' => 'Öneri ve destek için {site_name} ile iletişime geçin; form bu sayfada.',
        ],
        'blog_index' => [
            'title' => 'Blog — haberler ve rehberler | {site_name}',
            'description' => 'Konser kültürü ve platform haberleri. {site_name} blog, {year}.',
        ],
        'blog_show' => [
            'title' => '{blog_title} | {site_name}',
            'description' => '{blog_title} — konser ve etkinlik içeriği, {site_name} blog.',
        ],
        'legal_page' => [
            'title' => '{page_title} | {site_name}',
            'description' => '{page_title}: yasal metin ve bilgilendirme — {site_name}.',
        ],
        'sehir_sec' => [
            'title' => 'Şehrinizi seçin | {site_name}',
            'description' => 'Şehir bazlı etkinlik listesi; yayınlanmış program {site_name} ile uyumlu.',
        ],
        'sehir_sec_city' => [
            'title' => '{city_name} etkinlikleri ve konserleri | {site_name}',
            'description' => '{city_name}’de konser ve canlı etkinlikler. Keşfetmek için {site_name}.',
        ],
        'external_event_show' => [
            'title' => '{event_title} — Etkinlik özeti',
            'description' => '{event_title}: harici kaynak özeti; kesin bilgi organizatörden. {site_name}.',
        ],
    ],
];
