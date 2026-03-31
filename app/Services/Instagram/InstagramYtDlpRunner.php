<?php

namespace App\Services\Instagram;

use App\Support\FfmpegBinaryResolver;
use App\Support\InstagramYtdlpCookiesPath;
use App\Support\YtDlpBinaryResolver;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;

/**
 * Instagram sayfa URL’sinden yt-dlp + (gerekirse) ffmpeg ile public disk üzerine MP4/WebM yazar.
 */
final class InstagramYtDlpRunner
{
    private const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

    /**
     * @return array{path: ?string, error: ?string}
     */
    public function download(string $normalizedUrl, ?string $shortcode, ?string $storyCanonicalUrl): array
    {
        $binary = YtDlpBinaryResolver::resolve();
        if ($binary === null) {
            Log::warning('InstagramPromoVideo: yt-dlp bulunamadı (.env YTDLP_BINARY veya PATH)');

            return ['path' => null, 'error' => null];
        }

        $lastErr = null;

        if (is_string($shortcode) && $shortcode !== '') {
            foreach ($this->postOrReelSourceUrls($normalizedUrl, $shortcode) as $sourceUrl) {
                $dest = $this->runYtDlpOnceAllFormats($binary, $sourceUrl, $lastErr);
                if ($dest !== null) {
                    Log::info('InstagramPromoVideo: yt-dlp gönderi/reel kaydedildi', [
                        'shortcode' => $shortcode,
                        'source' => Str::limit($sourceUrl, 120),
                    ]);

                    return ['path' => $dest, 'error' => null];
                }
                if ($lastErr !== null && $this->stderrIndicatesTerminalFailure($lastErr)) {
                    break;
                }
            }

            return ['path' => null, 'error' => $lastErr];
        }

        $expectedStoryMediaId = $this->extractStoryMediaId($storyCanonicalUrl);
        foreach ($this->storySourceUrls($normalizedUrl, $storyCanonicalUrl) as $sourceUrl) {
            $dest = $this->runYtDlpOnceAllFormats($binary, $sourceUrl, $lastErr, $expectedStoryMediaId);
            if ($dest !== null) {
                Log::info('InstagramPromoVideo: yt-dlp hikâye kaydedildi', [
                    'source' => Str::limit($sourceUrl, 120),
                ]);

                return ['path' => $dest, 'error' => null];
            }
            if ($lastErr !== null && $this->stderrIndicatesTerminalFailure($lastErr)) {
                break;
            }
        }

        Log::warning('InstagramPromoVideo: yt-dlp tüm URL varyantlarında başarısız', [
            'tried' => array_map(fn (string $u) => Str::limit($u, 80), $this->storySourceUrls($normalizedUrl, $storyCanonicalUrl)),
        ]);

        return ['path' => null, 'error' => $lastErr];
    }

    /**
     * @return list<string>
     */
    private function postOrReelSourceUrls(string $normalized, string $shortcode): array
    {
        $urls = [];
        $n = trim($normalized);
        if ($n !== '' && $this->isInstagramHost($n)) {
            $urls[] = $n;
        }
        $urls[] = 'https://www.instagram.com/p/'.rawurlencode($shortcode).'/';
        $urls[] = 'https://www.instagram.com/reel/'.rawurlencode($shortcode).'/';

        return $this->dedupePreserveOrder($urls);
    }

    /**
     * Hikâyede tek varyant yetmez; www / son slash / kullanıcı URL’si kombinasyonu.
     *
     * @return list<string>
     */
    private function storySourceUrls(string $normalized, ?string $canonical): array
    {
        $urls = [];
        $storyMediaId = $this->extractStoryMediaId($canonical) ?? $this->extractStoryMediaId($normalized);
        foreach (array_filter([trim($normalized), is_string($canonical) ? trim($canonical) : '']) as $u) {
            if ($u === '' || ! $this->isInstagramHost($u)) {
                continue;
            }
            $urls[] = $u;
            $urls[] = rtrim($u, '/');
            $urls[] = rtrim($u, '/').'/';
            if (is_string($storyMediaId) && $storyMediaId !== '') {
                $scoped = $this->withStoryMediaIdQuery($u, $storyMediaId);
                if ($scoped !== null) {
                    $urls[] = $scoped;
                    $urls[] = rtrim($scoped, '/');
                    $urls[] = rtrim($scoped, '/').'/';
                }
            }
            $www = $this->withWwwInstagramHost($u);
            if ($www !== null) {
                $urls[] = $www;
                $urls[] = rtrim($www, '/').'/';
                if (is_string($storyMediaId) && $storyMediaId !== '') {
                    $scopedWww = $this->withStoryMediaIdQuery($www, $storyMediaId);
                    if ($scopedWww !== null) {
                        $urls[] = $scopedWww;
                        $urls[] = rtrim($scopedWww, '/').'/';
                    }
                }
            }
        }

        return $this->dedupePreserveOrder($urls);
    }

