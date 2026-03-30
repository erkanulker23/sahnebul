<?php

namespace App\Services;

use App\Models\Event;
use App\Services\Instagram\InstagramPromoVideoPipeline;
use App\Support\FfmpegBinaryResolver;
use App\Support\InstagramNetscapeCookies;
use App\Support\InstagramPromoResolveCache;
use App\Support\InstagramYtdlpCookiesPath;
use App\Support\YtDlpBinaryResolver;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Client\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Process\Process;

/**
 * Paylaşım / sayfa URL’sinden og:image ve (mümkünse) og:video indirir.
 * Instagram: önce HTTP/HTML + embed + Cobalt + yt-dlp; aday mp4 listesi kısa süreli cache (Redis uyumlu);
 * isteğe bağlı Puppeteer ile tamamlayıcı HTML (INSTAGRAM_PUPPETEER_ENABLED).
 * Instagram: /p/ ve /reel/ embed sayfaları; /stories/{kullanıcı}/{id}/ hikâye bağlantıları (yt-dlp ile doğrudan URL);
 * og:video:secure_url, JSON video_url / playback_url ve CDN .mp4 taraması.
 * Gönderi shortcode’unda og:video çıkmazsa, Firefox benzeri UA ile /p/ ve /reel/ sayfasına ek istek (ücretsiz araçlarda yaygın yöntem).
 * Instagram için /p/{shortcode}/media/?size=l ile önizleme görseli alınır (og:image olmasa da).
 * Tanıtım modunda birden fazla öğe promo_gallery JSON alanında tutulur.
 */
final class EventMediaImportFromUrlService
{
    private const MAX_HTML_BYTES = 2_000_000;

    private const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

    private const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

    private const FETCH_TIMEOUT = 45;

    private const VIDEO_TIMEOUT = 180;

    private const MAX_PROMO_GALLERY_ITEMS = 12;

    public function __construct(
        private readonly InstagramPuppeteerHtmlClient $instagramPuppeteerHtmlClient,
        private readonly InstagramPromoVideoPipeline $instagramPromoVideoPipeline,
    ) {}

    /**
     * Tanıtım video yüklemesi: MIME sunucuya göre değişir; uzantı + kısa imza ile doğrula.
     *
     * @return non-empty-string|null public diske yazılacak uzantı: mp4, webm veya mov
     */
    private function promoUploadVideoStorageExt(UploadedFile $video): ?string
    {
        $mime = strtolower($video->getMimeType() ?: '');
        $byMime = [
            'video/mp4' => 'mp4',
            'video/webm' => 'webm',
            'video/quicktime' => 'mov',
            'video/x-msvideo' => 'mp4',
            'video/x-matroska' => 'webm',
            'video/3gpp' => 'mp4',
        ];
        if (isset($byMime[$mime])) {
            return $byMime[$mime];
        }

        $ext = strtolower($video->getClientOriginalExtension());
        if (in_array($ext, ['mp4', 'm4v', 'webm', 'mov'], true)) {
            if ($mime === 'application/octet-stream' || $mime === '' || str_starts_with($mime, 'video/')) {
                return match ($ext) {
                    'webm' => 'webm',
                    'mov', 'm4v' => 'mov',
                    default => 'mp4',
                };
            }
        }

        if ($mime === 'application/octet-stream') {
            $path = $video->getRealPath();
            if (is_string($path) && is_readable($path)) {
                $head = @file_get_contents($path, false, null, 0, 16);
                if (is_string($head) && str_contains($head, 'ftyp')) {
                    return 'mp4';
                }
                if (is_string($head) && str_starts_with($head, "\x1a\x45\xdf\xa3")) {
                    return 'webm';
                }
            }
        }

        return null;
    }

    private const MAX_BATCH_URLS = 20;

    /**
     * @param  list<string>  $urls
     * @param  bool  $promoPosterEmbedOnly  true: yalnız önizleme + embed (Instagram’da yt-dlp yok); tam video «Tanıtım videoları» alanından
     * @param  'post'|'video'|null  $promoGallerySlot  Hangi panel kutusundan: video = Tanıtım videoları (MP4 yoksa bile aynı bölümde embed).
     */
    public function importMany(
        Model $model,
        array $urls,
        string $mode,
        bool $appendPromoGallery,
        bool $promoPosterEmbedOnly = false,
        ?string $promoGallerySlot = null,
    ): array {
        $urls = array_values(array_unique(array_filter(array_map('trim', $urls), fn (string $u) => $u !== '')));
        if ($urls === []) {
            return ['success' => false, 'message' => 'Geçerli bağlantı satırı yok.'];
        }
        if (count($urls) > self::MAX_BATCH_URLS) {
            return ['success' => false, 'message' => 'En fazla '.self::MAX_BATCH_URLS.' bağlantı işlenebilir.'];
        }
        if ($mode !== 'promo_video' && count($urls) > 1) {
            return ['success' => false, 'message' => 'Çoklu satır yalnızca «Tanıtım videosu» modunda kullanılabilir.'];
        }

        if ($mode === 'promo_video' && ! $appendPromoGallery) {
            $this->purgePromoGallery($model);
            $model->refresh();
        }

        if ($mode === 'promo_video') {
            $tl = (int) config('sahnebul.promo_url_import_time_limit', 900);
            if ($tl > 0) {
                @set_time_limit($tl);
            }
        }

        $ok = 0;
        /** @var list<string> $failures */
        $failures = [];
        foreach ($urls as $idx => $u) {
            if ($idx > 0 && $mode === 'promo_video') {
                $delay = (int) config('services.instagram.batch_delay_seconds', 0);
                $prev = $urls[$idx - 1];
                if ($delay > 0 && ($this->isInstagramHost($u) || $this->isInstagramHost($prev))) {
                    sleep($delay);
                }
            }
            $r = $this->import($model->fresh(), $u, $mode, true, $promoPosterEmbedOnly, $promoGallerySlot);
            if ($r['success']) {
                $ok++;
            } else {
                $failures[] = Str::limit($u, 64).' — '.$r['message'];
            }
        }

        $total = count($urls);
        $msg = "{$ok}/{$total} bağlantı işlendi.";
        if ($failures !== []) {
            $msg .= ' '.implode(' | ', array_slice($failures, 0, 6));
            if (count($failures) > 6) {
                $msg .= ' …';
            }
        }

        return [
            'success' => $ok > 0,
            'message' => $msg,
            'details' => ['ok' => $ok, 'total' => $total, 'failures' => $failures],
        ];
    }

    /**
     * @return array{success: bool, message: string}
     */
    public function removePromoGalleryItemAtIndex(Model $model, int $index): array
    {
        $raw = $model->promo_gallery;
        $gallery = is_array($raw) ? array_values($raw) : [];
        if ($gallery === []) {
            $hasLegacy = trim((string) ($model->promo_video_path ?? '')) !== ''
                || trim((string) ($model->promo_embed_url ?? '')) !== '';
            if ($index === 0 && $hasLegacy) {
                $this->deleteStoredPathIfOwned($model->promo_video_path);
                $model->forceFill([
                    'promo_gallery' => null,
                    'promo_video_path' => null,
                    'promo_embed_url' => null,
                ])->save();

                return ['success' => true, 'message' => 'Tanıtım öğesi kaldırıldı.'];
            }

            return ['success' => false, 'message' => 'Tanıtım galerisi boş.'];
        }
        if ($index < 0 || $index >= count($gallery)) {
            return ['success' => false, 'message' => 'Öğe bulunamadı. Sayfayı yenileyip tekrar deneyin.'];
        }
        $removed = $gallery[$index];
        if (is_array($removed)) {
            $safe = $this->sanitizePromoGallery([$removed])[0] ?? null;
            if (is_array($safe)) {
                $this->deleteGalleryItemFiles($safe);
            }
        }
        array_splice($gallery, $index, 1);
        $clean = $this->sanitizePromoGallery($gallery);
        $model->promo_gallery = $clean === [] ? null : $clean;
        $this->syncLegacyPromoFieldsFromGallery($model, $clean);
        $model->save();

        return ['success' => true, 'message' => 'Tanıtım öğesi kaldırıldı.'];
    }

    public function purgePromoGallery(Model $model): void
    {
        $gallery = is_array($model->promo_gallery) ? $model->promo_gallery : [];
        foreach ($gallery as $item) {
            if (! is_array($item)) {
                continue;
            }
            $this->deleteStoredPathIfOwned($item['video_path'] ?? null);
            $this->deleteStoredPathIfOwned($item['poster_path'] ?? null);
        }
        $this->deleteStoredPathIfOwned($model->promo_video_path);
        $model->forceFill([
            'promo_video_path' => null,
            'promo_embed_url' => null,
            'promo_gallery' => null,
        ])->save();
    }

