<?php

namespace App\Support;

use Symfony\Component\Process\ExecutableFinder;

/**
 * PHP-FPM ve CLI’da PATH farklı olabildiği için yt-dlp tam yolunu arar (EventMediaImportFromUrlService ile aynı mantık).
 */
final class YtDlpBinaryResolver
{
    public static function resolve(): ?string
    {
        foreach (self::absolutePathCandidates() as $path) {
            if (is_file($path) && is_executable($path)) {
                return $path;
            }
        }

        $finder = new ExecutableFinder;
        $found = $finder->find('yt-dlp', null, self::searchDirectories());

        return (is_string($found) && $found !== '' && is_executable($found)) ? $found : null;
    }

    /**
     * ffmpeg vb. ikililer için PATH benzeri dizin listesi.
     *
     * @return list<string>
     */
    public static function systemExecutableDirectories(): array
    {
        return self::searchDirectories();
    }

    /** @return list<string> */
    private static function searchDirectories(): array
    {
        $dirs = [];

        $extra = config('services.ytdlp.extra_search_paths');
        if (is_string($extra) && trim($extra) !== '') {
            foreach (preg_split('/[,:|\s]+/', $extra, -1, PREG_SPLIT_NO_EMPTY) as $segment) {
                $segment = trim($segment);
                if ($segment !== '') {
                    $dirs[] = self::expandHomePrefix($segment);
                }
            }
        }

        $dirs = array_merge($dirs, [
            '/usr/local/bin',
            '/usr/bin',
            '/bin',
            '/opt/homebrew/bin',
            '/snap/bin',
            '/var/snap/bin',
        ]);

        $home = getenv('HOME');
        if (is_string($home) && $home !== '') {
            $dirs[] = $home.DIRECTORY_SEPARATOR.'.local'.DIRECTORY_SEPARATOR.'bin';
        }

        if (function_exists('posix_geteuid') && function_exists('posix_getpwuid')) {
            $pw = @posix_getpwuid(posix_geteuid());
            if (is_array($pw) && isset($pw['dir']) && is_string($pw['dir']) && $pw['dir'] !== '') {
                $dirs[] = rtrim($pw['dir'], '/').DIRECTORY_SEPARATOR.'.local'.DIRECTORY_SEPARATOR.'bin';
            }
        }

        /** Forge: FPM kullanıcısı www-data iken forge’un pipx yolu (okuma+x bit) */
        if (PHP_OS_FAMILY !== 'Windows' && is_dir('/home/forge/.local/bin')) {
            $dirs[] = '/home/forge/.local/bin';
        }

        $pathEnv = getenv('PATH');
        if (is_string($pathEnv) && $pathEnv !== '') {
            foreach (explode(PATH_SEPARATOR, $pathEnv) as $segment) {
                $segment = trim($segment);
                if ($segment !== '') {
                    $dirs[] = $segment;
                }
            }
        }

        /** @var list<string> $unique */
        $unique = array_values(array_unique(array_filter($dirs, fn (string $d) => $d !== '')));

        return $unique;
    }

    /**
     * @return list<string>
     */
    private static function absolutePathCandidates(): array
    {
        $name = PHP_OS_FAMILY === 'Windows' ? 'yt-dlp.exe' : 'yt-dlp';
        $out = [];

        $configured = config('services.ytdlp.binary');
        if (is_string($configured) && trim($configured) !== '') {
            $raw = trim($configured);
            $raw = trim($raw, '"\'');
            if ($raw !== '') {
                $out[] = self::expandHomePrefix($raw);
            }
        }

        foreach (self::searchDirectories() as $dir) {
            $out[] = rtrim($dir, '/\\').DIRECTORY_SEPARATOR.$name;
        }

        return array_values(array_unique($out));
    }

    private static function expandHomePrefix(string $path): string
    {
        if ($path === '' || $path[0] !== '~') {
            return $path;
        }

        if (! str_starts_with($path, '~/')) {
            return $path;
        }

        $home = getenv('HOME');
        if (! is_string($home) || $home === '') {
            if (function_exists('posix_geteuid') && function_exists('posix_getpwuid')) {
                $pw = @posix_getpwuid(posix_geteuid());
                if (is_array($pw) && isset($pw['dir']) && is_string($pw['dir']) && $pw['dir'] !== '') {
                    $home = $pw['dir'];
                }
            }
        }

        if (! is_string($home) || $home === '') {
            return $path;
        }

        return $home.substr($path, 1);
    }
}
