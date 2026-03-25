<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Harici crawl kaynaklarından gelen görsel URL’lerini public diske yazar (relative path).
 */
class CrawlRemoteImageStorage
{
    private const MAX_BYTES = 5_242_880;

    /**
     * Boş ise null. Zaten http olmayan (yerel path) ise trim’lenmiş değeri döner.
     * Http ise indirip public altında saklar; başarısızsa null döner (çağıran eski URL’yi koruyabilir).
     */
    public function persistPublicIfRemote(?string $value, string $directory = 'crawl-images'): ?string
    {
        if ($value === null) {
            return null;
        }
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        if (! preg_match('#^https?://#i', $value)) {
            return $value;
        }

        try {
            $response = Http::timeout((int) config('crawler.timeout', 20))
                ->withHeaders(['User-Agent' => (string) config('crawler.user_agent')])
                ->get($value);
            if (! $response->successful()) {
                return null;
            }
            $binary = $response->body();
            if ($binary === '' || strlen($binary) > self::MAX_BYTES) {
                return null;
            }
            $ext = $this->guessExtension($response->header('Content-Type'), $value);
            $relativePath = trim($directory, '/').'/'.Str::uuid()->toString().'.'.$ext;
            Storage::disk('public')->put($relativePath, $binary);

            return $relativePath;
        } catch (\Throwable) {
            return null;
        }
    }

    private function guessExtension(?string $contentType, string $url): string
    {
        $ct = strtolower((string) $contentType);
        if (str_contains($ct, 'png')) {
            return 'png';
        }
        if (str_contains($ct, 'webp')) {
            return 'webp';
        }
        if (str_contains($ct, 'gif')) {
            return 'gif';
        }
        if (str_contains($ct, 'jpeg') || str_contains($ct, 'jpg')) {
            return 'jpg';
        }
        $path = parse_url($url, PHP_URL_PATH);
        if (is_string($path) && preg_match('/\.(jpe?g|png|gif|webp)$/i', $path, $m)) {
            $e = strtolower($m[1]);

            return $e === 'jpeg' ? 'jpg' : $e;
        }

        return 'jpg';
    }
}