    /**
     * @return array{success: bool, message: string, details?: array<string, mixed>}
     */
    public function appendPromoFromUploads(Model $model, ?UploadedFile $video, ?UploadedFile $poster, bool $append): array
    {
        if (($video === null || ! $video->isValid()) && ($poster === null || ! $poster->isValid())) {
            return ['success' => false, 'message' => 'Video veya görsel dosyası seçin.'];
        }

        if (! $append) {
            $this->purgePromoGallery($model);
            $model->refresh();
        }

        $videoPath = null;
        $posterPath = null;

        if ($video !== null && $video->isValid()) {
            if ($video->getSize() > self::MAX_VIDEO_BYTES) {
                return ['success' => false, 'message' => 'Video dosyası çok büyük (en fazla '.(int) (self::MAX_VIDEO_BYTES / 1024 / 1024).' MB).'];
            }
            $ext = $this->promoUploadVideoStorageExt($video);
            if ($ext === null) {
                return ['success' => false, 'message' => 'Video: yalnızca MP4, M4V, WebM veya MOV kabul edilir (MIME tanınmadıysa uzantıyı kontrol edin).'];
            }
            $videoPath = $video->storeAs('event-promo', Str::uuid()->toString().'.'.$ext, 'public');
        }

        if ($poster !== null && $poster->isValid()) {
            if ($poster->getSize() > self::MAX_IMAGE_BYTES) {
                if ($videoPath !== null) {
                    Storage::disk('public')->delete($videoPath);
                }

                return ['success' => false, 'message' => 'Görsel dosyası çok büyük.'];
            }
            $posterPath = $poster->store('event-promo-posters', 'public');
        }

        $gallery = $this->currentPromoGallery($model);
        if (count($gallery) >= self::MAX_PROMO_GALLERY_ITEMS) {
            if ($videoPath !== null) {
                Storage::disk('public')->delete($videoPath);
            }
            if ($posterPath !== null) {
                Storage::disk('public')->delete($posterPath);
            }

            return [
                'success' => false,
                'message' => 'En fazla '.self::MAX_PROMO_GALLERY_ITEMS.' tanıtım öğesi eklenebilir.',
            ];
        }

        $gallery[] = [
            'embed_url' => null,
            'video_path' => $videoPath,
            'poster_path' => $posterPath,
            'promo_kind' => $videoPath !== null ? 'story' : 'post',
        ];
        $this->syncLegacyPromoFieldsFromGallery($model, $gallery);
        $model->promo_gallery = $gallery;
        $model->save();

        $parts = [];
        if ($videoPath !== null) {
            $parts[] = 'Video yüklendi.';
        }
        if ($posterPath !== null) {
            $parts[] = 'Tanıtım görseli yüklendi.';
        }

        return [
            'success' => true,
            'message' => implode(' ', $parts),
            'details' => ['gallery_count' => count($gallery)],
        ];
    }

    /**
     * Tanıtım galerisine yalnızca gönderi görselleri ekler (video yok). Öncesinde gerekirse denetleyici purge çağırır.
     *
     * @param  list<UploadedFile>  $images
     * @return array{success: bool, message: string, details?: array<string, mixed>}
     */
    public function appendPromoPostImagesFromUploads(Model $model, array $images): array
    {
        $files = [];
        foreach ($images as $f) {
            if ($f instanceof UploadedFile && $f->isValid()) {
                $files[] = $f;
            }
        }
        if ($files === []) {
            return ['success' => false, 'message' => 'En az bir geçerli görsel dosyası seçin.'];
        }

        $gallery = $this->currentPromoGallery($model);
        $remaining = self::MAX_PROMO_GALLERY_ITEMS - count($gallery);
        if ($remaining <= 0) {
            return [
                'success' => false,
                'message' => 'En fazla '.self::MAX_PROMO_GALLERY_ITEMS.' tanıtım öğesi eklenebilir.',
            ];
        }

        $added = 0;
        $skipped = 0;
        foreach (array_slice($files, 0, $remaining) as $poster) {
            if ($poster->getSize() > self::MAX_IMAGE_BYTES) {
                $skipped++;

                continue;
            }
            $posterPath = $poster->store('event-promo-posters', 'public');
            $gallery[] = [
                'embed_url' => null,
                'video_path' => null,
                'poster_path' => $posterPath,
                'promo_kind' => 'post',
            ];
            $added++;
        }

        if ($added === 0) {
            return [
                'success' => false,
                'message' => $skipped > 0
                    ? 'Görseller çok büyük veya galeri dolu (en fazla '.(int) (self::MAX_IMAGE_BYTES / 1024 / 1024).' MB / dosya).'
                    : 'Görsel eklenemedi.',
            ];
        }

        $this->syncLegacyPromoFieldsFromGallery($model, $gallery);
        $model->promo_gallery = $gallery;
        $model->save();

        $msg = $added.' gönderi görseli galeriye eklendi.';
        if ($skipped > 0) {
            $msg .= ' '.$skipped.' dosya atlandı (boyut sınırı veya kota).';
        }
        if (count($files) > $remaining) {
            $msg .= ' Galeri kotası nedeniyle yalnızca ilk '.$remaining.' dosya işlendi.';
        }

        return [
            'success' => true,
            'message' => $msg,
            'details' => ['gallery_count' => count($gallery), 'added' => $added],
        ];
    }

    /**
     * Tanıtım galerisine ardışık video dosyaları ekler (her biri ayrı Reels / hikâye öğesi).
     *
     * @param  list<UploadedFile>  $videos
     * @return array{success: bool, message: string, details?: array<string, mixed>}
     */
    public function appendPromoVideosFromUploads(Model $model, array $videos): array
    {
        $files = [];
        foreach ($videos as $f) {
            if ($f instanceof UploadedFile && $f->isValid()) {
                $files[] = $f;
            }
        }
        if ($files === []) {
            return ['success' => false, 'message' => 'En az bir geçerli video dosyası seçin.'];
        }

        $gallery = $this->currentPromoGallery($model);
        $remaining = self::MAX_PROMO_GALLERY_ITEMS - count($gallery);
        if ($remaining <= 0) {
            return [
                'success' => false,
                'message' => 'En fazla '.self::MAX_PROMO_GALLERY_ITEMS.' tanıtım öğesi eklenebilir.',
            ];
        }

        $added = 0;
        $skipped = 0;
        foreach (array_slice($files, 0, $remaining) as $video) {
            if ($video->getSize() > self::MAX_VIDEO_BYTES) {
                $skipped++;

                continue;
            }
            $ext = $this->promoUploadVideoStorageExt($video);
            if ($ext === null) {
                $skipped++;

                continue;
            }
            $videoPath = $video->storeAs('event-promo', Str::uuid()->toString().'.'.$ext, 'public');
            $gallery[] = [
                'embed_url' => null,
                'video_path' => $videoPath,
                'poster_path' => null,
                'promo_kind' => 'story',
            ];
            $added++;
        }

        if ($added === 0) {
            return [
                'success' => false,
                'message' => $skipped > 0
                    ? 'Videolar uygun formatta değil veya çok büyük (MP4/WebM/MOV, en fazla '.(int) (self::MAX_VIDEO_BYTES / 1024 / 1024).' MB).'
                    : 'Video eklenemedi.',
            ];
        }

        $this->syncLegacyPromoFieldsFromGallery($model, $gallery);
        $model->promo_gallery = $gallery;
        $model->save();

        $msg = $added.' tanıtım videosu galeriye eklendi.';
        if ($skipped > 0) {
            $msg .= ' '.$skipped.' dosya atlandı (format veya boyut).';
        }
        if (count($files) > $remaining) {
            $msg .= ' Galeri kotası nedeniyle yalnızca ilk '.$remaining.' dosya işlendi.';
        }

        return [
            'success' => true,
            'message' => $msg,
            'details' => ['gallery_count' => count($gallery), 'added' => $added],
        ];
    }

