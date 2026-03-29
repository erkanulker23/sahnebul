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

    public static function cloudflareBlockedMessage(): string
    {
        return 'Bubilet isteği güvenlik duvarı (Cloudflare) tarafından engellendi. Sunucudan yapılan düz HTTP istekleri '
            .'«Just a moment…» doğrulamasını (JavaScript) tamamlayamaz. Geçici çözüm: sunucu .env içinde BUBILET_COOKIES ile '
            .'tarayıcıdan kopyalanan çerezleri (ör. cf_clearance) tanımlayın; kalıcı çözüm: resmi veri ortaklığı veya kuyrukta headless tarayıcı.';
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
}
