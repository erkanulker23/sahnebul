<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Cobalt (imputnet/cobalt) uyumlu API ile Instagram sayfa URL’sinden video indirme.
 * Kendi Cobalt örneğinizi çalıştırırken çoğu durumda YTDLP_COOKIES_FILE gerekmez.
 *
 * @see https://github.com/imputnet/cobalt
 */
final class CobaltApiInstagramDownloader
{
    private const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

    /**
     * @return null|non-falsy-string public disk path (event-promo/….mp4)
     */
    public function tryDownloadToPublicStorage(
        string $instagramPageUrl,
        ?string $preferredStoryMediaId = null,
    ): ?string
    {
        $base = rtrim((string) config('services.cobalt.api_url', ''), '/');
        if ($base === '' || ! preg_match('#^https?://#i', $base)) {
            return null;
        }

        $timeout = max(30, (int) config('services.cobalt.timeout', 180));
        $endpoint = $base.'/';

        $headers = [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];
        $apiKey = trim((string) config('services.cobalt.api_key', ''));
        if ($apiKey !== '') {
            $headers['Authorization'] = 'Api-Key '.$apiKey;
        }

        try {
            $post = Http::timeout(min($timeout, 90))
                ->withHeaders($headers)
                ->post($endpoint, [
                    'url' => $instagramPageUrl,
                    'downloadMode' => 'auto',
                ]);
        } catch (\Throwable $e) {
            Log::notice('Cobalt API: istek hatası', ['message' => $e->getMessage()]);

            return null;
        }

        if (! $post->successful()) {
            Log::notice('Cobalt API: HTTP hata', [
                'status' => $post->status(),
                'body' => Str::limit($post->body(), 400),
            ]);

            return null;
        }

        $json = $post->json();
        if (! is_array($json)) {
            return null;
        }

        $status = (string) ($json['status'] ?? '');
        if ($status === 'error') {
            $code = data_get($json, 'error.code', '?');
            Log::notice('Cobalt API: hata yanıtı', ['code' => $code]);

            return null;
        }

        if ($status === 'picker' && isset($json['picker']) && is_array($json['picker'])) {
            $pick = $this->pickVideoUrlFromPicker($json['picker'], $base, $preferredStoryMediaId);
            if ($pick !== null) {
                return $this->streamMediaToPublicStorage($pick, $timeout);
            }

            return null;
        }

        if (($status === 'tunnel' || $status === 'redirect') && ! empty($json['url'])) {
            $u = trim((string) $json['url']);
            if ($u === '' || ! $this->isAllowedMediaUrl($u, $base)) {
                return null;
            }

            return $this->streamMediaToPublicStorage($u, $timeout);
        }

        return null;
    }

    private function isAllowedMediaUrl(string $url, string $cobaltBaseUrl): bool
    {
        $p = parse_url($url);
        $scheme = strtolower((string) ($p['scheme'] ?? ''));
        $host = strtolower((string) ($p['host'] ?? ''));
        if ($host === '') {
            return false;
        }
        if ($scheme !== 'https' && ! ($scheme === 'http' && in_array($host, ['127.0.0.1', 'localhost'], true))) {
            return false;
        }

        $root = parse_url($cobaltBaseUrl);
        $rootHost = strtolower((string) ($root['host'] ?? ''));
        if ($rootHost !== '' && ($host === $rootHost || str_ends_with($host, '.'.$rootHost))) {
            return true;
        }
        if (str_ends_with($host, '.cdninstagram.com') || $host === 'cdninstagram.com') {
            return true;
        }
        if (str_ends_with($host, '.fbcdn.net') || $host === 'fbcdn.net') {
            return true;
        }

        return false;
    }

    /**
     * @param  list<mixed>  $picker
     */
    private function pickVideoUrlFromPicker(array $picker, string $cobaltBaseUrl, ?string $preferredStoryMediaId): ?string
    {
        $videoRows = [];
        foreach ($picker as $item) {
            if (! is_array($item)) {
                continue;
            }
            $type = (string) ($item['type'] ?? '');
            $u = isset($item['url']) ? trim((string) $item['url']) : '';
            if ($type !== 'video' || $u === '' || ! $this->isAllowedMediaUrl($u, $cobaltBaseUrl)) {
                continue;
            }
            $videoRows[] = ['url' => $u, 'raw' => $item];
        }
        if ($videoRows === []) {
            return null;
        }

        $preferredId = is_string($preferredStoryMediaId) ? trim($preferredStoryMediaId) : '';
        if ($preferredId !== '') {
            foreach ($videoRows as $row) {
                /** @var string $haystack */
                $haystack = json_encode($row['raw'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '';
                if ($haystack !== '' && str_contains($haystack, $preferredId)) {
                    return $row['url'];
                }
            }
        }

        return $videoRows[0]['url'];
    }

    private function streamMediaToPublicStorage(string $url, int $timeout): ?string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'sbn_cobalt_vid_');
        if ($tmp === false) {
            return null;
        }

        try {
            $response = Http::timeout($timeout)
                ->withHeaders([
                    'User-Agent' => 'Sahnebul/1.0 (+https://sahnebul.com)',
                    'Accept' => '*/*',
                ])
                ->sink($tmp)
                ->get($url);
        } catch (\Throwable $e) {
            @unlink($tmp);
            Log::notice('Cobalt medya indirme hatası', ['url' => Str::limit($url, 80), 'message' => $e->getMessage()]);

            return null;
        }

        if (! $response->successful()) {
            @unlink($tmp);
            Log::notice('Cobalt medya HTTP başarısız', ['status' => $response->status()]);

            return null;
        }

        $size = filesize($tmp);
        if ($size === false || $size < 1024 || $size > self::MAX_VIDEO_BYTES) {
            @unlink($tmp);

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
            @unlink($tmp);

            return null;
        }

        $ext = $mime === 'video/webm' ? 'webm' : 'mp4';
        $dest = 'event-promo/'.Str::uuid()->toString().'.'.$ext;
        $stream = fopen($tmp, 'rb');
        if ($stream === false) {
            @unlink($tmp);

            return null;
        }
        try {
            Storage::disk('public')->put($dest, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
            @unlink($tmp);
        }

        Log::info('Instagram tanıtım: Cobalt API ile video kaydedildi', [
            'path' => $dest,
            'bytes' => $size,
        ]);

        return $dest;
    }
}