    /**
     * @param  bool  $promoPosterEmbedOnly  Gönderi görseli akışı: doğrudan .mp4/.webm ve sunucu videosu indirilmez
     */
    public function import(
        Model $model,
        string $url,
        string $mode,
        bool $appendPromoGallery = true,
        bool $promoPosterEmbedOnly = false,
        ?string $promoGallerySlot = null,
    ): array {
        try {
            $normalized = $this->assertSafeUrl($url);
        } catch (ValidationException $e) {
            $msg = $e->errors()['url'][0] ?? 'Geçersiz URL.';

            return ['success' => false, 'message' => $msg];
        }

        if ($mode === 'promo_video' && $promoPosterEmbedOnly) {
            $pathOnly = parse_url($normalized, PHP_URL_PATH);
            if (is_string($pathOnly) && preg_match('/\.(mp4|webm)$/i', $pathOnly)) {
                return [
                    'success' => false,
                    'message' => 'Doğrudan video dosyası bağlantıları yalnızca «Tanıtım videoları» bölümünden eklenir.',
                ];
            }
        }

        if ($mode === 'promo_video' && ! $promoPosterEmbedOnly) {
            $direct = $this->tryImportDirectVideoUrl($model, $normalized, $appendPromoGallery);
            if ($direct !== null) {
                return $direct;
            }
        }

        $pageHeaders = $this->isInstagramHost($normalized)
            ? $this->mergeOptionalInstagramCookies($this->browserHeaders())
            : $this->browserHeaders();
        $htmlResp = $this->httpGetAllowingInstagram429Retry($normalized, $pageHeaders);

        $storyCanonicalIfAny = $this->isInstagramHost($normalized)
            && $this->extractInstagramShortcode($normalized) === null
            ? $this->normalizeInstagramStoryCanonical($normalized)
            : null;

        if (! $htmlResp->successful()) {
            if ($mode === 'promo_video' && $storyCanonicalIfAny !== null) {
                Log::notice('Instagram hikâye: ilk HTML alınamadı; yt-dlp ile devam (YTDLP_COOKIES_FILE önerilir)', [
                    'status' => $htmlResp->status(),
                    'url' => Str::limit($normalized, 120),
                ]);
                $html = '';
            } else {
                return [
                    'success' => false,
                    'message' => $this->httpFetchFailureMessage($htmlResp->status(), $this->isInstagramHost($normalized)),
                ];
            }
        } else {
            $html = $htmlResp->body();
        }

        if (strlen($html) > self::MAX_HTML_BYTES) {
            return ['success' => false, 'message' => 'Sayfa çok büyük; işlenemedi.'];
        }

        $isInstagram = $this->isInstagramHost($normalized);
        $shortcode = $isInstagram ? $this->extractInstagramShortcode($normalized) : null;
        $instagramStoryCanonical = ($isInstagram && $shortcode === null)
            ? $this->normalizeInstagramStoryCanonical($normalized)
            : null;

        $ogImage = $this->firstMetaContent($html, 'og:image')
            ?? $this->firstMetaContent($html, 'twitter:image')
            ?? $this->firstMetaContent($html, 'twitter:image:src');

        $storySupplementalHtml = '';
        if ($instagramStoryCanonical !== null
            && ($ogImage === null || trim((string) $ogImage) === '')) {
            $altBody = $this->fetchInstagramHtmlBody(
                $normalized,
                $this->mergeOptionalInstagramCookies($this->browserHeadersInstagramMobile()),
            );
            if ($altBody !== null) {
                $storySupplementalHtml = $altBody;
                $ogImage = $this->firstMetaContent($altBody, 'og:image')
                    ?? $this->firstMetaContent($altBody, 'twitter:image')
                    ?? $this->firstMetaContent($altBody, 'twitter:image:src')
                    ?? $ogImage;
            }
        }

        $ogVideo = $this->firstMetaContent($html, 'og:video')
            ?? $this->firstMetaContent($html, 'og:video:url')
            ?? $this->firstMetaContent($html, 'og:video:secure_url');

        /** @var list<string> $promoVideoUrlCandidates */
        $promoVideoUrlCandidates = [];

        if ($isInstagram && $shortcode) {
            $embedHtmlP = $this->fetchInstagramEmbedHtml($shortcode, 'p');
            $embedHtmlReel = $this->fetchInstagramEmbedHtml($shortcode, 'reel');
            $embedForMeta = (is_string($embedHtmlP) && $embedHtmlP !== '')
                ? $embedHtmlP
                : ((is_string($embedHtmlReel) && $embedHtmlReel !== '') ? $embedHtmlReel : null);

            if ($embedForMeta !== null) {
                if ($ogImage === null || trim((string) $ogImage) === '') {
                    $ogImage = $this->firstMetaContent($embedForMeta, 'og:image')
                        ?? $this->firstMetaContent($embedForMeta, 'twitter:image')
                        ?? $this->firstMetaContent($embedForMeta, 'twitter:image:src')
                        ?? $this->firstInstagramJsonUrl($embedForMeta, 'display_url')
                        ?? $this->firstInstagramJsonUrl($embedForMeta, 'thumbnail_src');
                }
            }

            foreach (array_filter([$html, $embedHtmlP, $embedHtmlReel], fn ($b) => is_string($b) && $b !== '') as $chunk) {
                $this->appendInstagramVideoUrlCandidatesFromHtml($chunk, $promoVideoUrlCandidates);
            }
            if ($promoVideoUrlCandidates === [] && $shortcode !== null && $shortcode !== '') {
                $this->supplementInstagramShortcodeVideoCandidatesFromFirefoxStyleFetch($shortcode, $promoVideoUrlCandidates);
            }
            $promoVideoUrlCandidates = $this->dedupePreserveOrderStringList($promoVideoUrlCandidates);
        } elseif ($isInstagram && $instagramStoryCanonical !== null) {
            $this->appendInstagramVideoUrlCandidatesFromHtml($html, $promoVideoUrlCandidates);
            if ($storySupplementalHtml !== '') {
                $this->appendInstagramVideoUrlCandidatesFromHtml($storySupplementalHtml, $promoVideoUrlCandidates);
            }
            if ($ogVideo !== null && trim((string) $ogVideo) !== '') {
                $promoVideoUrlCandidates[] = trim((string) $ogVideo);
            }
            $promoVideoUrlCandidates = $this->dedupePreserveOrderStringList($promoVideoUrlCandidates);
        } else {
            if ($ogVideo !== null && trim((string) $ogVideo) !== '') {
                $promoVideoUrlCandidates[] = trim((string) $ogVideo);
            }
        }

        if ($mode === 'promo_video' && $isInstagram && ! $promoPosterEmbedOnly) {
            $cached = InstagramPromoResolveCache::getCandidates($normalized);
            if ($promoVideoUrlCandidates === [] && is_array($cached) && $cached !== []) {
                $promoVideoUrlCandidates = $cached;
            }

            if ($promoVideoUrlCandidates === [] && $this->instagramPuppeteerHtmlClient->isEnabled()) {
                $puppetHtml = $this->instagramPuppeteerHtmlClient->fetchRenderedHtml($normalized);
                if (is_string($puppetHtml) && $puppetHtml !== '') {
                    $this->appendInstagramVideoUrlCandidatesFromHtml($puppetHtml, $promoVideoUrlCandidates);
                    $promoVideoUrlCandidates = $this->dedupePreserveOrderStringList($promoVideoUrlCandidates);
                }
            }

            if ($promoVideoUrlCandidates !== []) {
                InstagramPromoResolveCache::putCandidates($normalized, $promoVideoUrlCandidates);
            }
        }

        if ($mode === 'image_cover' || $mode === 'image_listing') {
            if (! $model instanceof Event) {
                return [
                    'success' => false,
                    'message' => 'Kapak / liste görseli içe aktarma yalnızca etkinlik kayıtları için kullanılabilir.',
                ];
            }
            $imageUrl = null;
            if ($ogImage !== null && trim((string) $ogImage) !== '') {
                try {
                    $imageUrl = $this->assertSafeUrl($this->resolveUrl($normalized, trim((string) $ogImage)));
                } catch (ValidationException) {
                    $imageUrl = null;
                }
            }

            if ($imageUrl === null && $shortcode) {
                $path = $this->downloadInstagramStillToStorage($shortcode, $mode === 'image_cover' ? 'event-covers' : 'event-listings');
                if ($path === null) {
                    return [
                        'success' => false,
                        'message' => 'Görsel bulunamadı (sayfada önizleme etiketi yok ve Instagram önizleme uç noktası yanıt vermedi).',
                    ];
                }
                $field = $mode === 'image_cover' ? 'cover_image' : 'listing_image';
                $this->deleteStoredPathIfOwned($model->{$field} ?? null);
                $model->update([$field => $path]);

                return [
                    'success' => true,
                    'message' => $mode === 'image_cover' ? 'Kapak görseli kaydedildi.' : 'Liste / kart görseli kaydedildi.',
                    'details' => ['path' => $path, 'source' => 'instagram_media'],
                ];
            }

            if ($imageUrl === null) {
                return ['success' => false, 'message' => 'Sayfada og:image / Twitter görsel etiketi bulunamadı.'];
            }

            $path = $this->downloadImageToStorage($imageUrl, $mode === 'image_cover' ? 'event-covers' : 'event-listings');
            if ($path === null) {
                return ['success' => false, 'message' => 'Görsel indirilemedi veya geçerli bir resim dosyası değil.'];
            }
            $field = $mode === 'image_cover' ? 'cover_image' : 'listing_image';
            $this->deleteStoredPathIfOwned($model->{$field} ?? null);
            $model->update([$field => $path]);

            return [
                'success' => true,
                'message' => $mode === 'image_cover' ? 'Kapak görseli kaydedildi.' : 'Liste / kart görseli kaydedildi.',
                'details' => ['path' => $path],
            ];
        }

        if ($mode !== 'promo_video') {
            return ['success' => false, 'message' => 'Geçersiz mod.'];
        }

        $instagramStoryHtmlAggregate = ($instagramStoryCanonical !== null)
            ? $html.($storySupplementalHtml !== '' ? "\n".$storySupplementalHtml : '')
            : null;

        return $this->importPromoVideo(
            $model,
            $normalized,
            $ogImage !== null ? trim((string) $ogImage) : null,
            $promoPosterEmbedOnly ? [] : $promoVideoUrlCandidates,
            $isInstagram,
            $shortcode,
            $instagramStoryCanonical,
            $instagramStoryHtmlAggregate,
            $appendPromoGallery,
            $promoPosterEmbedOnly,
            $promoGallerySlot,
        );
    }

