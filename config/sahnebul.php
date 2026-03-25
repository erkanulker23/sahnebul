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
];
