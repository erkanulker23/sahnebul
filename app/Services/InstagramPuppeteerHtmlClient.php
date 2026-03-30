<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;

/**
 * Instagram sayfasını gerçek tarayıcıda açıp HTML döker — yalnızca HTTP ile çıkmayan veri için (%20 fallback).
 * Devre dışıysa veya Node/Puppeteer yoksa null döner; her istekte çalıştırılmamalıdır.
 */
final class InstagramPuppeteerHtmlClient
{
    private const MAX_HTML_BYTES = 2_000_000;

    public function isEnabled(): bool
    {
        return filter_var(config('services.instagram.puppeteer_enabled', false), FILTER_VALIDATE_BOOL);
    }

    /**
     * Yalnızca instagram.com https adresleri.
     */
    public function fetchRenderedHtml(string $url): ?string
    {
        if (! $this->isEnabled()) {
            return null;
        }
        $url = trim($url);
        if ($url === '' || ! str_starts_with(strtolower($url), 'https://')) {
            return null;
        }
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if ($host === '' || ! str_contains($host, 'instagram.com')) {
            return null;
        }

        $node = trim((string) config('services.instagram.puppeteer_node_binary', 'node'));
        if ($node === '') {
            return null;
        }
        $script = trim((string) config('services.instagram.puppeteer_script_path', ''));
        if ($script === '') {
            $script = base_path('scripts/instagram-puppeteer-fetch/fetch.mjs');
        }
        if (! is_readable($script)) {
            Log::notice('Instagram Puppeteer: script okunamıyor.', ['path' => $script]);

            return null;
        }

        $timeout = max(15, (int) config('services.instagram.puppeteer_timeout', 120));

        $process = new Process([$node, $script, $url], timeout: $timeout);
        try {
            $process->run();
        } catch (\Throwable $e) {
            Log::warning('Instagram Puppeteer: process exception', ['message' => $e->getMessage()]);

            return null;
        }

        if (! $process->isSuccessful()) {
            Log::info('Instagram Puppeteer: başarısız çıkış', [
                'exit' => $process->getExitCode(),
                'stderr' => Str::limit($process->getErrorOutput(), 500),
            ]);

            return null;
        }

        $html = $process->getOutput();
        if ($html === '' || strlen($html) > self::MAX_HTML_BYTES) {
            return null;
        }

        Log::info('Instagram Puppeteer: HTML alındı', ['bytes' => strlen($html), 'url' => Str::limit($url, 80)]);

        return $html;
    }
}