    /**
     * Doğrudan .mp4 / .webm HTTPS adresi (yol uzantılı) — HTML taraması olmadan indirir.
     *
     * @return array{success: bool, message: string, details?: array<string, mixed>}|null Başarı, hata veya «bu mod değil» için null
     */
    private function tryImportDirectVideoUrl(Model $model, string $url, bool $appendPromoGallery): ?array
    {
        $pathOnly = parse_url($url, PHP_URL_PATH);
        if (! is_string($pathOnly) || ! preg_match('/\.(mp4|webm)$/i', $pathOnly)) {
            return null;
        }

        $videoPath = $this->downloadVideoToStorage($url, null);
        if ($videoPath === null) {
            return [
                'success' => false,
                'message' => 'Video bağlantısından dosya indirilemedi veya format MP4/WebM değil / boyut sınırı aşıldı.',
            ];
        }

        if (! $appendPromoGallery) {
            $this->purgePromoGallery($model);
            $model->refresh();
        }

        $gallery = $this->currentPromoGallery($model);
        if (count($gallery) >= self::MAX_PROMO_GALLERY_ITEMS) {
            Storage::disk('public')->delete($videoPath);

            return [
                'success' => false,
                'message' => 'En fazla '.self::MAX_PROMO_GALLERY_ITEMS.' tanıtım öğesi eklenebilir.',
            ];
        }

        $gallery[] = [
            'embed_url' => null,
            'video_path' => $videoPath,
            'poster_path' => null,
            'promo_kind' => 'story',
        ];
        $this->syncLegacyPromoFieldsFromGallery($model, $gallery);
        $model->promo_gallery = $gallery;
        $model->save();

        return [
            'success' => true,
            'message' => 'Video doğrudan adresten indirilip sunucuya kaydedildi.',
            'details' => ['video_saved' => true, 'gallery_count' => count($gallery)],
        ];
    }

    /**
     * @param  list<string>  $videoUrlCandidates
     * @return array{success: bool, message: string, details?: array<string, mixed>}
     */
    private function importPromoVideo(
        Model $model,
        string $normalized,
        ?string $ogImage,
        array $videoUrlCandidates,
        bool $isInstagram,
        ?string $shortcode,
        ?string $instagramStoryCanonical,
        ?string $instagramStoryHtmlAggregate,
        bool $appendPromoGallery,
        bool $posterEmbedOnly = false,
        ?string $promoGallerySlot = null,
    ): array {
        $messages = [];
        $videoSaved = false;
        $videoPath = null;
        $ytdlpLastError = null;
        $referer = $isInstagram ? 'https://www.instagram.com/' : null;

        foreach ($videoUrlCandidates as $candidate) {
            $candidate = trim((string) $candidate);
            if ($candidate === '') {
                continue;
            }
            try {
                $videoUrl = $this->assertSafeUrl($this->resolveUrl($normalized, $candidate));
                $videoPath = $this->downloadVideoToStorage($videoUrl, $referer);
                if ($videoPath !== null) {
                    $videoSaved = true;
                    $messages[] = 'Tanıtım videosu sunucuya kaydedildi.';
                    break;
                }
            } catch (ValidationException) {
                // ignore invalid video URL
            }
        }

        if (! $posterEmbedOnly && ! $videoSaved && $isInstagram) {
            $pageForCobalt = $instagramStoryCanonical
                ?? (($shortcode !== null && $shortcode !== '') ? $normalized : null);

            if ($shortcode && $videoUrlCandidates !== []) {
                Log::warning('Instagram tanıtım: gömülü/HTML adaylarından MP4 inmedi (çoğu gönderide artık yalnızca yt-dlp ile mümkün)', [
                    'shortcode' => $shortcode,
                    'http_candidate_count' => count($videoUrlCandidates),
                ]);
            }
            if ($instagramStoryCanonical !== null && $videoUrlCandidates !== []) {
                Log::warning('Instagram tanıtım (hikâye): HTML adaylarından MP4 inmedi', [
                    'story_url' => Str::limit($instagramStoryCanonical, 120),
                    'http_candidate_count' => count($videoUrlCandidates),
                ]);
            }

            $pipelineOut = $this->instagramPromoVideoPipeline->download(
                $normalized,
                $shortcode,
                $instagramStoryCanonical,
                $pageForCobalt,
            );
            if ($pipelineOut->saved()) {
                $videoPath = $pipelineOut->publicStoragePath;
                $videoSaved = true;
                foreach ($pipelineOut->successMessages as $m) {
                    $messages[] = $m;
                }
            }
            $ytdlpLastError = $pipelineOut->ytdlpDiagnosticError;
        }

        $posterPath = null;
        if ($shortcode) {
            $posterPath = $this->downloadInstagramStillToStorage($shortcode, 'event-promo-posters');
            if ($posterPath !== null) {
                $messages[] = 'Instagram önizleme görseli indirildi (ızgara / liste için).';
            }
        }
        // /media/?size=l bazen 403; gönderi sayfası og:image veya embed küçük resmi yedekler.
        if ($posterPath === null && $shortcode !== null && $shortcode !== '' && $isInstagram) {
            if ($ogImage !== null && trim((string) $ogImage) !== '') {
                try {
                    $posterSrc = $this->assertSafeUrl($this->resolveUrl($normalized, trim((string) $ogImage)));
                    $posterPath = $this->downloadImageToStorage(
                        $posterSrc,
                        'event-promo-posters',
                        $this->instagramCdnImageReferer($posterSrc),
                    );
                    if ($posterPath !== null) {
                        $messages[] = 'Gönderi önizleme görseli (og:image) kaydedildi.';
                    }
                } catch (ValidationException) {
                    // skip
                }
            }
        }
        if ($posterPath === null && $shortcode !== null && $shortcode !== '' && $isInstagram) {
            foreach (['p', 'reel'] as $seg) {
                $eh = $this->fetchInstagramEmbedHtml($shortcode, $seg === 'reel' ? 'reel' : 'p');
                if (! is_string($eh) || $eh === '') {
                    continue;
                }
                $thumb = $this->firstMetaContent($eh, 'og:image')
                    ?? $this->firstInstagramJsonUrl($eh, 'thumbnail_url')
                    ?? $this->firstInstagramJsonUrl($eh, 'display_url');
                if ($thumb === null || trim($thumb) === '') {
                    continue;
                }
                try {
                    $safe = $this->assertSafeUrl($this->resolveUrl('https://www.instagram.com/', trim($thumb)));
                    $posterPath = $this->downloadImageToStorage(
                        $safe,
                        'event-promo-posters',
                        $this->instagramCdnImageReferer($safe),
                    );
                    if ($posterPath !== null) {
                        $messages[] = 'Gönderi önizleme görseli (embed) kaydedildi.';
                        break;
                    }
                } catch (ValidationException) {
                    // next
                }
            }
        }
        if ($posterPath === null && $instagramStoryCanonical !== null && $ogImage !== null && trim($ogImage) !== '') {
            try {
                $posterSrc = $this->assertSafeUrl($this->resolveUrl($normalized, trim($ogImage)));
                $posterPath = $this->downloadImageToStorage(
                    $posterSrc,
                    'event-promo-posters',
                    $this->instagramCdnImageReferer($posterSrc),
                );
                if ($posterPath !== null) {
                    $messages[] = 'Hikâye önizleme görseli kaydedildi (ızgara / liste için).';
                }
            } catch (ValidationException) {
                // skip
            }
        }
        if ($posterPath === null && $instagramStoryCanonical !== null
            && is_string($instagramStoryHtmlAggregate) && $instagramStoryHtmlAggregate !== '') {
            foreach ($this->instagramStoryPosterUrlCandidates($instagramStoryHtmlAggregate) as $candidate) {
                try {
                    $safe = $this->assertSafeUrl($this->resolveUrl($normalized, $candidate));
                    $posterPath = $this->downloadImageToStorage(
                        $safe,
                        'event-promo-posters',
                        $this->instagramCdnImageReferer($safe),
                    );
                    if ($posterPath !== null) {
                        $messages[] = 'Hikâye önizleme görseli sayfa verisinden alındı.';
                        break;
                    }
                } catch (ValidationException) {
                    // next candidate
                }
            }
        }

        // Hikâye sayfası og:image çoğu zaman Instagram logosu; video diske indiyse gerçek kareyi ffmpeg ile al.
        if ($instagramStoryCanonical !== null && $videoSaved && $videoPath !== null && ! $posterEmbedOnly) {
            $fromFrame = $this->extractPosterFrameFromStoredVideo($videoPath);
            if ($fromFrame !== null) {
                if ($posterPath !== null) {
                    $this->deleteStoredPathIfOwned($posterPath);
                }
                $posterPath = $fromFrame;
                $messages[] = 'Kapak görseli videodan alındı (hikâye önizlemesi yerine gerçek kare).';
            }
        }

        if ($posterEmbedOnly && $posterPath === null && ! $isInstagram && $ogImage !== null && trim($ogImage) !== '') {
            try {
                $imgUrl = $this->assertSafeUrl($this->resolveUrl($normalized, trim($ogImage)));
                $posterPath = $this->downloadImageToStorage($imgUrl, 'event-promo-posters');
                if ($posterPath !== null) {
                    $messages[] = 'Sayfa önizleme görseli kaydedildi.';
                }
            } catch (ValidationException) {
                // skip
            }
        }

        $canonicalEmbed = $instagramStoryCanonical
            ?? (($isInstagram && $shortcode) ? $this->instagramCanonicalPostUrl($shortcode) : null);

        if (! $posterEmbedOnly && ! $videoSaved && $isInstagram && ($shortcode || $instagramStoryCanonical !== null)) {
            $binary = YtDlpBinaryResolver::resolve();
            $storyNote = $instagramStoryCanonical !== null
                ? ' Hikâyeler süresi dolabilir. Profil herkese açık olsa bile Instagram, hikâye videosunu çoğu sunucu/oturumsuz istekte vermez; yt-dlp için tarayıcı çerezi (YTDLP_COOKIES_FILE) sıkça gereklidir.'
                : '';
            $hint = $binary !== null
                ? 'yt-dlp çalışmadı veya Instagram erişimi engellendi (güncel yt-dlp; sunucuda ffmpeg kurulu olmalı; gerekirse .env’de YTDLP_COOKIES_FILE).'.$storyNote
                : 'Sunucuda yt-dlp bulunamadı (Linux: apt install yt-dlp veya pipx install yt-dlp; macOS: brew install yt-dlp). PHP için PATH veya .env YTDLP_BINARY; videoyu birleştirmek için ffmpeg.'.$storyNote;
            $hint .= $this->instagramYtDlpUserHintFromStderr($ytdlpLastError);
            $hint .= $this->instagramCobaltEnvHint();
            $messages[] = 'Doğrudan video indirilemedi; '.$hint;
        } elseif (! $posterEmbedOnly && ! $videoSaved && ! $isInstagram) {
            $messages[] = 'Doğrudan indirilebilir video bulunamadı (og:video yok veya erişim engellendi).';
        }

        if ($model instanceof Event) {
            if ($ogImage !== null && $ogImage !== '' && ($model->listing_image === null || trim((string) $model->listing_image) === '')) {
                try {
                    $imageUrl = $this->assertSafeUrl($this->resolveUrl($normalized, $ogImage));
                    $path = $this->downloadImageToStorage($imageUrl, 'event-listings');
                    if ($path !== null) {
                        $this->deleteStoredPathIfOwned($model->listing_image);
                        $model->listing_image = $path;
                        $messages[] = 'Önizleme görseli liste görseli olarak kaydedildi.';
                    }
                } catch (ValidationException) {
                    // skip
                }
            } elseif (($model->listing_image === null || trim((string) $model->listing_image) === '') && $posterPath !== null) {
                $listingCopy = 'event-listings/'.Str::uuid().'.jpg';
                if (Storage::disk('public')->copy($posterPath, $listingCopy)) {
                    $this->deleteStoredPathIfOwned($model->listing_image);
                    $model->listing_image = $listingCopy;
                    $messages[] = 'Liste görseli Instagram önizlemesinden oluşturuldu.';
                }
            }
        }

        if (! $posterEmbedOnly && ! $videoSaved && $isInstagram && ($shortcode !== null || $instagramStoryCanonical !== null) && $canonicalEmbed !== null && trim((string) $canonicalEmbed) !== '') {
            $messages[] = 'Tam video sunucuya inmedi; yine de önizleme veya Instagram bağlantısı galeriye eklendi — etkinlik sayfasında «Gönderi görselleri»nde görünür (tıklayınca Instagram önizlemesi). Tam dikey video için Cobalt, yt-dlp+çerez veya MP4 yükleyin.';
        }

        if ($posterEmbedOnly) {
            $videoPath = null;
        }
        $hasStoredVideo = is_string($videoPath) && trim($videoPath) !== '';
        $slot = $promoGallerySlot === 'video' || $promoGallerySlot === 'post' ? $promoGallerySlot : null;
        if ($hasStoredVideo) {
            $resolvedKind = 'story';
        } elseif ($slot === 'video' && $isInstagram && (($shortcode !== null && $shortcode !== '') || $instagramStoryCanonical !== null)) {
            $resolvedKind = 'story';
        } elseif ($slot === 'post') {
            $resolvedKind = 'post';
        } else {
            $resolvedKind = ($posterEmbedOnly || ! $hasStoredVideo) ? 'post' : 'story';
        }
        $newItem = [
            'embed_url' => $canonicalEmbed,
            'video_path' => $videoPath,
            'poster_path' => $posterPath,
            'promo_kind' => $resolvedKind,
        ];

        if (! $videoSaved && ! $isInstagram && ! $posterEmbedOnly) {
            $model->save();

            return [
                'success' => true,
                'message' => implode(' ', $messages),
                'details' => ['video_saved' => false],
            ];
        }

        if ($posterEmbedOnly && ! $isInstagram && $posterPath === null && $canonicalEmbed === null) {
            $model->save();

            return [
                'success' => false,
                'message' => 'Gönderi görseli modu: sayfada kullanılabilir bir önizleme görseli (og:image) bulunamadı.',
            ];
        }

        if ($isInstagram && ! $shortcode && $instagramStoryCanonical === null) {
            $model->save();

            return [
                'success' => false,
                'message' => 'Bu Instagram adresi tanınmadı. Gönderi (/p/… veya /reel/…) veya hikâye (/stories/kullanıcı/sayısal-id/) bağlantısı kullanın.',
            ];
        }

        if (! $videoSaved && $isInstagram && ($shortcode || $instagramStoryCanonical !== null) && $posterPath === null
            && ($canonicalEmbed === null || trim((string) $canonicalEmbed) === '')) {
            $model->save();

            return [
                'success' => false,
                'message' => $posterEmbedOnly
                    ? 'Instagram önizleme görseli alınamadı. Bağlantıyı kontrol edin veya tam video için «Tanıtım videoları» alanını kullanın.'
                    : 'Instagram: video indirilemedi ve önizleme görseli de alınamadı. Bağlantıyı kontrol edin; sunucuda yt-dlp + ffmpeg kurulu mu bakın; veya MP4/WebM yükleyin. '.implode(' ', $messages),
            ];
        }

        if ($posterEmbedOnly && $posterPath !== null) {
            array_unshift($messages, 'Gönderi görseli olarak kaydedildi (video indirilmedi — tam video için «Tanıtım videoları» alanını kullanın).');
        }

        if (! $appendPromoGallery) {
            $this->purgePromoGallery($model);
            $model->refresh();
        }

        $gallery = $this->currentPromoGallery($model);

        if ($shortcode) {
            foreach ($gallery as $idx => $item) {
                $existing = $this->extractInstagramShortcode($item['embed_url'] ?? '');
                if ($existing === $shortcode) {
                    $this->deleteGalleryItemFiles($item);
                    unset($gallery[$idx]);
                    break;
                }
            }
            $gallery = array_values($gallery);
        } elseif ($instagramStoryCanonical !== null) {
            $storyId = $this->extractInstagramStoryMediaId($instagramStoryCanonical);
            if ($storyId !== null) {
                foreach ($gallery as $idx => $item) {
                    $existingId = $this->extractInstagramStoryMediaId((string) ($item['embed_url'] ?? ''));
                    if ($existingId === $storyId) {
                        $this->deleteGalleryItemFiles($item);
                        unset($gallery[$idx]);
                        break;
                    }
                }
                $gallery = array_values($gallery);
            }
        }

        if (count($gallery) >= self::MAX_PROMO_GALLERY_ITEMS) {
            return [
                'success' => false,
                'message' => 'En fazla '.self::MAX_PROMO_GALLERY_ITEMS.' tanıtım öğesi eklenebilir. Önce bazılarını kaldırın.',
            ];
        }

        $gallery[] = $newItem;
        $this->syncLegacyPromoFieldsFromGallery($model, $gallery);
        $model->promo_gallery = $gallery;
        $model->save();

        return [
            'success' => true,
            'message' => implode(' ', $messages),
            'details' => [
                'video_saved' => $videoSaved,
                'embed' => $newItem['embed_url'],
                'gallery_count' => count($gallery),
            ],
        ];
    }

