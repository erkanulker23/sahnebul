<?php

namespace App\Services;

use App\Models\Venue;
use App\Models\VenueMedia;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Harici kapak URL'lerini public diske indirir (Google Places ve genel https/http görsel bağlantıları).
 */
class VenueRemoteCoverImporter
{
    public function isMirrorableUrl(string $url): bool
    {
        $url = trim($url);
        if ($url === '') {
            return false;
        }

        if (! str_starts_with($url, 'http://') && ! str_starts_with($url, 'https://')) {
            return false;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if ($host === '') {
            return false;
        }

        return ! $this->isBlockedMirrorHost($host);
    }

    /**
     * SSRF riskini azaltmak: loopback, link-local ve özel ağ IP'leri ile bariz iç host adları.
     */
    private function isBlockedMirrorHost(string $host): bool
    {
        if ($host === 'localhost' || $host === '0.0.0.0' || str_ends_with($host, '.localhost')) {
            return true;
        }

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return ! filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
        }

        return false;
    }

    /**
     * İndirme başarısızsa null döner.
     *
     * @param  string  $directory  Yalnızca venue-covers veya venue-media
     */
    public function importToPublicDisk(string $url, string $directory = 'venue-covers'): ?string
    {
        $url = trim($url);
        if (! $this->isMirrorableUrl($url)) {
            return null;
        }

        $directory = in_array($directory, ['venue-covers', 'venue-media'], true) ? $directory : 'venue-covers';

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

        $body = $response->body();
        if (strlen($body) > 10 * 1024 * 1024) {
            return null;
        }

        $rawType = (string) $response->header('Content-Type');
        $contentType = strtolower(trim(explode(';', $rawType, 2)[0] ?? ''));

        if ($contentType === '' || $contentType === 'application/octet-stream' || ! str_starts_with($contentType, 'image/')) {
            $contentType = $this->sniffImageContentType($body) ?? '';
        }

        if ($contentType === '' || ! str_starts_with($contentType, 'image/')) {
            Log::warning('Venue cover import not image', ['url' => $url, 'content_type' => $rawType]);

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

        $path = $directory.'/'.Str::uuid()->toString().'.'.$ext;
        Storage::disk('public')->put($path, $body);

        return $path;
    }

    /**
     * Google Places foto URL'lerini venue-media'ya indirir, galeri satırları oluşturur.
     * Kapak için ilk başarılı yolu döner (çağıran venue.cover_image güncelleyebilir).
     *
     * @param  list<string>  $urls
     */
    public function importGoogleGalleryToVenue(Venue $venue, array $urls, bool $updateVenueCoverFromFirst = true): ?string
    {
        $urls = array_values(array_unique(array_filter(array_map('trim', $urls))));
        $urls = array_slice($urls, 0, 5);
        if ($urls === []) {
            return null;
        }

        $order = (int) ($venue->media()->max('order') ?? 0);
        $firstPath = null;

        foreach ($urls as $url) {
            if (! $this->isMirrorableUrl($url)) {
                continue;
            }
            $path = $this->importToPublicDisk($url, 'venue-media');
            if ($path === null) {
                continue;
            }
            if ($firstPath === null) {
                $firstPath = $path;
            }
            $order++;
            VenueMedia::create([
                'venue_id' => $venue->id,
                'type' => 'photo',
                'path' => $path,
                'order' => $order,
            ]);
        }

        if ($updateVenueCoverFromFirst && $firstPath !== null) {
            $venue->update(['cover_image' => $firstPath]);
        }

        return $firstPath;
    }

    private function sniffImageContentType(string $body): ?string
    {
        if ($body === '') {
            return null;
        }
        $head = substr($body, 0, 16);
        if (str_starts_with($head, "\xFF\xD8\xFF")) {
            return 'image/jpeg';
        }
        if (str_starts_with($head, "\x89PNG\r\n\x1a\n")) {
            return 'image/png';
        }
        if (str_starts_with($head, 'GIF87a') || str_starts_with($head, 'GIF89a')) {
            return 'image/gif';
        }
        if (str_starts_with($head, 'RIFF') && substr($head, 8, 4) === 'WEBP') {
            return 'image/webp';
        }

        return null;
    }
}
