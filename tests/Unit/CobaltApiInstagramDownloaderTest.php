<?php

namespace Tests\Unit;

use App\Services\CobaltApiInstagramDownloader;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CobaltApiInstagramDownloaderTest extends TestCase
{
    public function test_returns_null_when_api_url_not_configured(): void
    {
        Config::set('services.cobalt.api_url', '');

        $path = app(CobaltApiInstagramDownloader::class)->tryDownloadToPublicStorage('https://www.instagram.com/reel/AbCd123/');

        $this->assertNull($path);
    }

    public function test_tunnel_response_streams_to_public_disk(): void
    {
        Storage::fake('public');
        Config::set('services.cobalt.api_url', 'https://cobalt.test');
        Config::set('services.cobalt.api_key', '');
        Config::set('services.cobalt.timeout', 60);

        $mp4Body = "\x00\x00\x00\x20ftypmp42\x00\x00\x00\x00mp42isom".str_repeat("\0", 2500);

        Http::fake(function (Request $request) use ($mp4Body) {
            if ($request->method() === 'POST' && str_starts_with($request->url(), 'https://cobalt.test/')) {
                return Http::response([
                    'status' => 'tunnel',
                    'url' => 'https://cobalt.test/stream/abc',
                    'filename' => 'x.mp4',
                ], 200);
            }
            if ($request->method() === 'GET' && str_contains($request->url(), 'cobalt.test/stream/')) {
                return Http::response($mp4Body, 200, ['Content-Type' => 'video/mp4']);
            }

            return Http::response('not found', 404);
        });

        $path = app(CobaltApiInstagramDownloader::class)->tryDownloadToPublicStorage('https://www.instagram.com/reel/XYZ123/');

        $this->assertIsString($path);
        $this->assertTrue(Storage::disk('public')->exists($path));
    }
}
