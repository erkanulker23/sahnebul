<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /**
     * Apple iTunes Search API (ücretsiz, anahtarsız). Sanatçı sayfası şarkı/albüm önizlemesi için Spotify Web API yerine kullanılır.
     */
    'itunes' => [
        'country' => env('ITUNES_SEARCH_COUNTRY', 'TR'),
    ],

    'spotify' => [
        'client_id' => env('SPOTIFY_CLIENT_ID'),
        'client_secret' => env('SPOTIFY_CLIENT_SECRET'),
        'market' => env('SPOTIFY_MARKET', 'TR'),
        'locale' => env('SPOTIFY_LOCALE', 'tr_TR'),
        /** İçe aktarma: browse kategorisi sayısı üst sınırı (offset ile artar) */
        'import_max_categories' => (int) env('SPOTIFY_IMPORT_MAX_CATEGORIES', 30),
        /** Kategori başına çalma listesi */
        'import_playlists_per_category' => (int) env('SPOTIFY_IMPORT_PLAYLISTS_PER_CATEGORY', 5),
        /** Çalma listesi başına en fazla “sayfa” (50 parça) */
        'import_max_playlist_track_pages' => (int) env('SPOTIFY_IMPORT_PLAYLIST_PAGES', 4),
        /** spotify_id yokken isim araması: tam eşleşme yoksa en az bu popülerlikte ilk sonucu kabul et (0 = yalnızca tam isim eşleşmesi) */
        'link_by_name_min_popularity' => (int) env('SPOTIFY_LINK_BY_NAME_MIN_POPULARITY', 28),
    ],

    /*
    | MusicBrainz: Spotify API anahtarı olmadan sanatçı + Spotify URL için kullanılır.
    | İstek aralığı saniyesi resmi öneriye uygundur.
    */
    'musicbrainz' => [
        'user_agent' => env('MUSICBRAINZ_USER_AGENT', 'Sahnebul/1.0 (https://sahnebul.test)'),
        'min_interval_seconds' => (float) env('MUSICBRAINZ_MIN_INTERVAL', 1.1),
        'search_query' => env('MUSICBRAINZ_SEARCH_QUERY', 'country:TR'),
    ],

    'wikidata' => [
        'user_agent' => env('WIKIDATA_USER_AGENT', 'Sahnebul/1.0 (https://sahnebul.test)'),
    ],

    /**
     * Google: Maps (tarayıcı) + Custom Search JSON API (sunucu, görsel arama).
     * maps_browser_key: Admin → Ayarlar’da kayıtlı değer varsa AppSettingsService onu kullanır; yoksa .env.
     * Dikkat: 'google' anahtarı yalnızca bir kez tanımlanmalı (sonraki tanım öncekini ezer).
     */
    'google' => [
        'maps_browser_key' => env('GOOGLE_MAPS_API_KEY'),
        'custom_search_key' => env('GOOGLE_CUSTOM_SEARCH_API_KEY'),
        'custom_search_cx' => env('GOOGLE_CUSTOM_SEARCH_ENGINE_ID'),
    ],

    /**
     * Türkiye illeri / ilçeleri: https://docs.turkiyeapi.dev/
     * Uç nokta tabanı: https://api.turkiyeapi.dev/v1
     */
    'turkiye_api' => [
        'base_url' => rtrim(env('TURKIYE_API_BASE_URL', 'https://api.turkiyeapi.dev/v1'), '/'),
        'docs_url' => env('TURKIYE_API_DOCS_URL', 'https://docs.turkiyeapi.dev/'),
    ],

    /**
     * OpenStreetMap Nominatim — ters jeodezik (konum → ilçe). Kullanım politikası: anlamlı User-Agent zorunlu.
     *
     * @see https://operations.osmfoundation.org/policies/nominatim/
     */
    'nominatim' => [
        'user_agent' => env('NOMINATIM_USER_AGENT', 'SahneBul/1.0 (https://sahnebul.test; iletisim@sahnebul.test)'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Genel API / JSON uçları — dakika başına IP limitleri (RateLimiter adları)
    |--------------------------------------------------------------------------
    */
    'rate_limits' => [
        'reverse_geocode_per_minute' => (int) env('RATE_LIMIT_REVERSE_GEOCODE', 24),
        'search_quick_per_minute' => (int) env('RATE_LIMIT_SEARCH_QUICK', 60),
        'events_nearby_per_minute' => (int) env('RATE_LIMIT_EVENTS_NEARBY', 45),
        'venues_nearby_per_minute' => (int) env('RATE_LIMIT_VENUES_NEARBY', 45),
        'api_locations_per_minute' => (int) env('RATE_LIMIT_API_LOCATIONS', 90),
    ],

    /**
     * Instagram (ve benzeri) video indirmek için isteğe bağlı yt-dlp ikili dosyası.
     * Sunucuda: brew install yt-dlp veya pip install yt-dlp — ardından YTDLP_BINARY=/usr/local/bin/yt-dlp
     *
     * @see https://github.com/yt-dlp/yt-dlp
     */
    'ytdlp' => [
        'binary' => env('YTDLP_BINARY'),
        'timeout' => (int) env('YTDLP_TIMEOUT', 300),
        'cookies_file' => env('YTDLP_COOKIES_FILE'),
    ],

    /**
     * instagram.com HTML istekleri (og meta, hikâye sayfası). Sunucu IP’lerinde HTTP 429 sık;
     * tarayıcıdan kopyalanan ham Cookie değeri (sessionid=…; csrftoken=…) isteği biraz “oturumlu” gösterir.
     * Gizli tutun; yt-dlp için ayrıca YTDLP_COOKIES_FILE (Netscape) kullanılır.
     */
    'instagram' => [
        'fetch_cookies' => env('INSTAGRAM_FETCH_COOKIES'),
        /** Çoklu URL içe aktarımda ardışık Instagram istekleri arası bekleme (429 azaltır). 0 = kapalı. */
        'batch_delay_seconds' => max(0, min(90, (int) env('INSTAGRAM_BATCH_DELAY_SECONDS', 6))),
    ],

    /**
     * yt-dlp DASH video + m4a sesi birleştirmek için (brew install ffmpeg).
     */
    'ffmpeg' => [
        'binary' => env('FFMPEG_BINARY'),
        'timeout' => (int) env('FFMPEG_TIMEOUT', 180),
    ],

];
