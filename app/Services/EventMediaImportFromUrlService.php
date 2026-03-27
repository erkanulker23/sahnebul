<?php

namespace App\Services;

use App\Models\Event;
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
    public function importMany(Event $event, array $urls, string $mode, bool $appendPromoGallery, string $promoKind = 'story'): array
    {
        $promoKind = $this->normalizePromoKind($promoKind);
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
            $this->purgePromoGallery($event);
            $event->refresh();
        }

        $ok = 0;
        /** @var list<string> $failures */
        $failures = [];
        foreach ($urls as $u) {
            $r = $this->import($event->fresh(), $u, $mode, true, $promoKind);
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

    public function purgePromoGallery(Event $event): void
    {
        $gallery = is_array($event->promo_gallery) ? $event->promo_gallery : [];
        foreach ($gallery as $item) {
            if (! is_array($item)) {
                continue;
            }
            $this->deleteStoredPathIfOwned($item['video_path'] ?? null);
            $this->deleteStoredPathIfOwned($item['poster_path'] ?? null);
        }
        $this->deleteStoredPathIfOwned($event->promo_video_path);
        $event->forceFill([
            'promo_video_path' => null,
            'promo_embed_url' => null,
            'promo_gallery' => null,
        ])->save();
    }

    /**
     * @return array{success: bool, message: string, details?: array<string, mixed>}
     */
    public function appendPromoFromUploads(Event $event, ?UploadedFile $video, ?UploadedFile $poster, bool $append, string $promoKind = 'story'): array
    {
        $promoKind = $this->normalizePromoKind($promoKind);
        if (($video === null || ! $video->isValid()) && ($poster === null || ! $poster->isValid())) {
            return ['success' => false, 'message' => 'Video veya görsel dosyası seçin.'];
        }

        if (! $append) {
            $this->purgePromoGallery($event);
            $event->refresh();
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

        $gallery = $this->currentPromoGallery($event);
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
            'promo_kind' => $promoKind,
        ];
        $this->syncLegacyPromoFieldsFromGallery($event, $gallery);
        $event->promo_gallery = $gallery;
        $event->save();

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
    public function import(Event $event, string $url, string $mode, bool $appendPromoGallery = true, string $promoKind = 'story'): array
    {
        $promoKind = $this->normalizePromoKind($promoKind);
        try {
            $normalized = $this->assertSafeUrl($url);
        } catch (ValidationException $e) {
            $msg = $e->errors()['url'][0] ?? 'Geçersiz URL.';

            return ['success' => false, 'message' => $msg];
        }

        if ($mode === 'promo_video') {
            $direct = $this->tryImportDirectVideoUrl($event, $normalized, $appendPromoGallery, $promoKind);
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
            ?? $this->firstMetaContent($html, 'og:video:url');

        if ($isInstagram && $shortcode) {
            $embedHtml = $this->fetchInstagramEmbedHtml($shortcode);
            if (is_string($embedHtml) && $embedHtml !== '') {
                if ($ogImage === null || trim((string) $ogImage) === '') {
                    $ogImage = $this->firstMetaContent($embedHtml, 'og:image')
                        ?? $this->firstInstagramJsonUrl($embedHtml, 'display_url')
                        ?? $this->firstInstagramJsonUrl($embedHtml, 'thumbnail_src');
                }
                if ($ogVideo === null || trim((string) $ogVideo) === '') {
                    $ogVideo = $this->firstMetaContent($embedHtml, 'og:video')
                        ?? $this->firstMetaContent($embedHtml, 'og:video:url')
                        ?? $this->firstInstagramJsonUrl($embedHtml, 'video_url');
                }
            }
            if ($ogVideo === null || trim((string) $ogVideo) === '') {
                $ogVideo = $this->firstInstagramJsonUrl($html, 'video_url');
            }
        }

        if ($mode === 'image_cover' || $mode === 'image_listing') {
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
                $this->deleteStoredPathIfOwned($event->{$field} ?? null);
                $event->update([$field => $path]);

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
            $this->deleteStoredPathIfOwned($event->{$field} ?? null);
            $event->update([$field => $path]);

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
            $event,
            $normalized,
            $ogImage !== null ? trim((string) $ogImage) : null,
            $ogVideo !== null ? trim((string) $ogVideo) : null,
            $isInstagram,
            $shortcode,
            $appendPromoGallery,
            $promoKind
        );
    }

    /**
     * Doğrudan .mp4 / .webm HTTPS adresi (yol uzantılı) — HTML taraması olmadan indirir.
     *
     * @return array{success: bool, message: string, details?: array<string, mixed>}|null Başarı, hata veya «bu mod değil» için null
     */
    private function tryImportDirectVideoUrl(Event $event, string $url, bool $appendPromoGallery, string $promoKind = 'story'): ?array
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
            $this->purgePromoGallery($event);
            $event->refresh();
        }

        $gallery = $this->currentPromoGallery($event);
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
            'promo_kind' => $this->normalizePromoKind($promoKind),
        ];
        $this->syncLegacyPromoFieldsFromGallery($event, $gallery);
        $event->promo_gallery = $gallery;
        $event->save();

        return [
            'success' => true,
            'message' => 'Video doğrudan adresten indirilip sunucuya kaydedildi.',
            'details' => ['video_saved' => true, 'gallery_count' => count($gallery)],
        ];
    }

    private function normalizePromoKind(string $kind): string
    {
        return $kind === 'post' ? 'post' : 'story';
    }

    /**
     * @return array{success: bool, message: string, details?: array<string, mixed>}
     */
    private function importPromoVideo(
        Event $event,
        string $normalized,
        ?string $ogImage,
        ?string $ogVideo,
        bool $isInstagram,
        ?string $shortcode,
        bool $appendPromoGallery,
        string $promoKind = 'story'
    ): array {
        $promoKind = $this->normalizePromoKind($promoKind);
        $messages = [];
        $videoSaved = false;
        $videoPath = null;
        $referer = $isInstagram ? 'https://www.instagram.com/' : null;

        if ($ogVideo !== null && $ogVideo !== '') {
            try {
                $videoUrl = $this->assertSafeUrl($this->resolveUrl($normalized, $ogVideo));
                $videoPath = $this->downloadVideoToStorage($videoUrl, $referer);
                if ($videoPath !== null) {
                    $videoSaved = true;
                    $messages[] = 'Tanıtım videosu sunucuya kaydedildi.';
                }
            } catch (ValidationException) {
                // ignore invalid og:video URL
            }
        }

        if (! $videoSaved && $isInstagram && $shortcode) {
            $ytPath = $this->tryDownloadInstagramVideoWithYtDlp($normalized);
            if ($ytPath !== null) {
                $videoPath = $ytPath;
                $videoSaved = true;
                $messages[] = 'Video yt-dlp ile indirilip sunucuya kaydedildi (sunucuda YTDLP_BINARY tanımlı olmalı).';
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

        if ($ogImage !== null && $ogImage !== '' && ($event->listing_image === null || trim((string) $event->listing_image) === '')) {
            try {
                $imageUrl = $this->assertSafeUrl($this->resolveUrl($normalized, $ogImage));
                $path = $this->downloadImageToStorage($imageUrl, 'event-listings');
                if ($path !== null) {
                    $this->deleteStoredPathIfOwned($event->listing_image);
                    $event->listing_image = $path;
                    $messages[] = 'Önizleme görseli liste görseli olarak kaydedildi.';
                }
            } catch (ValidationException) {
                // skip
            }
        } elseif (($event->listing_image === null || trim((string) $event->listing_image) === '') && $posterPath !== null) {
            $listingCopy = 'event-listings/'.Str::uuid().'.jpg';
            if (Storage::disk('public')->copy($posterPath, $listingCopy)) {
                $this->deleteStoredPathIfOwned($event->listing_image);
                $event->listing_image = $listingCopy;
                $messages[] = 'Liste görseli Instagram önizlemesinden oluşturuldu.';
            }
        }

        $newItem = [
            'embed_url' => $canonicalEmbed,
            'video_path' => $videoPath,
            'poster_path' => $posterPath,
            'promo_kind' => $promoKind,
        ];

        if (! $videoSaved && ! $isInstagram) {
            $event->save();

            return [
                'success' => true,
                'message' => implode(' ', $messages),
                'details' => ['video_saved' => false],
            ];
        }

        if ($isInstagram && ! $shortcode) {
            $event->save();

            return [
                'success' => false,
                'message' => 'Instagram gönderi kodu URL’den okunamadı.',
            ];
        }

        if (! $videoSaved && $isInstagram && $shortcode && $posterPath === null) {
            $event->save();

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
            $this->purgePromoGallery($event);
            $event->refresh();
        }

        $gallery = $this->currentPromoGallery($event);

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
        $this->syncLegacyPromoFieldsFromGallery($event, $gallery);
        $event->promo_gallery = $gallery;
        $event->save();

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
    private function currentPromoGallery(Event $event): array
    {
        $raw = $event->promo_gallery;
        $gallery = is_array($raw) ? array_values($raw) : [];
        if ($gallery !== []) {
            return $this->sanitizePromoGallery($gallery);
        }
        if (trim((string) ($event->promo_embed_url ?? '')) !== '' || trim((string) ($event->promo_video_path ?? '')) !== '') {
            return $this->sanitizePromoGallery([[
                'embed_url' => $event->promo_embed_url,
                'video_path' => $event->promo_video_path,
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
            if (isset($item['promo_kind']) && $item['promo_kind'] === 'post') {
                $row['promo_kind'] = 'post';
            } elseif (isset($item['promo_kind']) && $item['promo_kind'] === 'story') {
                $row['promo_kind'] = 'story';
            }
            $out[] = $row;
        }

        return $out;
    }

    /**
     * @param  list<array<string, mixed>>  $gallery
     */
    private function syncLegacyPromoFieldsFromGallery(Event $event, array $gallery): void
    {
        if ($gallery === []) {
            $event->promo_embed_url = null;
            $event->promo_video_path = null;

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
            $event->promo_embed_url = null;
            $event->promo_video_path = null;

            return;
        }
        $event->promo_embed_url = isset($pick['embed_url']) && is_string($pick['embed_url']) ? $pick['embed_url'] : null;
        $event->promo_video_path = isset($pick['video_path']) && is_string($pick['video_path']) ? $pick['video_path'] : null;
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

    private function fetchInstagramEmbedHtml(string $shortcode): ?string
    {
        $url = 'https://www.instagram.com/p/'.rawurlencode($shortcode).'/embed/captioned/';
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

    private function tryDownloadInstagramVideoWithYtDlp(string $httpsInstagramUrl): ?string
    {
        $binary = $this->resolveYtDlpBinary();
        if ($binary === null) {
            return null;
        }
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
            '-f',
            'bestvideo*[ext=mp4]+bestaudio*[ext=m4a]/best[ext=mp4]/best[height<=1080]/best',
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
            Log::notice('yt-dlp process exception', ['message' => $e->getMessage()]);

            return null;
        }
        if (! $process->isSuccessful()) {
            Log::info('yt-dlp instagram exited non-zero', [
                'output' => Str::limit($process->getErrorOutput().$process->getOutput(), 500),
            ]);

            return null;
        }
        $matches = glob($dir.DIRECTORY_SEPARATOR.$base.'.*', GLOB_NOSORT);
        if ($matches === false || $matches === []) {
            return null;
        }
        usort($matches, function (string $a, string $b): int {
            $sa = @filesize($a) ?: 0;
            $sb = @filesize($b) ?: 0;

            return $sb <=> $sa;
        });
        $tmpFile = $matches[0];
        if (! is_file($tmpFile)) {
            return null;
        }
        $size = filesize($tmpFile);
        if ($size === false || $size > self::MAX_VIDEO_BYTES || $size < 1024) {
            @unlink($tmpFile);

            return null;
        }
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($tmpFile);
        if ($mime === false || ! in_array($mime, ['video/mp4', 'video/webm'], true)) {
            @unlink($tmpFile);

            return null;
        }
        $ext = $mime === 'video/webm' ? 'webm' : 'mp4';
        $dest = 'event-promo/'.Str::uuid()->toString().'.'.$ext;
        $stream = fopen($tmpFile, 'rb');
        if ($stream === false) {
            @unlink($tmpFile);

            return null;
        }
        try {
            Storage::disk('public')->put($dest, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
            @unlink($tmpFile);
        }

        return $dest;
    }
}
