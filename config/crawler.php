<?php

return [
    'sources' => [
        /** Konser listesi — kartlar detay sayfasına gider; crawler her detaydaki tüm tarih/mekan satırlarını okur. */
        'biletinial' => [
            'url' => 'https://biletinial.com/tr-tr/muzik',
            'city' => 'İstanbul',
        ],
        'biletix' => [
            'url' => 'https://www.biletix.com/anasayfa/TURKIYE/tr',
            'city' => 'İstanbul',
        ],
        'bubilet' => [
            /** @deprecated Tek URL; `listing_urls` kullanın */
            'url' => 'https://www.bubilet.com.tr/istanbul/etiket/konser',
            'city' => 'İstanbul',
            /**
             * Bubilet etiket sayfaları SSR’da her biri ~20–24 kart veriyor; sayfa parametresi ek veri döndürmüyor.
             * Farklı etiketler birleştirilerek kapsam artırılır (ör. konser + tiyatro + festival…).
             */
            'listing_urls' => [
                'https://www.bubilet.com.tr/istanbul/etiket/konser',
                'https://www.bubilet.com.tr/istanbul/etiket/tiyatro',
                'https://www.bubilet.com.tr/istanbul/etiket/festival',
                'https://www.bubilet.com.tr/istanbul/etiket/elektronik-muzik',
                'https://www.bubilet.com.tr/istanbul/etiket/stand-up',
                'https://www.bubilet.com.tr/istanbul/etiket/cocuk-aktiviteleri',
                'https://www.bubilet.com.tr/istanbul/etiket/workshop',
            ],
        ],
        /** https://www.bubilet.com.tr/sehir-sec — şehir bazlı popüler etkinlik kartları (HTML) */
        'bubilet_sehir_sec' => [
            'url' => 'https://www.bubilet.com.tr/sehir-sec',
        ],
    ],
    'user_agent' => 'SahnebulBot/1.0 (+https://sahnebul.com)',

    /**
     * Bubilet Cloudflare sık sık bot istemcilerini keser. Boş bırakılırsa tarayıcıya yakın UA kullanılır.
     * Özel bot kimliği için .env: BUBILET_USER_AGENT="SahnebulBot/1.0 (+https://sahnebul.com)"
     */
    'bubilet_user_agent' => env('BUBILET_USER_AGENT', ''),

    /** Tarayıcıdan kopyalanan çerezler (cf_clearance vb.); Cloudflare engelini aşmak için deneysel */
    'bubilet_cookies' => env('BUBILET_COOKIES', ''),

    /** İlk istek için Referer (boş string ise header gönderilmez) */
    'bubilet_referer' => env('BUBILET_REFERER', 'https://www.bubilet.com.tr/'),

    'timeout' => 20,

    /** Bubilet etiket sayfaları arasında istekler arası bekleme (mikrosaniye) */
    'bubilet_listing_delay_us' => (int) env('BUBILET_LISTING_DELAY_US', 200_000),

    /**
     * Admin “Verileri çek” / önizleme HTTP isteği — çok sayıda harici sayfa açıldığı için
     * PHP varsayılan 30 sn yetmez. Sunucu (nginx/php-fpm) limitlerini de gerektiğinde yükseltin.
     */
    'max_execution_seconds' => (int) env('CRAWLER_MAX_EXECUTION_SECONDS', 300),

    /** Biletinial liste sonrası açılacak etkinlik detay URL sayısı üst sınırı (her biri ~0,1 sn + HTTP). */
    'biletinial_max_detail_pages' => (int) env('BILETINIAL_CRAWL_MAX_DETAIL_PAGES', 55),
];
