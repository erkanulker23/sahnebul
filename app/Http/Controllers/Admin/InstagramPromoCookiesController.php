<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\InstagramNetscapeCookies;
use App\Support\InstagramYtdlpCookiesPath;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Yönetici paneli: Netscape cookies.txt yükler — .env’e SSH gerekmez (admin / super_admin).
 */
class InstagramPromoCookiesController extends Controller
{
    public function index(): Response
    {
        $uploadedPath = InstagramYtdlpCookiesPath::uploadedAbsolutePath();
        $envPathRaw = config('services.ytdlp.cookies_file');
        $envPath = is_string($envPathRaw) ? trim($envPathRaw) : '';
        $effective = InstagramYtdlpCookiesPath::resolve();
        $uploadedMtime = null;
        $uploadedBytes = null;
        if (InstagramYtdlpCookiesPath::hasUploadedFile()) {
            $uploadedMtime = filemtime($uploadedPath) ?: null;
            $sz = filesize($uploadedPath);
            $uploadedBytes = $sz !== false ? $sz : null;
        }

        $source = 'none';
        if ($effective !== null) {
            $source = $effective === $uploadedPath ? 'upload' : 'env';
        }

        $sampleHeader = $effective !== null ? InstagramNetscapeCookies::toCookieHeader($effective) : null;

        return Inertia::render('Admin/InstagramPromoCookies/Index', [
            'effectiveSource' => $source,
            'effectivePathBasename' => $effective !== null ? basename($effective) : null,
            'envPathConfigured' => $envPath !== '',
            'envPathReadable' => $envPath !== '' && is_readable(InstagramYtdlpCookiesPath::expandUserPath($envPath)),
            'uploadedExists' => InstagramYtdlpCookiesPath::hasUploadedFile(),
            'uploadedUpdatedAt' => $uploadedMtime !== null ? date('c', $uploadedMtime) : null,
            'uploadedSizeBytes' => $uploadedBytes,
            'phpCookieHeaderWorks' => $sampleHeader !== null && $sampleHeader !== '',
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
            return back()->with('error', '.txt dosyası seçin veya Netscape cookies metnini aşağıdaki alana yapıştırıp kaydedin.');
        }

        /** Dosya + metin birlikte gelirse dosyayı kullan. */
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

        return $this->persistNetscapeCookies($raw);
    }

    private function persistNetscapeCookies(string $raw): RedirectResponse
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $raw);
        if (strlen($normalized) > 512 * 1024) {
            return back()->with('error', 'İçerik en fazla 512 KB olabilir.');
        }

        $snippet = substr($normalized, 0, 8192);
        if ($snippet === '' || ! str_contains(strtolower($snippet), 'instagram.com')) {
            return back()->with('error', 'İçerikte instagram.com çerezi görünmüyor. Tarayıcı eklentisiyle Instagram’a giriş yaptıktan sonra Netscape cookies.txt dışa aktarın.');
        }

        if (Storage::disk('local')->put(InstagramYtdlpCookiesPath::LOCAL_DISK_FILENAME, $normalized) === false) {
            return back()->with('error', 'Dosya kaydedilemedi (storage/app/private izinleri).');
        }

        $abs = InstagramYtdlpCookiesPath::uploadedAbsolutePath();
        if (InstagramNetscapeCookies::toCookieHeader($abs) === null) {
            Storage::disk('local')->delete(InstagramYtdlpCookiesPath::LOCAL_DISK_FILENAME);

            return back()->with('error', 'Metin Netscape (satırlar tab ile ayrılmış) cookies formatında değil veya geçerli çerez satırı yok.');
        }

        return back()->with('success', 'Instagram çerez dosyası kaydedildi. Tanıtım video URL içe aktarmayı tekrar deneyin. .env içinde YTDLP_COOKIES_FILE tanımlı ve okunabilirse o dosya önceliklidir.');
    }

    public function destroy(): RedirectResponse
    {
        if (InstagramYtdlpCookiesPath::hasUploadedFile()) {
            Storage::disk('local')->delete(InstagramYtdlpCookiesPath::LOCAL_DISK_FILENAME);
        }

        return back()->with('success', 'Panelden yüklenen çerez dosyası kaldırıldı. .env YTDLP_COOKIES_FILE varsa o kullanılmaya devam eder.');
    }
}
