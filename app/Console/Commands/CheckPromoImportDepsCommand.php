<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\ExecutableFinder;

/**
 * Tanıtım galerisi Instagram / reel URL içe aktarımı için sunucu bağımlılıklarını listeler.
 */
class CheckPromoImportDepsCommand extends Command
{
    protected $signature = 'sahnebul:promo-import-deps';

    protected $description = 'yt-dlp ve ffmpeg kurulumunu kontrol eder (tanıtım video URL içe aktarımı)';

    public function handle(): int
    {
        $this->info('Tanıtım video URL içe aktarımı — sunucu bağımlılıkları');
        $this->newLine();

        $ytConfigured = config('services.ytdlp.binary');
        $ffConfigured = config('services.ffmpeg.binary');

        $finder = new ExecutableFinder;
        $ytPath = is_string($ytConfigured) && $ytConfigured !== '' && is_executable($ytConfigured)
            ? $ytConfigured
            : $finder->find('yt-dlp');
        $ffPath = is_string($ffConfigured) && $ffConfigured !== '' && is_executable($ffConfigured)
            ? $ffConfigured
            : $finder->find('ffmpeg');

        $this->line('yt-dlp: '.($ytPath ? "<fg=green>{$ytPath}</>" : '<fg=red>bulunamadı</>'));
        if (! $ytPath) {
            $this->line('  → .env YTDLP_BINARY=/tam/yol/yt-dlp veya PATH’e ekleyin (apt install yt-dlp, brew install yt-dlp)');
        }

        $this->line('ffmpeg: '.($ffPath ? "<fg=green>{$ffPath}</>" : '<fg=red>bulunamadı</>'));
        if (! $ffPath) {
            $this->line('  → .env FFMPEG_BINARY veya PATH (apt install ffmpeg, brew install ffmpeg)');
        }

        $cookies = config('services.ytdlp.cookies_file');
        if (is_string($cookies) && $cookies !== '') {
            $this->line('YTDLP_COOKIES_FILE: '.(is_readable($cookies) ? "<fg=green>okunuyor</> ({$cookies})" : "<fg=yellow>okunamıyor</> ({$cookies})"));
        } else {
            $this->line('YTDLP_COOKIES_FILE: <fg=gray>tanımlı değil (Instagram engelinde isteğe bağlı)</>');
        }

        $this->newLine();
        if ($ytPath && $ffPath) {
            $this->info('Gerekli araçlar görünüyor. Yine de Instagram engeli için yt-dlp sürümü ve çerez dosyası gerekebilir.');

            return self::SUCCESS;
        }

        $this->error('Eksik araçlar var; Instagram reel tam video indirmesi çoğu sunucuda çalışmaz.');

        return self::FAILURE;
    }
}