    private function withWwwInstagramHost(string $url): ?string
    {
        $p = parse_url($url);
        if (! is_array($p) || empty($p['host'])) {
            return null;
        }
        $host = strtolower((string) $p['host']);
        if ($host !== 'instagram.com') {
            return null;
        }
        $scheme = isset($p['scheme']) ? (string) $p['scheme'] : 'https';
        $path = isset($p['path']) ? (string) $p['path'] : '/';
        $query = isset($p['query']) ? '?'.$p['query'] : '';
        $fragment = isset($p['fragment']) ? '#'.$p['fragment'] : '';

        return $scheme.'://www.instagram.com'.$path.$query.$fragment;
    }

    /**
     * @return list<string>
     */
    private function dedupePreserveOrder(array $list): array
    {
        $seen = [];
        $out = [];
        foreach ($list as $s) {
            $s = trim((string) $s);
            if ($s === '' || isset($seen[$s])) {
                continue;
            }
            $seen[$s] = true;
            $out[] = $s;
        }

        return $out;
    }

    private function isInstagramHost(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        return str_contains($host, 'instagram.com');
    }

    private function extractStoryMediaId(?string $url): ?string
    {
        if (! is_string($url) || trim($url) === '') {
            return null;
        }
        $path = (string) parse_url($url, PHP_URL_PATH);
        if (preg_match('#/stories/[^/]+/(\d+)/?$#', $path, $m) === 1) {
            return $m[1];
        }

        return null;
    }

    private function withStoryMediaIdQuery(string $url, string $storyMediaId): ?string
    {
        $parts = parse_url($url);
        if (! is_array($parts)) {
            return null;
        }
        $scheme = isset($parts['scheme']) ? (string) $parts['scheme'] : 'https';
        $host = isset($parts['host']) ? (string) $parts['host'] : '';
        $path = isset($parts['path']) ? (string) $parts['path'] : '/';
        if ($host === '') {
            return null;
        }
        $queryRaw = isset($parts['query']) ? (string) $parts['query'] : '';
        parse_str($queryRaw, $query);
        $query['story_media_id'] = $storyMediaId;
        $queryString = http_build_query($query);
        $fragment = isset($parts['fragment']) ? '#'.$parts['fragment'] : '';

        return $scheme.'://'.$host.$path.($queryString !== '' ? '?'.$queryString : '').$fragment;
    }

