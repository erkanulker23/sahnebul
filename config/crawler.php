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
];