    /** @return list<array{embed_url: ?string, video_path: ?string, poster_path: ?string, promo_kind?: string}> */
    private function currentPromoGallery(Model $model): array
    {
        $raw = $model->promo_gallery;
        $gallery = is_array($raw) ? array_values($raw) : [];
        if ($gallery !== []) {
            return $this->sanitizePromoGallery($gallery);
        }
        if (trim((string) ($model->promo_embed_url ?? '')) !== '' || trim((string) ($model->promo_video_path ?? '')) !== '') {
            return $this->sanitizePromoGallery([[
                'embed_url' => $model->promo_embed_url,
                'video_path' => $model->promo_video_path,
                'poster_path' => null,
            ]]);
        }

        return [];
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array{embed_url: ?string, video_path: ?string, poster_path: ?string, promo_kind?: string}>
     */
    private function sanitizePromoGallery(array $items): array
    {
        $out = [];
        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            $row = [
                'embed_url' => isset($item['embed_url']) && is_string($item['embed_url']) && trim($item['embed_url']) !== ''
                    ? trim($item['embed_url'])
                    : null,
                'video_path' => isset($item['video_path']) && is_string($item['video_path']) && trim($item['video_path']) !== ''
                    ? trim($item['video_path'])
                    : null,
                'poster_path' => isset($item['poster_path']) && is_string($item['poster_path']) && trim($item['poster_path']) !== ''
                    ? trim($item['poster_path'])
                    : null,
            ];
            if ($row['video_path'] !== null) {
                $row['promo_kind'] = 'story';
            } else {
                $pk = $item['promo_kind'] ?? null;
                $row['promo_kind'] = ($pk === 'story' || $pk === 'post') ? $pk : 'post';
            }
            $out[] = $row;
        }

        return $out;
    }

