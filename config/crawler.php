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
            'url' => 'https://www.bubilet.com.tr/istanbul/etiket/konser',
            'city' => 'İstanbul',
        ],
        /** https://www.bubilet.com.tr/sehir-sec — şehir bazlı popüler etkinlik kartları (HTML) */
        'bubilet_sehir_sec' => [
            'url' => 'https://www.bubilet.com.tr/sehir-sec',
        ],
    ],
    'user_agent' => 'SahnebulBot/1.0 (+https://sahnebul.com)',
    'timeout' => 20,

    /**
     * Admin “Verileri çek” / önizleme HTTP isteği — çok sayıda harici sayfa açıldığı için
     * PHP varsayılan 30 sn yetmez. Sunucu (nginx/php-fpm) limitlerini de gerektiğinde yükseltin.
     */
    'max_execution_seconds' => (int) env('CRAWLER_MAX_EXECUTION_SECONDS', 300),

    /** Biletinial liste sonrası açılacak etkinlik detay URL sayısı üst sınırı (her biri ~0,1 sn + HTTP). */
    'biletinial_max_detail_pages' => (int) env('BILETINIAL_CRAWL_MAX_DETAIL_PAGES', 55),
];
