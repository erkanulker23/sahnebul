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
];