    /**
     * @param  list<array<string, mixed>>  $gallery
     */
    private function syncLegacyPromoFieldsFromGallery(Model $model, array $gallery): void
    {
        if ($gallery === []) {
            $model->promo_embed_url = null;
            $model->promo_video_path = null;

            return;
        }

        $pick = null;
        foreach ($gallery as $item) {
            if (! is_array($item)) {
                continue;
            }
            $kind = ($item['promo_kind'] ?? '') === 'post' ? 'post' : 'story';
            $vp = isset($item['video_path']) && is_string($item['video_path']) ? trim($item['video_path']) : '';
            if ($kind === 'story' && $vp !== '') {
                $pick = $item;
                break;
            }
        }
        if ($pick === null) {
            foreach ($gallery as $item) {
                if (! is_array($item)) {
                    continue;
                }
                $vp = isset($item['video_path']) && is_string($item['video_path']) ? trim($item['video_path']) : '';
                if ($vp !== '') {
                    $pick = $item;
                    break;
                }
            }
        }
        if ($pick === null) {
            $pick = $gallery[0];
        }
        if (! is_array($pick)) {
            $model->promo_embed_url = null;
            $model->promo_video_path = null;

            return;
        }
        $model->promo_embed_url = isset($pick['embed_url']) && is_string($pick['embed_url']) ? $pick['embed_url'] : null;
        $model->promo_video_path = isset($pick['video_path']) && is_string($pick['video_path']) ? $pick['video_path'] : null;
    }

    /** @param  array{embed_url: ?string, video_path: ?string, poster_path: ?string, promo_kind?: string}  $item */
    private function deleteGalleryItemFiles(array $item): void
    {
        $this->deleteStoredPathIfOwned($item['video_path'] ?? null);
        $this->deleteStoredPathIfOwned($item['poster_path'] ?? null);
    }

    private function isInstagramHost(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        return str_contains($host, 'instagram.com');
    }

    private function extractInstagramShortcode(string $url): ?string
    {
        $path = parse_url($url, PHP_URL_PATH);
        if (! is_string($path) || $path === '') {
            return null;
        }
        if (preg_match('#/share/(?:p|reel)/([A-Za-z0-9_-]+)#', $path, $m)) {
            return $m[1];
        }
        if (preg_match('#/(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)#', $path, $m)) {
            return $m[1];
        }

        return null;
    }

    /**
     * Hikâye URL’sini sorgu/parça olmadan saklamak ve eşleştirmek için normalize eder.
     */
    private function normalizeInstagramStoryCanonical(string $url): ?string
    {
        $path = parse_url($url, PHP_URL_PATH);
        if (! is_string($path) || $path === '') {
            return null;
        }
        if (! preg_match('#^/stories/[^/]+/(\d+)/?$#', $path)) {
            return null;
        }
        $path = rtrim($path, '/').'/';
        $scheme = parse_url($url, PHP_URL_SCHEME) ?: 'https';
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if ($host === '' || ! str_contains($host, 'instagram.com')) {
            return null;
        }

        return $scheme.'://'.$host.$path;
    }

    private function extractInstagramStoryMediaId(string $url): ?string
    {
        $path = parse_url($url, PHP_URL_PATH);
        if (! is_string($path)) {
            return null;
        }
        if (preg_match('#/stories/[^/]+/(\d+)/?$#', $path, $m)) {
            return $m[1];
        }

        return null;
    }

    private function instagramCanonicalPostUrl(string $shortcode): string
    {
        return 'https://www.instagram.com/p/'.rawurlencode($shortcode).'/';
    }

    /**
     * @param  'p'|'reel'  $pathSegment
     */
    private function fetchInstagramEmbedHtml(string $shortcode, string $pathSegment = 'p'): ?string
    {
        $segment = $pathSegment === 'reel' ? 'reel' : 'p';
        $url = 'https://www.instagram.com/'.$segment.'/'.rawurlencode($shortcode).'/embed/captioned/';
        $resp = $this->httpGetAllowingInstagram429Retry(
            $url,
            $this->mergeOptionalInstagramCookies($this->browserHeaders())
        );
        if (! $resp->successful()) {
            return null;
        }
        $body = $resp->body();
        if (strlen($body) > self::MAX_HTML_BYTES) {
            return null;
        }

        return $body;
    }

    /**
     * @param  list<string>  $candidates
     */
    private function appendInstagramVideoUrlCandidatesFromHtml(string $html, array &$candidates): void
    {
        foreach (['og:video', 'og:video:url', 'og:video:secure_url'] as $prop) {
            $v = $this->firstMetaContent($html, $prop);
            if ($v !== null && trim($v) !== '') {
                $candidates[] = trim($v);
            }
        }
        $tw = $this->firstMetaContent($html, 'twitter:player:stream');
        if ($tw !== null && trim($tw) !== '') {
            $candidates[] = trim($tw);
        }
        foreach (['video_url', 'playback_url'] as $key) {
            $v = $this->firstInstagramJsonUrl($html, $key);
            if ($v !== null && trim($v) !== '') {
                $candidates[] = trim($v);
            }
        }
        foreach ($this->extractInstagramCdnMp4UrlsFromHtml($html) as $u) {
            $candidates[] = $u;
        }
    }

    /**
     * @param  list<string>  $items
     * @return list<string>
     */
    private function dedupePreserveOrderStringList(array $items): array
    {
        $seen = [];
        $out = [];
        foreach ($items as $item) {
            $item = trim((string) $item);
            if ($item === '') {
                continue;
            }
            if (isset($seen[$item])) {
                continue;
            }
            $seen[$item] = true;
            $out[] = $item;
        }

        return $out;
    }

