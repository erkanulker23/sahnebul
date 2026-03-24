<?php

return [
    'sources' => [
        'biletinial' => [
            'url' => 'https://biletinial.com/',
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
