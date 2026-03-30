<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Harici crawl yanıtlarında Cloudflare vb. HTML gövdelerini kısa, okunabilir mesajlara çevirir.
 */
final class CrawlerHttpResponseInspector
{
    public static function looksLikeCloudflareChallenge(string $body): bool
    {
        if ($body === '') {
            return false;
        }

        $lower = mb_strtolower($body, 'UTF-8');

        return str_contains($lower, 'just a moment')
            || str_contains($lower, 'cf-browser-verification')
            || str_contains($lower, 'cf-challenge')
            || str_contains($lower, '__cf_chl')
            || str_contains($lower, 'challenge-platform')
            || str_contains($lower, 'checking your browser');
    }

    public static function cloudflareBlockedMessage(?string $sentCookieHeader = null): string
    {
        $base = 'Bubilet isteği güvenlik duvarı (Cloudflare) tarafından engellendi. Sunucudan yapılan düz HTTP istekleri '
            .'«Just a moment…» doğrulamasını (JavaScript) tamamlayamaz. Geçici çözüm: .env içinde BUBILET_COOKIES (ör. name=value; …) '
            .'veya BUBILET_COOKIES_FILE ile Netscape cookies.txt yolu; Cloudflare için özellikle cf_clearance (çoğu durumda __cf_bm) gerekir — '
            .'yalnızca _ga, _fbp veya cityId gibi çerezler yetmez. '
            .'.env değişince sunucuda `php artisan config:clear` veya deploy sonrası yapılandırma önbelleğini yenileyin. '
            .'Önemli: cf_clearance çoğu zaman isteği atan IP ile bağlantılıdır; çerezi yalnızca kendi bilgisayarınızdan kopyaladıysanız Forge/sunucu IP’sinde geçersiz olabilir — mümkünse aynı sunucudan (SSH üzerinden tarayıcısız araç veya headless) alın veya BUBILET_USER_AGENT’ı çerezi export ettiğiniz tarayıcıyla aynı yapın. '
            .'Sunucu IP’si engelleniyorsa .env içinde BUBILET_HTTP_PROXY ile residential/çıkış vekili kullanın (çoğu veri merkezi IP’sinde gerekir). '
            .'Kalıcı çözüm: resmi veri ortaklığı veya kuyrukta headless tarayıcı.';

        $c = $sentCookieHeader ?? '';
        if ($c !== '' && stripos($c, 'cf_clearance') === false) {
            return $base.' Şu an gönderilen çerez satırında cf_clearance yok; Bubilet’i tarayıcıda açıp challenge bittikten sonra çerezleri yeniden export edin veya cf_clearance’ı elle BUBILET_COOKIES içine ekleyin.';
        }

        return $base;
    }

    /**
     * Crawl hata mesajlarında HTML gövde sızıntısını keser.
     */
    public static function humanizeCrawlerErrorMessage(string $message): string
    {
        $trimmed = trim($message);
        if ($trimmed === '') {
            return $trimmed;
        }

        if (self::looksLikeCloudflareChallenge($trimmed)
            || (str_contains($trimmed, 'Just a moment') && str_contains($trimmed, '<!DOCTYPE'))) {
            return self::cloudflareBlockedMessage();
        }

        if (str_contains($trimmed, '<!DOCTYPE') || str_contains($trimmed, '<html')) {
            $stripped = trim(strip_tags($trimmed));
            if ($stripped !== '' && mb_strlen($stripped) < 400) {
                return $stripped;
            }

            return Str::limit(preg_replace('/\s+/', ' ', $stripped) ?? '', 280, '…')
                .' (HTML yanıt kısaltıldı.)';
        }

        return Str::limit($trimmed, 600, '…');
    }

    /**
     * Admin «Son veri çekme» tablosu ve özet satırları için kısa metin (tekrarlayan Cloudflare paragraflarını keser).
     */
    public static function compactCrawlerErrorForAdmin(string $message): string
    {
        $human = self::humanizeCrawlerErrorMessage($message);
        $lower = mb_strtolower($human, 'UTF-8');
        if (str_contains($lower, 'güvenlik duvarı (cloudflare)')
            && str_contains($lower, 'bubilet')) {
            return 'Cloudflare «Just a moment» engeli. .env: BUBILET_HTTP_PROXY (residential önerilir) veya BUBILET_COOKIES (sunucu IP ile uyumlu cf_clearance). Tam metin: sayfa altı Bubilet notu.';
        }

        return Str::limit($human, 180, '…');
    }
}