    /**
     * Gönderi / embed HTML içinde geçen Instagram veya Facebook CDN MP4 adresleri (sunucu tarafı indirme için aday).
     *
     * @return list<string>
     */
    private function extractInstagramCdnMp4UrlsFromHtml(string $html): array
    {
        $normalized = str_replace(['\\u0026', '\/', '\\/'], ['&', '/', '/'], $html);
        if (! preg_match_all(
            '#https://[a-zA-Z0-9.-]*(?:cdninstagram\.com|fbcdn\.net)/[^"\'\s<>]{1,6000}?\.mp4(?:\?[^"\'\s<>]*)?#i',
            $normalized,
            $matches,
        )) {
            return [];
        }
        $urls = [];
        foreach ($matches[0] as $raw) {
            $u = html_entity_decode(trim($raw), ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $u = preg_replace('/[),.;]+$/', '', $u) ?? $u;
            if (filter_var($u, FILTER_VALIDATE_URL) !== false && preg_match('#^https://#i', $u)) {
                $host = strtolower((string) parse_url($u, PHP_URL_HOST));
                if (str_ends_with($host, '.cdninstagram.com')
                    || $host === 'cdninstagram.com'
                    || str_ends_with($host, '.fbcdn.net')
                    || $host === 'fbcdn.net') {
                    $urls[$u] = true;
                }
            }
        }

        return array_keys($urls);
    }

    private function firstInstagramJsonUrl(string $html, string $key): ?string
    {
        $quotedKey = preg_quote($key, '/');
        if (! preg_match('/"'.$quotedKey.'"\s*:\s*"((?:\\\\.|[^"\\\\])*)"/s', $html, $m)) {
            return null;
        }
        $decoded = stripcslashes($m[1]);
        $decoded = str_replace(['\u0026', '\u003a'], ['&', ':'], $decoded);
        if (preg_match('#^https://#i', $decoded)) {
            try {
                return $this->assertSafeUrl($decoded);
            } catch (ValidationException) {
                return null;
            }
        }

        return null;
    }

    private function downloadInstagramStillToStorage(string $shortcode, string $folder): ?string
    {
        $mediaPageUrl = 'https://www.instagram.com/p/'.rawurlencode($shortcode).'/media/?size=l';
        $resp = $this->httpGetAllowingInstagram429Retry(
            $mediaPageUrl,
            $this->mergeOptionalInstagramCookies($this->browserHeaders())
        );

        if (! $resp->successful()) {
            return null;
        }
        $body = $resp->body();
        if (strlen($body) > self::MAX_IMAGE_BYTES || strlen($body) < 256) {
            return null;
        }
        $mime = $resp->header('Content-Type', '');
        if ($mime !== '' && ! str_starts_with(strtolower($mime), 'image/')) {
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $detected = $finfo->buffer($body);
            if ($detected === false || ! str_starts_with($detected, 'image/')) {
                return null;
            }
            $mime = $detected;
        }
        $ext = match (true) {
            str_contains($mime, 'png') => 'png',
            str_contains($mime, 'webp') => 'webp',
            str_contains($mime, 'gif') => 'gif',
            default => 'jpg',
        };
        $path = $folder.'/'.Str::uuid().'.'.$ext;
        Storage::disk('public')->put($path, $body);

        return $path;
    }

    /**
     * @throws ValidationException
     */
    private function assertSafeUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '') {
            throw ValidationException::withMessages(['url' => 'URL boş olamaz.']);
        }
        if (filter_var($url, FILTER_VALIDATE_URL) === false || ! preg_match('#^https://#i', $url)) {
            throw ValidationException::withMessages(['url' => 'Yalnızca https:// adresleri kabul edilir.']);
        }
        $host = parse_url($url, PHP_URL_HOST);
        if (! is_string($host) || $host === '') {
            throw ValidationException::withMessages(['url' => 'Geçersiz adres.']);
        }
        $host = strtolower($host);
        if ($host === 'localhost' || str_ends_with($host, '.localhost')) {
            throw ValidationException::withMessages(['url' => 'Bu adres türüne izin verilmez.']);
        }
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            throw ValidationException::withMessages(['url' => 'IP adresiyle doğrudan istek engellendi.']);
        }

        return $url;
    }

    /**
     * @return array<string, string>
     */
    private function mergeOptionalInstagramCookies(array $headers): array
    {
        $cookie = $this->resolveInstagramCookieHeaderForFetch();
        if ($cookie === null || $cookie === '') {
            return $headers;
        }
        $headers['Cookie'] = $cookie;

        return $headers;
    }

    /**
     * Önce INSTAGRAM_FETCH_COOKIES; boşsa YTDLP_COOKIES_FILE (Netscape) aynı oturumu PHP GET’e taşır — hikâyeler için kritik.
     */
    private function resolveInstagramCookieHeaderForFetch(): ?string
    {
        $raw = config('services.instagram.fetch_cookies');
        if (is_string($raw) && trim($raw) !== '') {
            return trim($raw);
        }
        $resolved = InstagramYtdlpCookiesPath::resolve();
        if ($resolved === null) {
            return null;
        }

        return InstagramNetscapeCookies::toCookieHeader($resolved);
    }

    /**
     * Instagram kaynaklı 429 için kısa gecikmeyle tek ek deneme.
     *
     * @param  array<string, string>  $headers
     */
    private function httpGetAllowingInstagram429Retry(string $url, array $headers): Response
    {
        $resp = Http::withHeaders($headers)
            ->timeout(self::FETCH_TIMEOUT)
            ->withOptions(['allow_redirects' => true])
            ->get($url);
        if ($this->isInstagramHost($url) && $resp->status() === 429) {
            sleep(3);
            $resp = Http::withHeaders($headers)
                ->timeout(self::FETCH_TIMEOUT)
                ->withOptions(['allow_redirects' => true])
                ->get($url);
        }

        return $resp;
    }

    private function httpFetchFailureMessage(int $status, bool $isInstagram): string
    {
        if ($status === 429 && $isInstagram) {
            return 'Instagram bu isteği geçici olarak reddetti (HTTP 429 — çok fazla istek veya veri merkezi engeli). '
                .'Bir süre sonra tekrar deneyin. Sunucuda yt-dlp + ffmpeg kurun; .env içinde YTDLP_COOKIES_FILE ve isteğe bağlı INSTAGRAM_FETCH_COOKIES (tarayıcıdan oturum çerezleri) tanımlayın. '
                .'En sorunsuz yöntem: videoyu cihazdan indirip MP4 olarak yüklemek veya doğrudan .mp4 bağlantısı kullanmak.';
        }

        return 'Sayfa alınamadı (HTTP '.$status.').';
    }

    /** @return array<string, string> */
    private function browserHeaders(): array
    {
        return [
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept' => 'text/html,application/xhtml+xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language' => 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        ];
    }

    /**
     * Basit Next tabanlı indiricilerde (ör. oktayyavuz/instagram-video-downloader) kullanılan
     * gönderi sayfası GET başlıkları — bazen og:video yalnız bu profilde döner.
     *
     * @return array<string, string>
     */
    private function browserHeadersInstagramPostPageFirefox(): array
    {
        return [
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0',
            'Accept' => '*/*',
            'Accept-Language' => 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer' => 'https://www.instagram.com/',
            'DNT' => '1',
            'Sec-Fetch-Dest' => 'document',
            'Sec-Fetch-Mode' => 'navigate',
            'Sec-Fetch-Site' => 'same-origin',
        ];
    }

    /**
     * @param  list<string>  $promoVideoUrlCandidates
     */
    private function supplementInstagramShortcodeVideoCandidatesFromFirefoxStyleFetch(string $shortcode, array &$promoVideoUrlCandidates): void
    {
        $headers = $this->mergeOptionalInstagramCookies($this->browserHeadersInstagramPostPageFirefox());
        foreach ([
            'https://www.instagram.com/p/'.rawurlencode($shortcode).'/',
            'https://www.instagram.com/reel/'.rawurlencode($shortcode).'/',
        ] as $postUrl) {
            $body = $this->fetchInstagramHtmlBody($postUrl, $headers);
            if ($body !== null && $body !== '') {
                $this->appendInstagramVideoUrlCandidatesFromHtml($body, $promoVideoUrlCandidates);
            }
            if ($promoVideoUrlCandidates !== []) {
                return;
            }
        }
    }

    /** @return array<string, string> */
    private function browserHeadersInstagramMobile(): array
    {
        return [
            'User-Agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
            'Accept' => 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
            'Accept-Language' => 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        ];
    }

    /**
     * Instagram sayfası (hikâye / gönderi) — alternatif UA ile ikinci deneme.
     */
    private function fetchInstagramHtmlBody(string $url, array $headers): ?string
    {
        $resp = $this->httpGetAllowingInstagram429Retry(
            $url,
            $this->mergeOptionalInstagramCookies($headers)
        );
        if (! $resp->successful()) {
            return null;
        }
        $body = $resp->body();
        if (strlen($body) > self::MAX_HTML_BYTES) {
            return null;
        }

        return $body;
    }

    private function instagramCdnImageReferer(string $imageUrl): ?string
    {
        $host = strtolower((string) parse_url($imageUrl, PHP_URL_HOST));
        if ($host === '' || ! str_contains($host, '.')) {
            return null;
        }
        if (str_ends_with($host, '.cdninstagram.com') || $host === 'cdninstagram.com'
            || str_ends_with($host, '.fbcdn.net') || $host === 'fbcdn.net'
            || str_ends_with($host, '.instagram.com')) {
            return 'https://www.instagram.com/';
        }

        return null;
    }

    /**
     * Hikâye sayfasında og:image bazen yok; gömülü JSON ve CDN adreslerinden poster adayı toplanır.
     *
     * @return list<string>
     */
    private function instagramStoryPosterUrlCandidates(string $html): array
    {
        $keys = ['display_url', 'thumbnail_src', 'thumbnail_url', 'display_src', 'preview_url'];
        $fromJson = $this->allInstagramJsonHttpsUrlsForKeys($html, $keys);
        $fromCdn = $this->extractInstagramCdnImageUrlsFromHtml($html);
        $merged = $this->dedupePreserveOrderStringList(array_merge($fromJson, $fromCdn));
        usort($merged, fn (string $a, string $b): int => strlen($b) <=> strlen($a));

        return $merged;
    }

    /**
     * @param  list<string>  $keys
     * @return list<string>
     */
    private function allInstagramJsonHttpsUrlsForKeys(string $html, array $keys): array
    {
        $out = [];
        foreach ($keys as $key) {
            $quotedKey = preg_quote($key, '/');
            if (! preg_match_all('/"'.$quotedKey.'"\s*:\s*"((?:\\\\.|[^"\\\\])*)"/s', $html, $matches, PREG_SET_ORDER)) {
                continue;
            }
            foreach ($matches as $m) {
                $decoded = stripcslashes($m[1]);
                $decoded = str_replace(['\u0026', '\u003a'], ['&', ':'], $decoded);
                if (! preg_match('#^https://#i', $decoded)) {
                    continue;
                }
                try {
                    $out[] = $this->assertSafeUrl($decoded);
                } catch (ValidationException) {
                    // skip
                }
            }
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    private function extractInstagramCdnImageUrlsFromHtml(string $html): array
    {
        $normalized = str_replace(['\\u0026', '\/', '\\/'], ['&', '/', '/'], $html);
        if (! preg_match_all(
            '#https://[a-zA-Z0-9.-]*(?:cdninstagram\.com|fbcdn\.net)/[^"\'\s<>]{1,6000}?\.(?:jpe?g|webp|png)(?:\?[^"\'\s<>]*)?#i',
            $normalized,
            $matches,
        )) {
            return [];
        }
        $urls = [];
        foreach ($matches[0] as $raw) {
            $u = html_entity_decode(trim($raw), ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $u = preg_replace('/[),.;]+$/', '', $u) ?? $u;
            if (filter_var($u, FILTER_VALIDATE_URL) !== false && preg_match('#^https://#i', $u)) {
                $host = strtolower((string) parse_url($u, PHP_URL_HOST));
                if (str_ends_with($host, '.cdninstagram.com')
                    || $host === 'cdninstagram.com'
                    || str_ends_with($host, '.fbcdn.net')
                    || $host === 'fbcdn.net') {
                    try {
                        $urls[] = $this->assertSafeUrl($u);
                    } catch (ValidationException) {
                        // skip
                    }
                }
            }
        }

        return $this->dedupePreserveOrderStringList($urls);
    }

    private function resolveUrl(string $base, string $relative): string
    {
        if (preg_match('#^https?://#i', $relative)) {
            return $relative;
        }

        return rtrim(Str::beforeLast($base, '?'), '/').'/'.ltrim($relative, '/');
    }

    private function firstMetaContent(string $html, string $property): ?string
    {
        $p = preg_quote($property, '/');
        if (preg_match('/<meta[^>]+property=["\']'.$p.'["\'][^>]+content=["\']([^"\']*)["\']/is', $html, $m)) {
            return html_entity_decode(trim($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
        if (preg_match('/<meta[^>]+content=["\']([^"\']*)["\'][^>]+property=["\']'.$p.'["\']/is', $html, $m)) {
            return html_entity_decode(trim($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
        if (preg_match('/<meta[^>]+name=["\']'.$p.'["\'][^>]+content=["\']([^"\']*)["\']/is', $html, $m)) {
            return html_entity_decode(trim($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
        if (preg_match('/<meta[^>]+content=["\']([^"\']*)["\'][^>]+name=["\']'.$p.'["\']/is', $html, $m)) {
            return html_entity_decode(trim($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        return null;
    }

    private function downloadImageToStorage(string $imageUrl, string $folder, ?string $referer = null): ?string
    {
        try {
            $this->assertSafeUrl($imageUrl);
        } catch (ValidationException) {
            return null;
        }

        $headers = [
            'User-Agent' => $this->browserHeaders()['User-Agent'],
            'Accept' => 'image/avif,image/webp,image/*,*/*;q=0.8',
        ];
        if ($referer !== null && $referer !== '') {
            $headers['Referer'] = $referer;
        }

        $resp = Http::withHeaders($headers)
            ->timeout(self::FETCH_TIMEOUT)
            ->get($imageUrl);

        if (! $resp->successful()) {
            return null;
        }
        $body = $resp->body();
        if (strlen($body) > self::MAX_IMAGE_BYTES) {
            return null;
        }
        $mime = $resp->header('Content-Type', '');
        if ($mime !== '' && ! str_starts_with(strtolower($mime), 'image/')) {
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $detected = $finfo->buffer($body);
            if ($detected === false || ! str_starts_with($detected, 'image/')) {
                return null;
            }
            $mime = $detected;
        }
        $ext = match (true) {
            str_contains($mime, 'png') => 'png',
            str_contains($mime, 'webp') => 'webp',
            str_contains($mime, 'gif') => 'gif',
            str_contains($mime, 'jpeg') || str_contains($mime, 'jpg') => 'jpg',
            default => 'jpg',
        };
        $path = $folder.'/'.Str::uuid().'.'.$ext;
        Storage::disk('public')->put($path, $body);

        return $path;
    }

    private function downloadVideoToStorage(string $videoUrl, ?string $referer = null): ?string
    {
        try {
            $this->assertSafeUrl($videoUrl);
        } catch (ValidationException) {
            return null;
        }

        $tmp = tempnam(sys_get_temp_dir(), 'sbn_promo_');
        if ($tmp === false) {
            return null;
        }

        try {
            $headerSets = [
                [
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept' => 'video/mp4,video/webm,*/*;q=0.5',
                ],
                [
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0',
                    'Accept' => '*/*',
                    'DNT' => '1',
                    'Origin' => 'https://www.instagram.com',
                ],
            ];

            foreach ($headerSets as $baseHeaders) {
                $headers = $baseHeaders;
                if ($referer !== null && $referer !== '') {
                    $headers['Referer'] = $referer;
                }

                $response = Http::withHeaders($headers)
                    ->timeout(self::VIDEO_TIMEOUT)
                    ->sink($tmp)
                    ->get($videoUrl);

                if (! $response->successful()) {
                    continue;
                }
                $size = filesize($tmp);
                if ($size === false || $size > self::MAX_VIDEO_BYTES || $size < 1024) {
                    continue;
                }
                $finfo = new \finfo(FILEINFO_MIME_TYPE);
                $mime = $finfo->file($tmp);
                if ($mime === 'application/octet-stream' || $mime === 'binary/octet-stream') {
                    $head = @file_get_contents($tmp, false, null, 0, 16);
                    if (is_string($head) && str_contains($head, 'ftyp')) {
                        $mime = 'video/mp4';
                    }
                }
                if ($mime === false || ! in_array($mime, ['video/mp4', 'video/webm'], true)) {
                    continue;
                }
                $ext = $mime === 'video/webm' ? 'webm' : 'mp4';
                $path = 'event-promo/'.Str::uuid().'.'.$ext;
                $stream = fopen($tmp, 'rb');
                if ($stream === false) {
                    continue;
                }
                try {
                    Storage::disk('public')->put($path, $stream);
                } finally {
                    if (is_resource($stream)) {
                        fclose($stream);
                    }
                }

                return $path;
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning('event promo video download failed', ['url' => $videoUrl, 'message' => $e->getMessage()]);

            return null;
        } finally {
            if (is_file($tmp)) {
                @unlink($tmp);
            }
        }
    }

    private function deleteStoredPathIfOwned(?string $path): void
    {
        if (! is_string($path) || trim($path) === '' || Str::startsWith($path, ['http://', 'https://'])) {
            return;
        }
        Storage::disk('public')->delete($path);
    }

    private function instagramYtDlpUserHintFromStderr(?string $stderr): string
    {
        if ($stderr === null || trim($stderr) === '') {
            return '';
        }
        $l = mb_strtolower($stderr);
        if (str_contains($l, 'log in') || str_contains($l, 'login') || str_contains($l, 'cookies') || str_contains($l, 'private')) {
            return ' Instagram çıktısı oturum/çerez istiyor olabilir (herkese açık hesaplarda bile hikâyeler genelde böyledir; bu «gizli profil» anlamına gelmez). Tarayıcıdan Netscape cookies.txt dışa aktarıp YTDLP_COOKIES_FILE ayarlayın; hikâyelerde neredeyse zorunludur.';
        }
        if (str_contains($l, '429') || str_contains($l, 'rate-limit') || str_contains($l, 'too many requests')) {
            return ' Çok istek veya IP engeli olabilir; bir süre sonra deneyin veya INSTAGRAM_FETCH_COOKIES / YTDLP_COOKIES_FILE kullanın.';
        }

        return '';
    }

    private function instagramCobaltEnvHint(): string
    {
        $url = trim((string) config('services.cobalt.api_url', ''));
        if ($url !== '') {
            return ' Cobalt API (COBALT_API_URL) tanımlı; yanıt alınamadıysa Cobalt günlüklerini ve Instagram servis durumunu kontrol edin.';
        }

        return ' Çerez kullanmadan denemek için kendi Cobalt örneğinizi çalıştırın (Docker: github.com/imputnet/cobalt) ve .env’de COBALT_API_URL ayarlayın; isteğe bağlı INSTAGRAM_TRY_COBALT_FIRST=true ile önce Cobalt denenir. Herkese açık api.cobalt.tools üçüncü parti otomasyon için önerilmez.';
    }

    /**
     * Sunucudaki tanıtım videosundan tek kare JPEG kapak (Instagram hikâye og:image logosu yerine).
     *
     * @param  string  $publicRelativePath  Storage disk public göreli yol (örn. event-promo/….mp4)
     */
    private function extractPosterFrameFromStoredVideo(string $publicRelativePath): ?string
    {
        $ffmpeg = FfmpegBinaryResolver::resolve();
        if ($ffmpeg === null) {
            return null;
        }
        $trimmed = trim($publicRelativePath);
        if ($trimmed === '' || str_starts_with($trimmed, 'http://') || str_starts_with($trimmed, 'https://')) {
            return null;
        }
        $full = Storage::disk('public')->path($trimmed);
        if (! is_file($full)) {
            return null;
        }
        $tmpOut = sys_get_temp_dir().DIRECTORY_SEPARATOR.'sbn_poster_'.Str::random(18).'.jpg';
        $timeout = min(90.0, (float) config('services.ffmpeg.timeout', 180));
        $cmd = [
            $ffmpeg,
            '-hide_banner',
            '-loglevel', 'error',
            '-y',
            '-ss', '0.5',
            '-i', $full,
            '-frames:v', '1',
            '-q:v', '3',
            $tmpOut,
        ];
        try {
            $process = new Process($cmd, null, null, null, $timeout);
            $process->run();
        } catch (\Throwable $e) {
            Log::notice('ffmpeg poster frame exception', ['message' => $e->getMessage()]);
            if (is_file($tmpOut)) {
                @unlink($tmpOut);
            }

            return null;
        }
        if (! $process->isSuccessful() || ! is_file($tmpOut)) {
            if (is_file($tmpOut)) {
                @unlink($tmpOut);
            }

            return null;
        }
        $size = filesize($tmpOut);
        if ($size === false || $size < 2048) {
            @unlink($tmpOut);

            return null;
        }
        $dest = 'event-promo-posters/'.Str::uuid()->toString().'.jpg';
        $stream = fopen($tmpOut, 'rb');
        if ($stream === false) {
            @unlink($tmpOut);

            return null;
        }
        try {
            Storage::disk('public')->put($dest, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
            @unlink($tmpOut);
        }

        return $dest;
    }
}
