<?php

namespace App\Services\Instagram;

use App\Services\CobaltApiInstagramDownloader;
use Illuminate\Support\Facades\Log;

/**
 * Instagram tanıtım videosu: tek giriş noktası — önce (isteğe bağlı) Cobalt, sonra yt-dlp.
 * Post / Reels / hikâye URL’leri için sunucuya MP4 indirmeyi burada topluyoruz.
 */
final class InstagramPromoVideoPipeline
{
    public function __construct(
        private readonly CobaltApiInstagramDownloader $cobalt,
        private readonly InstagramYtDlpRunner $ytdlp,
    ) {}

    /**
     * @param  ?string  $pageUrlForCobalt  Hikâye kanonik URL veya gönderi sayfası; Cobalt’a gönderilir
     */
    public function download(
        string $normalizedUrl,
        ?string $shortcode,
        ?string $storyCanonicalUrl,
        ?string $pageUrlForCobalt,
    ): InstagramPromoVideoDownloadResult {
        $cobaltFirst = (bool) config('services.cobalt.try_before_ytdlp', false);
        $messages = [];

        $storyMediaId = $this->extractStoryMediaId($storyCanonicalUrl);

        if ($cobaltFirst && $this->nonEmptyUrl($pageUrlForCobalt)) {
            $path = $this->cobalt->tryDownloadToPublicStorage($pageUrlForCobalt, $storyMediaId);
            if ($path !== null) {
                Log::info('InstagramPromoVideo: Cobalt ile kaydedildi');

                return new InstagramPromoVideoDownloadResult(
                    $path,
                    null,
                    ['Video Cobalt API ile indirilip sunucuya kaydedildi.'],
                );
            }
        }

        $yt = $this->ytdlp->download($normalizedUrl, $shortcode, $storyCanonicalUrl);
        if ($yt['path'] !== null) {
            return new InstagramPromoVideoDownloadResult(
                $yt['path'],
                null,
                ['Video yt-dlp ile indirilip sunucuya kaydedildi.'],
            );
        }

        if (! $cobaltFirst && $this->nonEmptyUrl($pageUrlForCobalt)) {
            $path = $this->cobalt->tryDownloadToPublicStorage($pageUrlForCobalt, $storyMediaId);
            if ($path !== null) {
                Log::info('InstagramPromoVideo: Cobalt (yt-dlp sonrası) ile kaydedildi');

                return new InstagramPromoVideoDownloadResult(
                    $path,
                    $yt['error'],
                    ['Video Cobalt API ile indirilip sunucuya kaydedildi.'],
                );
            }
        }

        return new InstagramPromoVideoDownloadResult(null, $yt['error'], $messages);
    }

    private function nonEmptyUrl(?string $u): bool
    {
        return is_string($u) && trim($u) !== '';
    }

    private function extractStoryMediaId(?string $storyCanonicalUrl): ?string
    {
        if (! is_string($storyCanonicalUrl) || trim($storyCanonicalUrl) === '') {
            return null;
        }
        $path = (string) parse_url($storyCanonicalUrl, PHP_URL_PATH);
        if (preg_match('#/stories/[^/]+/(\d+)/?$#', $path, $m) === 1) {
            return $m[1];
        }

        return null;
    }
}
