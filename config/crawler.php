<?php

$biletinialListingCityPath = strtolower(trim((string) env('BILETINIAL_LISTING_CITY_PATH', 'istanbul')));
if ($biletinialListingCityPath === '') {
    $biletinialListingCityPath = 'istanbul';
}

return [
    'sources' => [
        /** Konser listesi — kartlar detay sayfasına gider; crawler her detaydaki tüm tarih/mekan satırlarını okur. */
        'biletinial' => [
            'url' => 'https://biletinial.com/tr-tr/muzik',
            /**
             * Aynı URL kalıbı (/tr-tr/{kategori}/slug) için birden fazla liste sayfası; linkler birleştirilir.
             * Şehir son ekli sayfalar (sinema, müzik, şehrine özel) .env: BILETINIAL_LISTING_CITY_PATH (varsayılan istanbul).
             * Detay kotası liste başına round-robin dağıtılır; yalnızca ilk kategori (ör. müzik) doldurup diğerlerini kesmez.
             */
            'listing_urls' => [
                'https://biletinial.com/tr-tr/muzik',
                'https://biletinial.com/tr-tr/muzik/'.$biletinialListingCityPath,
                'https://biletinial.com/tr-tr/etkinlik',
                'https://biletinial.com/tr-tr/tiyatro',
                'https://biletinial.com/tr-tr/spor',
                'https://biletinial.com/tr-tr/sinema/'.$biletinialListingCityPath,
                'https://biletinial.com/tr-tr/etkinlikleri/stand-up',
                'https://biletinial.com/tr-tr/sehrineozel/'.$biletinialListingCityPath,
            ],
            'city' => 'İstanbul',
        ],
        'biletix' => [
            'url' => 'https://www.biletix.com/anasayfa/TURKIYE/tr',
            'city' => 'İstanbul',
        ],
        'bubilet' => [
            /** Tek kaynak kontrolü için (crawler::crawl) — gerçek liste `listing_tags` + şehir segmenti ile üretilir */
            'url' => 'https://www.bubilet.com.tr/istanbul/etiket/konser',
            /** JSON-LD’de şehir yoksa yedek (liste URL’sinden de türetilir) */
            'city' => 'İstanbul',
            /**
             * Bubilet şehir sayfası: https://www.bubilet.com.tr/{şehir-slug}/etiket/{etiket}
             * Admin’de şehir seçilmezse bu slug kullanılır (.env: BUBILET_DEFAULT_CITY_SLUG).
             */
            'default_city_slug' => strtolower((string) (env('BUBILET_DEFAULT_CITY_SLUG') ?: 'istanbul')),
            /**
             * Etiket path parçaları (sırayla tüm şehir × tüm etiket taranır).
             * Özel kurulum için `listing_urls` doluysa o dizin (şehir seçimine göre yeniden yazılır) kullanılabilir.
             */
            'listing_tags' => [
                'konser',
                'tiyatro',
                'festival',
                'elektronik-muzik',
                'stand-up',
                'cocuk-aktiviteleri',
                'workshop',
                'spor',
                'muzikal',
                'sergi',
            ],
            'listing_urls' => null,
        ],
        /** https://www.bubilet.com.tr/sehir-sec — şehir bazlı popüler etkinlik kartları (HTML) */
        'bubilet_sehir_sec' => [
            'url' => 'https://www.bubilet.com.tr/sehir-sec',
        ],
        /**
         * https://biletsirasi.com — fiyat karşılaştırma; etkinlik detaylarında schema.org Event (JSON-LD).
         * Liste sayfalarından /{kategori}/{slug} linkleri toplanır, detayda LD+JSON okunur.
         */
        'biletsirasi' => [
            'url' => 'https://biletsirasi.com/',
            'listing_urls' => [
                'https://biletsirasi.com/konser',
                'https://biletsirasi.com/tiyatro',
                'https://biletsirasi.com/stand-up',
                'https://biletsirasi.com/spor',
                'https://biletsirasi.com/sinema',
                'https://biletsirasi.com/cocuk',
                'https://biletsirasi.com/festival',
                'https://biletsirasi.com/parti',
                'https://biletsirasi.com/dans',
                'https://biletsirasi.com/opera',
                'https://biletsirasi.com/muzikal',
                'https://biletsirasi.com/sergi',
                'https://biletsirasi.com/gosteri',
                'https://biletsirasi.com/atolye',
                'https://biletsirasi.com/tema-parki',
                'https://biletsirasi.com/muze',
                'https://biletsirasi.com/egitim',
                'https://biletsirasi.com/konferans',
                'https://biletsirasi.com/fuar',
                'https://biletsirasi.com/sirk',
                'https://biletsirasi.com/yemek',
                'https://biletsirasi.com/diger',
            ],
            'city' => 'İstanbul',
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

    /**
     * Netscape/curl cookies.txt mutlak yolu. Okunabilirse panel yüklemesinden önce gelir.
     * BUBILET_COOKIES (satır) ile birleştirilir; aynı çerez adında env değeri dosyayı ezer.
     */
    'bubilet_cookies_file' => env('BUBILET_COOKIES_FILE', ''),

    /** İlk istek için Referer (boş string ise header gönderilmez) */
    'bubilet_referer' => env('BUBILET_REFERER', 'https://www.bubilet.com.tr/'),

    /**
     * Bubilet HTTP istekleri için vekil (Cloudflare sunucu IP’sini engelliyorsa).
     * Örnek: http://kullanici:sifre@proxy.saglayici.com:12345
     * SOCKS için genelde PHP tarafında ek eklenti gerekir; tercihen HTTP CONNECT destekleyen residential proxy kullanın.
     */
    'bubilet_http_proxy' => env('BUBILET_HTTP_PROXY', ''),

    'timeout' => 20,

    /** Bubilet etiket sayfaları arasında istekler arası bekleme (mikrosaniye) */
    'bubilet_listing_delay_us' => (int) env('BUBILET_LISTING_DELAY_US', 200_000),

    /**
     * Admin’de şehir seçilmediğinde veritabanındaki tüm iller Bubilet için kullanılırsa
     * (şehir × etiket) istek sayısı patlar ve iş zaman aşımına düşer. Bu durumda yalnızca
     * bu listedeki şehir slug’ları (DB’de varsa) kullanılır.
     *
     * @var list<string>
     */
    'bubilet_preferred_city_slugs' => array_values(array_filter(array_map(
        'strtolower',
        array_map('trim', explode(',', (string) env(
            'BUBILET_PREFERRED_CITY_SLUGS',
            'istanbul,ankara,izmir,antalya,bursa,adana,gaziantep,konya,eskisehir,trabzon,kayseri,mersin,mugla,denizli'
        )))
    ))),

    /** Yukarıdaki tercih listesiyle sınırlandırma yalnızca bu kadar şehirden fazlası seçildiyse devreye girer */
    'bubilet_max_city_slugs_per_crawl' => max(1, (int) env('BUBILET_MAX_CITY_SLUGS_PER_CRAWL', 14)),

    /** Bubilet: liste sayfalarından toplanan benzersiz etkinlik yolları için detay isteği üst sınırı */
    'bubilet_max_detail_pages' => max(20, min(2000, (int) env('BUBILET_MAX_DETAIL_PAGES', 400))),

    /**
     * Admin “Verileri çek” / önizleme HTTP isteği — çok sayıda harici sayfa açıldığı için
     * PHP varsayılan 30 sn yetmez. Sunucu (nginx/php-fpm) limitlerini de gerektiğinde yükseltin.
     */
    'max_execution_seconds' => (int) env('CRAWLER_MAX_EXECUTION_SECONDS', 300),

    /**
     * Admin kuyruk işi: Bubilet/Biletinial/Biletsirasi detay istekleri küçük zincir işlere bölünsün mü.
     * false: tek işte tüm tarama (CLI ile aynı; uzun sürebilir).
     */
    'admin_use_chunked_crawl_chain' => filter_var(
        env('CRAWLER_ADMIN_CHUNKED_CRAWL', true),
        FILTER_VALIDATE_BOOL,
        ['flags' => FILTER_NULL_ON_FAILURE],
    ) ?? true,

    /** Chunk başına en fazla kaç detay sayfası (her alt iş ~ birkaç dakika) */
    'chunk_detail_batch_size' => max(5, min(200, (int) env('CRAWLER_CHUNK_DETAIL_BATCH_SIZE', 35))),

    /**
     * Zincirde bir önceki chunk bittikten sonra, sonraki chunk başlamadan önce bekleme (saniye).
     * 0 = arada ek bekleme yok (yine de işler sırayla çalışır). 60–120 önerilir.
     */
    'chunk_pause_seconds_between_batches' => max(0, min(3600, (int) env('CRAWLER_CHUNK_PAUSE_SECONDS', 60))),

    /** Liste toplama + zinciri kuran ana işin zaman aşımı (saniye) */
    'chunked_crawl_orchestrator_timeout_seconds' => max(120, min(3600, (int) env('CRAWLER_ORCHESTRATOR_TIMEOUT_SECONDS', 900))),

    /** Tek bir detay-chunk işinin zaman aşımı (saniye) */
    'chunked_crawl_detail_job_timeout_seconds' => max(60, min(3600, (int) env('CRAWLER_CHUNK_JOB_TIMEOUT_SECONDS', 300))),

    /** Birleştirme + DB yazma finalize işinin zaman aşımı (saniye) */
    'chunked_crawl_finalize_timeout_seconds' => max(120, min(3600, (int) env('CRAWLER_FINALIZE_TIMEOUT_SECONDS', 600))),

    /**
     * Biletinial: liste(ler)den toplanan benzersiz etkinlik yollarından kaçının detayı istenecek (üst sınır).
     * Önceki varsayılan 55 çok düşük kalıyordu; yavaş tarama için chunk bekleme ayarlarıyla birlikte kullanın.
     */
    'biletinial_max_detail_pages' => (int) env('BILETINIAL_CRAWL_MAX_DETAIL_PAGES', 200),

    /** Biletinial: ardışık liste sayfaları (müzik, etkinlik, …) arasında mikrosaniye bekleme */
    'biletinial_listing_delay_us' => (int) env('BILETINIAL_LISTING_DELAY_US', 350_000),

    /** Biletinial: her detay isteği arası (varsayılan ~120 ms) */
    'biletinial_detail_delay_us' => (int) env('BILETINIAL_DETAIL_DELAY_US', 120_000),

    /** Her N detaydan sonra ekstra bekleme (ör. 5 ve 5 yavaş çekim) */
    'biletinial_detail_chunk_size' => max(1, (int) env('BILETINIAL_DETAIL_CHUNK_SIZE', 5)),

    'biletinial_chunk_pause_us' => (int) env('BILETINIAL_CHUNK_PAUSE_US', 550_000),

    /** Biletix anasayfa ?page=2,3,… ile ek etkinlik kutuları */
    'biletix_max_pages' => max(1, (int) env('BILETIX_CRAWL_MAX_PAGES', 15)),

    'biletix_page_delay_us' => (int) env('BILETIX_PAGE_DELAY_US', 280_000),

    'biletix_page_chunk_size' => max(1, (int) env('BILETIX_PAGE_CHUNK_SIZE', 5)),

    'biletix_chunk_pause_us' => (int) env('BILETIX_CHUNK_PAUSE_US', 500_000),

    /** Biletsirasi: liste(ler)den toplanan benzersiz etkinlik yolları için detay isteği üst sınırı */
    'biletsirasi_max_detail_pages' => (int) env('BILETSIRASI_CRAWL_MAX_DETAIL_PAGES', 300),

    'biletsirasi_listing_delay_us' => (int) env('BILETSIRASI_LISTING_DELAY_US', 250_000),

    'biletsirasi_detail_delay_us' => (int) env('BILETSIRASI_DETAIL_DELAY_US', 100_000),

    'biletsirasi_detail_chunk_size' => max(1, (int) env('BILETSIRASI_DETAIL_CHUNK_SIZE', 5)),

    'biletsirasi_chunk_pause_us' => (int) env('BILETSIRASI_CHUNK_PAUSE_US', 400_000),
];
