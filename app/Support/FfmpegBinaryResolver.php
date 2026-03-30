<?php

namespace App\Support;

use Symfony\Component\Process\ExecutableFinder;

/**
 * Poster karesi ve yt-dlp DASH birleştirme için ffmpeg yolu (PHP-FPM’de PATH boş olabilir).
 */
final class FfmpegBinaryResolver
{
    public static function resolve(): ?string
    {
        $configured = config('services.ffmpeg.binary');
        if (is_string($configured) && trim($configured) !== '' && is_executable(trim($configured))) {
            return trim($configured);
        }
        foreach (['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg'] as $path) {
            if (is_file($path) && is_executable($path)) {
                return $path;
            }
        }
        $finder = new ExecutableFinder;
        $found = $finder->find('ffmpeg', null, YtDlpBinaryResolver::systemExecutableDirectories());

        return (is_string($found) && $found !== '' && is_executable($found)) ? $found : null;
    }
}
