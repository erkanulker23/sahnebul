<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\BubiletCrawlerCookiesPath;
use App\Support\NetscapeCookieFileReader;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Dış kaynak crawl: Bubilet Cloudflare — Netscape cookies.txt panelden (admin).
 * Yalnız MarketplaceCrawlerService / .env BUBILET_COOKIES ile birleşir; diğer modüllere dokunulmaz.
 */
class BubiletCrawlCookiesController extends Controller
{
    public function index(): Response
    {
        $uploadedPath = BubiletCrawlerCookiesPath::uploadedAbsolutePath();
        $envPathRaw = config('crawler.bubilet_cookies_file');
        $envPath = is_string($envPathRaw) ? trim($envPathRaw) : '';
        $resolvedFile = BubiletCrawlerCookiesPath::resolve();
        $uploadedMtime = null;
        $uploadedBytes = null;
        if (BubiletCrawlerCookiesPath::hasUploadedFile()) {
            $uploadedMtime = filemtime($uploadedPath) ?: null;
            $sz = filesize($uploadedPath);
            $uploadedBytes = $sz !== false ? $sz : null;
        }

        $fileSource = 'none';
        if ($resolvedFile !== null) {
            $fileSource = $resolvedFile === $uploadedPath ? 'upload' : 'env';
        }

        $pairs = [];
        if ($resolvedFile !== null) {
            $pairs = NetscapeCookieFileReader::bubiletPairsFromNetscapeFile($resolvedFile);
        }
        $envRaw = trim((string) config('crawler.bubilet_cookies', ''));
        foreach (NetscapeCookieFileReader::pairsFromSemicolonString($envRaw) as $k => $v) {
            $pairs[$k] = $v;
        }
        $mergedHeader = NetscapeCookieFileReader::cookieHeaderFromPairs($pairs);
        $hasCfClearance = isset($pairs['cf_clearance']);

        return Inertia::render('Admin/ExternalEvents/BubiletCrawlCookies/Index', [
            'effectiveFileSource' => $fileSource,
            'effectiveFileBasename' => $resolvedFile !== null ? basename($resolvedFile) : null,
            'envFileConfigured' => $envPath !== '',
            'envFileReadable' => $envPath !== '' && is_readable(BubiletCrawlerCookiesPath::expandUserPath($envPath)),
            'envInlineCookiesConfigured' => $envRaw !== '',
            'uploadedExists' => BubiletCrawlerCookiesPath::hasUploadedFile(),
            'uploadedUpdatedAt' => $uploadedMtime !== null ? date('c', $uploadedMtime) : null,
            'uploadedSizeBytes' => $uploadedBytes,
            'mergedPairCount' => count($pairs),
            'mergedHeaderNonEmpty' => $mergedHeader !== '',
            'hasCfClearance' => $hasCfClearance,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate(
            [
                'cookies_file' => ['nullable', 'file', 'max:512'],
                'cookies_text' => ['nullable', 'string', 'max:524288'],
            ],
            [
                'cookies_file.max' => 'Dosya en fazla 512 KB olabilir.',
                'cookies_text.max' => 'Yapıştırılan metin en fazla 512 KB olabilir.',
            ],
        );

        $file = $request->file('cookies_file');
        $hasFile = $file instanceof UploadedFile && $file->isValid();
        $text = $request->input('cookies_text');
        $hasText = is_string($text) && trim($text) !== '';

        if (! $hasFile && ! $hasText) {
            return back()->with('error', '.txt dosyası seçin veya Netscape cookies metnini yapıştırıp kaydedin.');
        }

        if ($hasFile) {
            $tmp = $file->getRealPath();
            if (! is_string($tmp) || ! is_readable($tmp)) {
                return back()->with('error', 'Geçici dosya okunamadı.');
            }
            $raw = file_get_contents($tmp);
            if ($raw === false) {
                return back()->with('error', 'Dosya okunamadı.');
            }
        } else {
            $raw = (string) $text;
        }

        return $this->persistBubiletNetscape($raw);
    }

    private function persistBubiletNetscape(string $raw): RedirectResponse
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $raw);
        if (strlen($normalized) > 512 * 1024) {
            return back()->with('error', 'İçerik en fazla 512 KB olabilir.');
        }

        $snippet = strtolower(substr($normalized, 0, 8192));
        if ($snippet === '' || ! str_contains($snippet, 'bubilet.com.tr')) {
            return back()->with('error', 'Dosyada bubilet.com.tr alanına ait Netscape satırı görünmüyor. Tarayıcıda bubilet.com.tr açıkken cookies.txt dışa aktarın (Cloudflare sonrası cf_clearance dahil).');
        }

        if (Storage::disk('local')->put(BubiletCrawlerCookiesPath::LOCAL_DISK_FILENAME, $normalized) === false) {
            return back()->with('error', 'Dosya kaydedilemedi (storage/app/private izinleri).');
        }

        $abs = BubiletCrawlerCookiesPath::uploadedAbsolutePath();
        $pairs = NetscapeCookieFileReader::bubiletPairsFromNetscapeFile($abs);
        if ($pairs === []) {
            Storage::disk('local')->delete(BubiletCrawlerCookiesPath::LOCAL_DISK_FILENAME);

            return back()->with('error', 'Netscape dosyası okundu ancak bubilet.com.tr için geçerli çerez satırı çıkarılamadı (tab ile ayrılmış 7 alan).');
        }

        $msg = 'Bubilet crawl çerez dosyası kaydedildi. Dış kaynak etkinlik sayfasından veri çekmeyi tekrar deneyin. '
            .'Okunabilir .env BUBILET_COOKIES_FILE varsa o önceliklidir; BUBILET_COOKIES satırı her zaman dosyadaki aynı isimleri ezer. '
            .'Değişiklikten sonra gerekirse sunucuda «php artisan config:clear».';
        if (! isset($pairs['cf_clearance'])) {
            $msg .= ' Uyarı: cf_clearance yok — Cloudflare yine engelleyebilir.';
        }

        return back()->with('success', $msg);
    }

    public function destroy(): RedirectResponse
    {
        if (BubiletCrawlerCookiesPath::hasUploadedFile()) {
            Storage::disk('local')->delete(BubiletCrawlerCookiesPath::LOCAL_DISK_FILENAME);
        }

        return back()->with('success', 'Panelden yüklenen Bubilet çerez dosyası kaldırıldı. .env BUBILET_COOKIES_FILE varsa o kullanılmaya devam eder.');
    }
}
