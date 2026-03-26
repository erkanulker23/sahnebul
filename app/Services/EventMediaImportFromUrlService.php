<?php

namespace App\Services;

use App\Models\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Paylaşım / sayfa URL’sinden og:image ve (mümkünse) og:video indirir.
 * Instagram çoğu zaman yalnızca önizleme görseli verir; video için embed URL saklanır.
 */
final class EventMediaImportFromUrlService
{
    private const MAX_HTML_BYTES = 2_000_000;

    private const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

    private const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

    private const FETCH_TIMEOUT = 45;

    private const VIDEO_TIMEOUT = 180;

    /** @return array{success: bool, message: string, details?: array<string, mixed>} */
    public function import(Event $event, string $url, string $mode): array
    {
        try {
            $normalized = $this->assertSafeUrl($url);
        } catch (ValidationException $e) {
            $msg = $e->errors()['url'][0] ?? 'Geçersiz URL.';

            return ['success' => false, 'message' => $msg];
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

        $ogImage = $this->firstMetaContent($html, 'og:image')
            ?? $this->firstMetaContent($html, 'twitter:image')
            ?? $this->firstMetaContent($html, 'twitter:image:src');

        $ogVideo = $this->firstMetaContent($html, 'og:video')
            ?? $this->firstMetaContent($html, 'og:video:url');

        $isInstagram = str_contains(strtolower(parse_url($normalized, PHP_URL_HOST) ?? ''), 'instagram.com');

        if ($mode === 'image_cover' || $mode === 'image_listing') {
            if ($ogImage === null || trim($ogImage) === '') {
                return ['success' => false, 'message' => 'Sayfada og:image / Twitter görsel etiketi bulunamadı.'];
            }
            $imageUrl = $this->assertSafeUrl($this->resolveUrl($normalized, trim($ogImage)));
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

        $messages = [];
        $videoSaved = false;

        if ($ogVideo !== null && trim($ogVideo) !== '') {
            $videoUrl = $this->assertSafeUrl($this->resolveUrl($normalized, trim($ogVideo)));
            $videoPath = $this->downloadVideoToStorage($videoUrl);
            if ($videoPath !== null) {
                $this->deleteStoredPathIfOwned($event->promo_video_path);
                $event->promo_video_path = $videoPath;
                $videoSaved = true;
                $messages[] = 'Tanıtım videosu sunucuya kaydedildi.';
            }
        }

        if (! $videoSaved && $isInstagram) {
            $this->deleteStoredPathIfOwned($event->promo_video_path);
            $event->promo_video_path = null;
            $event->promo_embed_url = $this->instagramPermalink($normalized);
            $messages[] = 'Instagram bu sayfada doğrudan video dosyası vermedi; gömülü oynatıcı için bağlantı kaydedildi. Önizleme görseli varsa liste görseli olarak eklenebilir.';
        } elseif (! $videoSaved) {
            $event->promo_embed_url = null;
            $messages[] = 'Doğrudan indirilebilir video bulunamadı (og:video yok veya erişim engellendi).';
        } else {
            $event->promo_embed_url = null;
        }

        if ($ogImage !== null && trim($ogImage) !== '' && ($event->listing_image === null || trim((string) $event->listing_image) === '')) {
            $imageUrl = $this->assertSafeUrl($this->resolveUrl($normalized, trim($ogImage)));
            $path = $this->downloadImageToStorage($imageUrl, 'event-listings');
            if ($path !== null) {
                $this->deleteStoredPathIfOwned($event->listing_image);
                $event->listing_image = $path;
                $messages[] = 'Önizleme görseli liste görseli olarak kaydedildi.';
            }
        }

        $event->save();

        return [
            'success' => true,
            'message' => implode(' ', $messages),
            'details' => [
                'video_saved' => $videoSaved,
                'embed' => $event->promo_embed_url,
            ],
        ];
    }

    private function instagramPermalink(string $url): string
    {
        $parts = parse_url($url);
        if (! is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
            return $url;
        }
        $path = $parts['path'] ?? '/';

        return $parts['scheme'].'://'.$parts['host'].$path;
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
            'Accept' => 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
            'Accept-Language' => 'tr-TR,tr;q=0.9,en;q=0.8',
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

    private function downloadVideoToStorage(string $videoUrl): ?string
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
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (compatible; SahnebulMediaBot/1.0)',
                'Accept' => 'video/mp4,video/webm,*/*;q=0.5',
            ])
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
}