    private function runYtDlpOnceAllFormats(
        string $binary,
        string $httpsInstagramUrl,
        ?string &$lastCombinedErr,
        ?string $expectedMediaId = null,
    ): ?string
    {
        foreach ($this->formatFallbackList() as $format) {
            $attemptErr = null;
            $dest = $this->executeYtDlpAttempt($binary, $httpsInstagramUrl, $format, $attemptErr, $expectedMediaId);
            if ($attemptErr !== null) {
                $lastCombinedErr = $attemptErr;
            }
            if ($dest !== null) {
                return $dest;
            }
            if ($attemptErr !== null && $this->stderrIndicatesTerminalFailure($attemptErr)) {
                break;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function formatFallbackList(): array
    {
        return [
            'bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/best[ext=mp4]/bestvideo+bestaudio/best',
            'bestvideo+bestaudio/best',
            'best',
        ];
    }

    private function stderrIndicatesTerminalFailure(?string $stderr): bool
    {
        if ($stderr === null || trim($stderr) === '') {
            return false;
        }
        $l = mb_strtolower($stderr);

        return str_contains($l, 'login required')
            || str_contains($l, 'log in to')
            || str_contains($l, 'private video')
            || str_contains($l, 'video unavailable')
            || str_contains($l, 'no video formats')
            || str_contains($l, 'no formats found')
            || str_contains($l, 'there is no video in this post')
            || str_contains($l, 'this post does not contain a video')
            || str_contains($l, 'content is no longer available')
            || str_contains($l, 'instagram sent an empty media');
    }

    /**
     * @return list<string>
     */
    private function configuredExtraArgs(): array
    {
        $raw = config('services.ytdlp.extra_args_json');

        return is_array($raw)
            ? array_values(array_filter($raw, fn ($x) => is_string($x) && $x !== ''))
            : [];
    }

    private function executeYtDlpAttempt(
        string $binary,
        string $httpsInstagramUrl,
        string $format,
        ?string &$combinedErr,
        ?string $expectedMediaId = null,
    ): ?string {
        $combinedErr = null;
        $timeout = (float) config('services.ytdlp.timeout', 300);
        $dir = sys_get_temp_dir();
        $base = 'sbn_igpromo_'.Str::random(20);
        $outTemplate = $dir.DIRECTORY_SEPARATOR.$base.'.%(ext)s';

        $cmd = [$binary];
        $cookiesPath = InstagramYtdlpCookiesPath::resolve();
        if ($cookiesPath !== null) {
            $cmd[] = '--cookies';
            $cmd[] = $cookiesPath;
        }
        foreach ($this->configuredExtraArgs() as $extra) {
            $cmd[] = $extra;
        }
        $cmd = array_merge($cmd, [
            '--add-header', 'Referer:https://www.instagram.com/',
            '--add-header', 'Origin:https://www.instagram.com',
            '--retries', '3',
            '--fragment-retries', '3',
            '-o', $outTemplate,
            '--no-playlist',
            '--no-progress',
            '-f', $format,
            '--merge-output-format', 'mp4',
            '--print', '%(id)s',
            $httpsInstagramUrl,
        ]);
        try {
            $process = new Process($cmd, $dir, null, null, $timeout);
            $process->run();
        } catch (\Throwable $e) {
            Log::notice('InstagramPromoVideo: yt-dlp istisna', ['message' => $e->getMessage()]);
            $combinedErr = $e->getMessage();

            return null;
        }
        $outChunk = Str::limit($process->getErrorOutput().$process->getOutput(), 1200);
        if (! $process->isSuccessful()) {
            $combinedErr = $outChunk;
            Log::warning('InstagramPromoVideo: yt-dlp çıkış kodu ≠0', [
                'url' => Str::limit($httpsInstagramUrl, 120),
                'format' => $format,
                'output' => Str::limit($outChunk, 600),
            ]);

            return null;
        }
        $expectedId = is_string($expectedMediaId) ? trim($expectedMediaId) : '';
        if ($expectedId !== '') {
            $printed = trim((string) $process->getOutput());
            if ($printed === '' || ! preg_match('/(^|\D)'.preg_quote($expectedId, '/').'(\D|$)/', $printed)) {
                $combinedErr = 'Story kimliği eşleşmedi: beklenen '.$expectedId.', yt-dlp çıktısı: '.Str::limit($printed, 160);

                return null;
            }
        }

        $rawMatches = glob($dir.DIRECTORY_SEPARATOR.$base.'*', GLOB_NOSORT);
        if ($rawMatches === false || $rawMatches === []) {
            $combinedErr = $outChunk !== '' ? $outChunk : 'yt-dlp başarılı göründü ancak geçici dosya yok.';

            return null;
        }
        $tmpFile = $this->finalizeTempFiles($rawMatches, $dir, $base);
        if ($tmpFile === null || ! is_file($tmpFile)) {
            foreach ($rawMatches as $p) {
                if (is_file($p)) {
                    @unlink($p);
                }
            }
            $combinedErr = $outChunk !== '' ? $outChunk : 'Video parçaları birleştirilemedi (ffmpeg gerekli olabilir).';

            return null;
        }
        $size = filesize($tmpFile);
        if ($size === false || $size > self::MAX_VIDEO_BYTES || $size < 1024) {
            @unlink($tmpFile);
            $combinedErr = 'İnen dosya çok küçük veya çok büyük.';

            return null;
        }
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($tmpFile);
        if ($mime === 'application/octet-stream' || $mime === 'binary/octet-stream') {
            $head = @file_get_contents($tmpFile, false, null, 0, 16);
            if (is_string($head) && str_contains($head, 'ftyp')) {
                $mime = 'video/mp4';
            }
        }
        if ($mime === false || ! in_array($mime, ['video/mp4', 'video/webm'], true)) {
            @unlink($tmpFile);
            $combinedErr = 'Dosya video/mp4 veya video/webm olarak tanınmadı.';

            return null;
        }
        $ext = $mime === 'video/webm' ? 'webm' : 'mp4';
        $dest = 'event-promo/'.Str::uuid()->toString().'.'.$ext;
        $stream = fopen($tmpFile, 'rb');
        if ($stream === false) {
            $this->unlinkTempFiles($rawMatches, $tmpFile);

            return null;
        }
        try {
            Storage::disk('public')->put($dest, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
            $this->unlinkTempFiles($rawMatches, $tmpFile);
        }

        return $dest;
    }

    /**
     * @param  list<string>  $paths
     */
    private function finalizeTempFiles(array $paths, string $dir, string $base): ?string
    {
        $paths = array_values(array_filter($paths, fn (string $p) => is_file($p)));
        if ($paths === []) {
            return null;
        }

        $m4as = array_values(array_filter($paths, fn (string $p) => str_ends_with(strtolower($p), '.m4a')));
        $mp4s = array_values(array_filter($paths, fn (string $p) => str_ends_with(strtolower($p), '.mp4')));

        if ($m4as !== [] && $mp4s !== []) {
            usort($mp4s, fn (string $a, string $b): int => (@filesize($b) ?: 0) <=> (@filesize($a) ?: 0));
            usort($m4as, fn (string $a, string $b): int => (@filesize($b) ?: 0) <=> (@filesize($a) ?: 0));
            $videoPart = $mp4s[0];
            $audioPart = $m4as[0];
            $merged = $dir.DIRECTORY_SEPARATOR.$base.'_sbn_mux.mp4';
            if ($this->muxVideoAndAudioWithFfmpeg($videoPart, $audioPart, $merged)) {
                foreach ($paths as $p) {
                    if ($p !== $merged) {
                        @unlink($p);
                    }
                }

                return $merged;
            }
            Log::warning('InstagramPromoVideo: DASH video+audio ffmpeg ile birleştirilemedi', [
                'video' => basename($videoPart),
                'audio' => basename($audioPart),
            ]);
        }

        $candidates = array_values(array_filter($paths, fn (string $p) => preg_match('/\.(mp4|webm)$/i', $p) === 1));
        if ($candidates === []) {
            return null;
        }
        usort($candidates, fn (string $a, string $b): int => (@filesize($b) ?: 0) <=> (@filesize($a) ?: 0));

        return $candidates[0];
    }

    /**
     * @param  list<string>  $paths
     */
    private function unlinkTempFiles(array $paths, string $primary): void
    {
        foreach ($paths as $p) {
            if (is_file($p)) {
                @unlink($p);
            }
        }
        if ($primary !== '' && is_file($primary) && ! in_array($primary, $paths, true)) {
            @unlink($primary);
        }
    }

    private function muxVideoAndAudioWithFfmpeg(string $videoPath, string $audioPath, string $outputPath): bool
    {
        $ffmpeg = FfmpegBinaryResolver::resolve();
        if ($ffmpeg === null) {
            return false;
        }
        $timeout = (float) config('services.ffmpeg.timeout', 180);
        if (is_file($outputPath)) {
            @unlink($outputPath);
        }
        $cmd = [
            $ffmpeg,
            '-hide_banner',
            '-loglevel', 'error',
            '-y',
            '-i', $videoPath,
            '-i', $audioPath,
            '-c', 'copy',
            '-shortest',
            '-movflags', '+faststart',
            $outputPath,
        ];
        try {
            $process = new Process($cmd, null, null, null, $timeout);
            $process->run();
        } catch (\Throwable $e) {
            Log::notice('InstagramPromoVideo: ffmpeg mux istisna', ['message' => $e->getMessage()]);
            if (is_file($outputPath)) {
                @unlink($outputPath);
            }

            return false;
        }
        if (! $process->isSuccessful() || ! is_file($outputPath)) {
            if (is_file($outputPath)) {
                @unlink($outputPath);
            }

            return false;
        }

        return true;
    }
}
