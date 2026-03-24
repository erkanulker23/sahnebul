<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Google Places / Maps gibi kaynaklardan gelen kapak URL'lerini public diske indirir (harici hotlink yerine).
 */
class VenueRemoteCoverImporter
{
    public function isMirrorableUrl(string $url): bool
    {
        if (! str_starts_with($url, 'http://') && ! str_starts_with($url, 'https://')) {
            return false;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if ($host === '') {
            return false;
        }

        if (str_ends_with($host, '.googleusercontent.com') || $host === 'googleusercontent.com') {
            return true;
        }

        if (str_ends_with($host, '.ggpht.com') || $host === 'ggpht.com') {
            return true;
        }

        if (str_ends_with($host, '.googleapis.com')) {
            return true;
        }

        return str_ends_with($host, '.gstatic.com') || $host === 'gstatic.com';
    }

    /**
     * İndirme başarısızsa null döner.
     */
    public function importToPublicDisk(string $url): ?string
    {
        if (! $this->isMirrorableUrl($url)) {
            return null;
        }

        try {
            $response = Http::timeout(45)
                ->withOptions(['allow_redirects' => true])
                ->withHeaders([
                    'User-Agent' => 'SahnebulVenueCoverImporter/1.0',
                    'Accept' => 'image/*,*/*;q=0.8',
                ])
                ->get($url);
        } catch (\Throwable $e) {
            Log::warning('Venue cover import HTTP failed', ['error' => $e->getMessage()]);

            return null;
        }

        if (! $response->successful()) {
            Log::warning('Venue cover import bad status', ['url' => $url, 'status' => $response->status()]);

            return null;
        }

        $rawType = (string) $response->header('Content-Type');
        $contentType = strtolower(trim(explode(';', $rawType, 2)[0] ?? ''));

        if ($contentType === '' || ! str_starts_with($contentType, 'image/')) {
            Log::warning('Venue cover import not image', ['url' => $url, 'content_type' => $contentType]);

            return null;
        }

        $body = $response->body();
        if (strlen($body) > 10 * 1024 * 1024) {
            return null;
        }

        $ext = match (true) {
            str_contains($contentType, 'jpeg'), str_contains($contentType, 'jpg') => 'jpg',
            str_contains($contentType, 'png') => 'png',
            str_contains($contentType, 'webp') => 'webp',
            str_contains($contentType, 'gif') => 'gif',
            str_contains($contentType, 'bmp') => 'bmp',
            default => 'jpg',
        };

        $path = 'venue-covers/'.Str::uuid()->toString().'.'.$ext;
        Storage::disk('public')->put($path, $body);

        return $path;
    }
}
