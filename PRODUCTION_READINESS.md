# Sahnebul — Production hazırlık özeti

Bu belge yapılan kod değişikliklerini, operasyon gereksinimlerini ve kalan riskleri özetler.

## 1. Ortam değişkenleri (`.env.example`)

- Laravel 11+ için önbellek anahtarı: `CACHE_STORE` (eski `CACHE_DRIVER` yerine).
- Örnek production bloğu: `APP_DEBUG=false`, `LOG_LEVEL=error`, `SESSION_ENCRYPT`, Redis önerileri, `TRUSTED_PROXIES`, `FILESYSTEM_DISK=s3`.
- Oran sınırları: `RATE_LIMIT_REVERSE_GEOCODE`, `RATE_LIMIT_SEARCH_QUICK`, `RATE_LIMIT_EVENTS_NEARBY`, `RATE_LIMIT_API_LOCATIONS`.

Canlı `.env` asla repoya eklenmemelidir.

## 2. Performans

- `php artisan config:cache`, `route:cache`, `view:cache`, `event:cache` doğrulandı.
- `events` tablosuna `(status, start_date)` bileşik indeks migrasyonu eklendi (liste sorguları).
- `VenueController@show` içinde onaylı yorumlar için `replies` ilişkisi eager load ile eklendi (N+1 azaltma).
- `EventController@index` ve `EventListingQuery` zaten uygun `with()` kullanıyor.

## 3. Kuyruk (queue)

- `ContactFormSubmitted` mailable: `ShouldQueue` + `ShouldQueueAfterCommit`, `$tries`, `$timeout`, `$backoff`.
- İletişim formu gönderimi artık worker üzerinden işlenir; canlıda `QUEUE_CONNECTION=database` veya `redis` + Forge **Queue** / `php artisan queue:work` zorunludur.
- `sync` sürücüsü production’da kullanılmamalı (istek süresi ve e-posta hata riski).

## 4. Zamanlayıcı (Laravel 13)

`app/Console/Kernel.php` yok; zamanlama `routes/console.php` içinde:

- Günlük `marketplaces:crawl` (bubilet_sehir_sec, bubilet), `withoutOverlapping`, `Europe/Istanbul`.
- Haftalık `queue:prune-failed`.

Sunucuda cron:

`* * * * * cd /path/to/current && php artisan schedule:run >> /dev/null 2>&1`

## 5. Güvenlik

- **JSON uçları:** `EnsureJsonApiNotCrossSite` — production’da `Sec-Fetch-Site: cross-site` ise 403 (basit hotlink/scraper azaltma).
- **Throttle:** `search.quick`, `api.reverse-geocode`, `events.nearby`, `/api/locations/*` için isimlendirilmiş limitler (`AppServiceProvider`).
- **Proxy:** `TRUSTED_PROXIES` tanımlıysa Forge/load balancer arkasında doğru şema için `trustProxies` etkinleşir.
- **TipTap / HTML:** `SafeRichContent` + DOMPurify kullanımı korunmalı; sunucuya kaydedilen HTML için ek sunucu tarafı temizlik ileride düşünülebilir.
- **Admin / sanatçı:** `EnsureUserIsAdmin`, `EnsureUserIsArtist`, `EnsureUserHasGoldSubscription` ile rotalar korunuyor; ek senaryo testleri `tests/Feature/Security/PanelAccessTest.php` içinde.

## 6. Depolama ve yükleme

- `config/filesystems.php` içinde S3 diski `visibility` ve notlarla güncellendi; canlıda `FILESYSTEM_DISK=s3` + `AWS_*`.
- Nginx/PHP: `client_max_body_size` ve `upload_max_filesize` / `post_max_size` medya yüklemeleri için yükseltilmeli (ör. 20M+).

## 7. Frontend (Vite)

- Production `sourcemap: false`, `manualChunks` (react-vendor, inertia, tiptap).
- TipTap ayrı chunk; ilk yükleme sayfalarında gecikme için ileride ağır admin sayfalarında kod bölme düşünülebilir.

## 8. Log ve hatalar

- Production’da `LOG_CHANNEL=daily`, `LOG_LEVEL=error` önerilir.
- Kritik hatalar için `LOG_SLACK_WEBHOOK_URL` veya Sentry (`composer require sentry/sentry-laravel` + `config/logging.php` entegrasyonu) eklenebilir.

## 9. Veritabanı — indeks ve soft delete

- Slug ve FK’ler mevcut migrasyonlarda çoğunlukla tanımlı; ek olarak `events_status_start_date_index` eklendi.
- **Soft delete:** `venues`, `events`, `blog_posts` gibi silinen kayıtların geri alınması gerekiyorsa ileride `SoftDeletes` eklenebilir; şu an zorunlu değil.

## 10. Test senaryoları (mevcut + öneri)

| Akış | Durum |
|------|--------|
| Kayıt / giriş / şifre | Mevcut Breeze testleri |
| Ana sayfa | `ExampleTest` + `RefreshDatabase` |
| İletişim + kuyruklu mail | `ContactFormMailTest` |
| Admin / sanatçı paneli erişimi | `PanelAccessTest` |
| Rezervasyon, yorum, Gold ödeme | İleride factory’lerle Feature test önerilir |

## 11. Deploy (Forge)

Örnek script: `scripts/forge-deploy.sh` — `composer install --no-dev`, **`rm -rf node_modules`** sonra `npm ci`, **`NODE_OPTIONS=--max-old-space-size=4096`** ve **`npm run build:deploy`** (yalnızca `vite build`; `tsc` sunucuda atlanır — push öncesi yerelde `npm run build` çalıştırın). Forge **10 dk deploy timeout**: küçük droplet’te takılıyorsa RAM artırın veya sunucuda [swap](https://forge.laravel.com/docs/servers/php#memory) açın.

## 12. Kritik riskler (öncelik)

1. **Queue worker yoksa** iletişim e-postaları birikir veya (sync kullanılırsa) zaman aşımı riski oluşur.
2. **Cron yoksa** marketplace crawl ve prune çalışmaz.
3. **`TRUSTED_PROXIES` yanlışsa** HTTPS yönlendirme / URL üretimi hatalı olabilir.
4. **Nominatim / harici API** — aşırı istek politikası; throttle ve `NOMINATIM_USER_AGENT` zorunlu.
5. **APP_DEBUG=true** production’da bilgi sızıntısı yaratır.

## 13. Performans darboğazları

- Büyük `inertia` ve `tiptap` chunk’ları; CDN ve HTTP/2 ile kısmen giderilir.
- Yoğun etkinlik listelerinde MySQL `EXPLAIN` ile ek indeks gereksinimi izlenmeli.
- `SehirSec` ve crawler işleri uzun sürebilir; schedule’da `withoutOverlapping` kullanıldı.
