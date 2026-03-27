<?php

namespace App\Services;

use App\Models\Event;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

/**
 * Paylaşım / sayfa URL’sinden og:image ve (mümkünse) og:video indirir.
 * Instagram: /p/ ve /reel/ embed sayfaları, og:video:secure_url, JSON video_url / playback_url ve CDN .mp4 taraması.
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

    private const MAX_BATCH_URLS = 20;

    /** @param  list<string>  $urls */
    public function importMany(Model $model, array $urls, string $mode, bool $appendPromoGallery): array
    {
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

        $ok = 0;
        /** @var list<string> $failures */
        $failures = [];
        foreach ($urls as $u) {
            $r = $this->import($model->fresh(), $u, $mode, true);
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
            $mime = $video->getMimeType() ?: '';
            if (! in_array($mime, ['video/mp4', 'video/webm', 'video/quicktime'], true)) {
                return ['success' => false, 'message' => 'Video: yalnızca MP4, WebM veya MOV kabul edilir.'];
            }
            $ext = match ($mime) {
                'video/webm' => 'webm',
                'video/quicktime' => 'mov',
                default => 'mp4',
            };
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

    /** @return array{success: bool, message: string, details?: array<string, mixed>} */
    public function import(Model $model, string $url, string $mode, bool $appendPromoGallery = true): array
    {
        try {
            $normalized = $this->assertSafeUrl($url);
        } catch (ValidationException $e) {
            $msg = $e->errors()['url'][0] ?? 'Geçersiz URL.';

            return ['success' => false, 'message' => $msg];
        }

        if ($mode === 'promo_video') {
            $direct = $this->tryImportDirectVideoUrl($model, $normalized, $appendPromoGallery);
            if ($direct !== null) {
                return $direct;
            }
        }

        $htmlResp = Http::withHeaders($this->browserHeaders())
            ->timeout(self::FETCH_TIMEOUT)
            ->withOptions(['allow_redirects' => true])
            ->get($normalized);

        if (! $htmlResp->successful()) {
            return [
                'success' => false,
                'message' => 'Sayfa alınamadı (HTTP '.$htmlResp->status().').',
            ];
        }

        $html = $htmlResp->body();
        if (strlen($html) > self::MAX_HTML_BYTES) {
            return ['success' => false, 'message' => 'Sayfa çok büyük; işlenemedi.'];
        }

        $isInstagram = $this->isInstagramHost($normalized);
        $shortcode = $isInstagram ? $this->extractInstagramShortcode($normalized) : null;

        $ogImage = $this->firstMetaContent($html, 'og:image')
            ?? $this->firstMetaContent($html, 'twitter:image')
            ?? $this->firstMetaContent($html, 'twitter:image:src');

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
            $promoVideoUrlCandidates = $this->dedupePreserveOrderStringList($promoVideoUrlCandidates);
        } else {
            if ($ogVideo !== null && trim((string) $ogVideo) !== '') {
                $promoVideoUrlCandidates[] = trim((string) $ogVideo);
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

        return $this->importPromoVideo(
            $model,
            $normalized,
            $ogImage !== null ? trim((string) $ogImage) : null,
            $promoVideoUrlCandidates,
            $isInstagram,
            $shortcode,
            $appendPromoGallery,
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
     * @return array{success: bool, message: string, details?: array<string, mixed>}
     */
    /**
     * @param  list<string>  $videoUrlCandidates
     */
    private function importPromoVideo(
        Model $model,
        string $normalized,
        ?string $ogImage,
        array $videoUrlCandidates,
        bool $isInstagram,
        ?string $shortcode,
        bool $appendPromoGallery
    ): array {
        $messages = [];
        $videoSaved = false;
        $videoPath = null;
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

        if (! $videoSaved && $isInstagram && $shortcode) {
            if ($videoUrlCandidates !== []) {
                Log::warning('Instagram tanıtım: gömülü/HTML adaylarından MP4 inmedi (çoğu gönderide artık yalnızca yt-dlp ile mümkün)', [
                    'shortcode' => $shortcode,
                    'http_candidate_count' => count($videoUrlCandidates),
                ]);
            }
            $ytPath = $this->tryDownloadInstagramVideoWithYtDlp($normalized, $shortcode);
            if ($ytPath !== null) {
                $videoPath = $ytPath;
                $videoSaved = true;
                $messages[] = 'Video yt-dlp ile indirilip sunucuya kaydedildi.';
            }
        }

        $posterPath = null;
        if ($shortcode) {
            $posterPath = $this->downloadInstagramStillToStorage($shortcode, 'event-promo-posters');
            if ($posterPath !== null) {
                $messages[] = 'Instagram önizleme görseli indirildi (ızgara / liste için).';
            }
        }

        $canonicalEmbed = ($isInstagram && $shortcode)
            ? $this->instagramCanonicalPostUrl($shortcode)
            : null;

        if (! $videoSaved && $isInstagram && $shortcode) {
            $binary = $this->resolveYtDlpBinary();
            $hint = $binary !== null
                ? 'yt-dlp çalışmadı veya Instagram erişimi engellendi (güncel yt-dlp; gerekirse .env’de YTDLP_COOKIES_FILE ile oturum çerezi).'
                : 'Sunucuda yt-dlp bulunamadı (Linux: apt install yt-dlp veya pipx install yt-dlp; macOS: brew install yt-dlp). PHP çalışan kullanıcı için kurun veya .env içinde YTDLP_BINARY=/tam/yol/yt-dlp.';
            $messages[] = 'Doğrudan video indirilemedi; '.$hint;
        } elseif (! $videoSaved && ! $isInstagram) {
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

        $hasStoredVideo = is_string($videoPath) && trim($videoPath) !== '';
        // Sunucuya inen MP4/WebM = hikaye; yalnızca afiş / gömülü bağlantı (video dosyası yok) = gönderi. İstekteki promo_kind güvenilmez (varsayılan story).
        $resolvedKind = $hasStoredVideo ? 'story' : 'post';
        $newItem = [
            'embed_url' => $canonicalEmbed,
            'video_path' => $videoPath,
            'poster_path' => $posterPath,
            'promo_kind' => $resolvedKind,
        ];

        if (! $videoSaved && ! $isInstagram) {
            $model->save();

            return [
                'success' => true,
                'message' => implode(' ', $messages),
                'details' => ['video_saved' => false],
            ];
        }

        if ($isInstagram && ! $shortcode) {
            $model->save();

            return [
                'success' => false,
                'message' => 'Instagram gönderi kodu URL’den okunamadı.',
            ];
        }

        if (! $videoSaved && $isInstagram && $shortcode && $posterPath === null) {
            $model->save();

            return [
                'success' => false,
                'message' => 'Instagram gönderisi: video indirilemedi ve önizleme görseli de alınamadı. Bağlantıyı kontrol edin; veya MP4/WebM dosyası yükleyin. '.implode(' ', $messages),
            ];
        }

        if (! $videoSaved && $isInstagram && $shortcode && $posterPath !== null) {
            array_unshift(
                $messages,
                'Tanıtım galerisine önizleme kaydedildi (video indirilemedi). Sitede oynatmak için panelden MP4/WebM yükleyin veya doğrudan video bağlantısı ekleyin.'
            );
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
            $row['promo_kind'] = $row['video_path'] !== null ? 'story' : 'post';
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
        if (preg_match('#/(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)#', $path, $m)) {
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
        $resp = Http::withHeaders($this->browserHeaders())
            ->timeout(self::FETCH_TIMEOUT)
            ->withOptions(['allow_redirects' => true])
            ->get($url);
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
        $resp = Http::withHeaders($this->browserHeaders())
            ->timeout(self::FETCH_TIMEOUT)
            ->withOptions(['allow_redirects' => true])
            ->get($mediaPageUrl);

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

    /** @return array<string, string> */
    private function browserHeaders(): array
    {
        return [
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept' => 'text/html,application/xhtml+xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language' => 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        ];
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

    private function downloadImageToStorage(string $imageUrl, string $folder): ?string
    {
        try {
            $this->assertSafeUrl($imageUrl);
        } catch (ValidationException) {
            return null;
        }

        $resp = Http::withHeaders([
            'User-Agent' => 'Mozilla/5.0 (compatible; SahnebulMediaBot/1.0)',
            'Accept' => 'image/avif,image/webp,image/*,*/*;q=0.8',
        ])
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
            $headers = [
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept' => 'video/mp4,video/webm,*/*;q=0.5',
            ];
            if ($referer !== null && $referer !== '') {
                $headers['Referer'] = $referer;
            }

            $response = Http::withHeaders($headers)
                ->timeout(self::VIDEO_TIMEOUT)
                ->sink($tmp)
                ->get($videoUrl);

            if (! $response->successful()) {
                return null;
            }
            $size = filesize($tmp);
            if ($size === false || $size > self::MAX_VIDEO_BYTES || $size < 1024) {
                return null;
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
                return null;
            }
            $ext = $mime === 'video/webm' ? 'webm' : 'mp4';
            $path = 'event-promo/'.Str::uuid().'.'.$ext;
            $stream = fopen($tmp, 'rb');
            if ($stream === false) {
                return null;
            }
            try {
                Storage::disk('public')->put($path, $stream);
            } finally {
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }

            return $path;
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

    /**
     * Önce YTDLP_BINARY, sonra dosya yolu adayları (PATH parçaları, ~/.local/bin, posix ev dizini, snap vb.).
     * PHP-FPM’de PATH kısıtlı veya boş olduğunda bile sistemde kurulu yt-dlp bulunabilsin diye.
     */
    private function resolveYtDlpBinary(): ?string
    {
        foreach ($this->ytDlpAbsolutePathCandidates() as $path) {
            if (is_file($path) && is_executable($path)) {
                return $path;
            }
        }

        $finder = new ExecutableFinder;
        $found = $finder->find('yt-dlp', null, $this->ytDlpSearchDirectories());

        return (is_string($found) && $found !== '' && is_executable($found)) ? $found : null;
    }

    /** @return list<string> */
    private function ytDlpSearchDirectories(): array
    {
        $dirs = [
            '/usr/local/bin',
            '/usr/bin',
            '/bin',
            '/opt/homebrew/bin',
            '/snap/bin',
            '/var/snap/bin',
        ];

        $home = getenv('HOME');
        if (is_string($home) && $home !== '') {
            $dirs[] = $home.DIRECTORY_SEPARATOR.'.local'.DIRECTORY_SEPARATOR.'bin';
        }

        if (function_exists('posix_geteuid') && function_exists('posix_getpwuid')) {
            $pw = @posix_getpwuid(posix_geteuid());
            if (is_array($pw) && isset($pw['dir']) && is_string($pw['dir']) && $pw['dir'] !== '') {
                $dirs[] = rtrim($pw['dir'], '/').DIRECTORY_SEPARATOR.'.local'.DIRECTORY_SEPARATOR.'bin';
            }
        }

        $pathEnv = getenv('PATH');
        if (is_string($pathEnv) && $pathEnv !== '') {
            foreach (explode(PATH_SEPARATOR, $pathEnv) as $segment) {
                $segment = trim($segment);
                if ($segment !== '') {
                    $dirs[] = $segment;
                }
            }
        }

        /** @var list<string> $unique */
        $unique = array_values(array_unique(array_filter($dirs, fn (string $d) => $d !== '')));

        return $unique;
    }

    /**
     * Tam yol adayları: yapılandırma + her arama dizininde yt-dlp (ve Windows’ta yt-dlp.exe).
     *
     * @return list<string>
     */
    private function ytDlpAbsolutePathCandidates(): array
    {
        $name = PHP_OS_FAMILY === 'Windows' ? 'yt-dlp.exe' : 'yt-dlp';
        $out = [];

        $configured = config('services.ytdlp.binary');
        if (is_string($configured) && trim($configured) !== '') {
            $out[] = trim($configured);
        }

        foreach ($this->ytDlpSearchDirectories() as $dir) {
            $out[] = rtrim($dir, '/\\').DIRECTORY_SEPARATOR.$name;
        }

        return array_values(array_unique($out));
    }

    /**
     * Kullanıcının verdiği adres + kanonik /p/ ve /reel/ (aynı kısakod) — biri başarısızsa diğerini dene.
     *
     * @return list<string>
     */
    private function instagramYtDlpSourceUrls(string $normalized, string $shortcode): array
    {
        $urls = [];
        $n = trim($normalized);
        if ($n !== '' && $this->isInstagramHost($n)) {
            $urls[] = $n;
        }
        $urls[] = 'https://www.instagram.com/p/'.rawurlencode($shortcode).'/';
        $urls[] = 'https://www.instagram.com/reel/'.rawurlencode($shortcode).'/';

        return $this->dedupePreserveOrderStringList($urls);
    }

    private function tryDownloadInstagramVideoWithYtDlp(string $normalized, string $shortcode): ?string
    {
        $binary = $this->resolveYtDlpBinary();
        if ($binary === null) {
            Log::warning('event promo: yt-dlp bulunamadı; Instagram videoları için kurun (brew install yt-dlp) veya .env YTDLP_BINARY=/opt/homebrew/bin/yt-dlp');

            return null;
        }

        foreach ($this->instagramYtDlpSourceUrls($normalized, $shortcode) as $sourceUrl) {
            $dest = $this->runYtDlpInstagramDownloadOnce($binary, $sourceUrl);
            if ($dest !== null) {
                Log::info('event promo: yt-dlp instagram video kaydedildi', [
                    'shortcode' => $shortcode,
                    'source_url' => Str::limit($sourceUrl, 120),
                ]);

                return $dest;
            }
        }

        Log::warning('event promo: yt-dlp tüm Instagram URL varyantlarında başarısız', [
            'shortcode' => $shortcode,
            'tried_urls' => array_map(fn (string $u) => Str::limit($u, 100), $this->instagramYtDlpSourceUrls($normalized, $shortcode)),
        ]);

        return null;
    }

    private function runYtDlpInstagramDownloadOnce(string $binary, string $httpsInstagramUrl): ?string
    {
        $timeout = (float) config('services.ytdlp.timeout', 300);
        $dir = sys_get_temp_dir();
        $base = 'sbn_ytdlp_'.Str::random(20);
        $outTemplate = $dir.DIRECTORY_SEPARATOR.$base.'.%(ext)s';
        $cmd = [
            $binary,
            '-o',
            $outTemplate,
            '--no-playlist',
            '--no-progress',
            '--no-warnings',
            // Önce DASH video + m4a ses (ses için gerekli). İlerlemeli «format 9» çoğu gönderide yalnızca video; ses kaybına yol açar.
            // Birleştirme: yt-dlp (ffmpeg varsa) veya finalizeInstagramYtDlpDownloadFiles içinde ffmpeg mux.
            '-f',
            'bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/best[ext=mp4]/best',
            '--merge-output-format',
            'mp4',
            $httpsInstagramUrl,
        ];
        $cookies = config('services.ytdlp.cookies_file');
        if (is_string($cookies) && $cookies !== '' && is_readable($cookies)) {
            array_splice($cmd, 1, 0, ['--cookies', $cookies]);
        }
        try {
            $process = new Process($cmd, $dir, null, null, $timeout);
            $process->run();
        } catch (\Throwable $e) {
            Log::notice('yt-dlp process exception', ['url' => Str::limit($httpsInstagramUrl, 80), 'message' => $e->getMessage()]);

            return null;
        }
        if (! $process->isSuccessful()) {
            Log::warning('yt-dlp instagram non-zero exit', [
                'url' => Str::limit($httpsInstagramUrl, 120),
                'output' => Str::limit($process->getErrorOutput().$process->getOutput(), 800),
            ]);

            return null;
        }
        $rawMatches = glob($dir.DIRECTORY_SEPARATOR.$base.'*', GLOB_NOSORT);
        if ($rawMatches === false || $rawMatches === []) {
            return null;
        }
        $tmpFile = $this->finalizeInstagramYtDlpDownloadFiles($rawMatches, $dir, $base);
        if ($tmpFile === null || ! is_file($tmpFile)) {
            foreach ($rawMatches as $p) {
                if (is_file($p)) {
                    @unlink($p);
                }
            }

            return null;
        }
        $size = filesize($tmpFile);
        if ($size === false || $size > self::MAX_VIDEO_BYTES || $size < 1024) {
            @unlink($tmpFile);

            return null;
        }
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($tmpFile);
        if ($mime === 'application/octet-stream' || $mime === 'binary/octet-stream') {
            $head = @file_get_contents($tmpFile, false, null, 0, 16);
            if (is_string($head) && str_contains($head, 'ftyp')) {
                $mime = 'video/mp4';
            }
        }
        if ($mime === false || ! in_array($mime, ['video/mp4', 'video/webm'], true)) {
            @unlink($tmpFile);

            return null;
        }
        $ext = $mime === 'video/webm' ? 'webm' : 'mp4';
        $dest = 'event-promo/'.Str::uuid()->toString().'.'.$ext;
        $stream = fopen($tmpFile, 'rb');
        if ($stream === false) {
            $this->unlinkInstagramYtDlpTempFiles($rawMatches, $tmpFile);

            return null;
        }
        try {
            Storage::disk('public')->put($dest, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
            $this->unlinkInstagramYtDlpTempFiles($rawMatches, $tmpFile);
        }

        return $dest;
    }

    /**
     * yt-dlp çıktısı: tek birleşik mp4 veya ayrı DASH video (.mp4) + ses (.m4a) — ses için ffmpeg mux.
     *
     * @param  list<string>  $paths
     */
    private function finalizeInstagramYtDlpDownloadFiles(array $paths, string $dir, string $base): ?string
    {
        $paths = array_values(array_filter($paths, fn (string $p) => is_file($p)));
        if ($paths === []) {
            return null;
        }

        $m4as = array_values(array_filter($paths, fn (string $p) => str_ends_with(strtolower($p), '.m4a')));
        $mp4s = array_values(array_filter($paths, fn (string $p) => str_ends_with(strtolower($p), '.mp4')));

        if ($m4as !== [] && $mp4s !== []) {
            usort($mp4s, fn (string $a, string $b): int => (@filesize($b) ?: 0) <=> (@filesize($a) ?: 0));
            usort($m4as, fn (string $a, string $b): int => (@filesize($b) ?: 0) <=> (@filesize($a) ?: 0));
            $videoPart = $mp4s[0];
            $audioPart = $m4as[0];
            $merged = $dir.DIRECTORY_SEPARATOR.$base.'_sbn_mux.mp4';
            if ($this->muxVideoAndAudioWithFfmpeg($videoPart, $audioPart, $merged)) {
                foreach ($paths as $p) {
                    if ($p !== $merged) {
                        @unlink($p);
                    }
                }

                return $merged;
            }
            Log::warning('event promo: Instagram DASH video + ses birleştirilemedi (ffmpeg kurulu mu? brew install ffmpeg veya FFMPEG_BINARY)', [
                'video_part' => basename($videoPart),
                'audio_part' => basename($audioPart),
            ]);
        }

        $candidates = array_values(array_filter($paths, fn (string $p) => preg_match('/\.(mp4|webm)$/i', $p) === 1));
        if ($candidates === []) {
            return null;
        }
        usort($candidates, fn (string $a, string $b): int => (@filesize($b) ?: 0) <=> (@filesize($a) ?: 0));

        return $candidates[0];
    }

    /**
     * @param  list<string>  $paths
     */
    private function unlinkInstagramYtDlpTempFiles(array $paths, string $primary): void
    {
        foreach ($paths as $p) {
            if (is_file($p)) {
                @unlink($p);
            }
        }
        if ($primary !== '' && is_file($primary) && ! in_array($primary, $paths, true)) {
            @unlink($primary);
        }
    }

    private function muxVideoAndAudioWithFfmpeg(string $videoPath, string $audioPath, string $outputPath): bool
    {
        $ffmpeg = $this->resolveFfmpegBinary();
        if ($ffmpeg === null) {
            return false;
        }
        $timeout = (float) config('services.ffmpeg.timeout', 180);
        if (is_file($outputPath)) {
            @unlink($outputPath);
        }
        $cmd = [
            $ffmpeg,
            '-hide_banner',
            '-loglevel', 'error',
            '-y',
            '-i', $videoPath,
            '-i', $audioPath,
            '-c', 'copy',
            '-shortest',
            '-movflags', '+faststart',
            $outputPath,
        ];
        try {
            $process = new Process($cmd, null, null, null, $timeout);
            $process->run();
        } catch (\Throwable $e) {
            Log::notice('ffmpeg mux exception', ['message' => $e->getMessage()]);
            if (is_file($outputPath)) {
                @unlink($outputPath);
            }

            return false;
        }
        if (! $process->isSuccessful() || ! is_file($outputPath)) {
            Log::warning('ffmpeg mux failed', [
                'output' => Str::limit($process->getErrorOutput().$process->getOutput(), 600),
            ]);
            if (is_file($outputPath)) {
                @unlink($outputPath);
            }

            return false;
        }

        return true;
    }

    private function resolveFfmpegBinary(): ?string
    {
        $configured = config('services.ffmpeg.binary');
        if (is_string($configured) && trim($configured) !== '' && is_executable(trim($configured))) {
            return trim($configured);
        }
        foreach (['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg'] as $path) {
            if (is_file($path) && is_executable($path)) {
                return $path;
            }
        }
        $finder = new ExecutableFinder;
        $found = $finder->find('ffmpeg', null, $this->ytDlpSearchDirectories());

        return (is_string($found) && $found !== '' && is_executable($found)) ? $found : null;
    }
}
