<?php

namespace App\Console\Commands;

use App\Support\InstagramYtdlpCookiesPath;
use App\Support\YtDlpBinaryResolver;
use Illuminate\Console\Command;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

/**
 * Tanıtım galerisi Instagram / reel URL içe aktarımı için sunucu bağımlılıklarını listeler.
 */
class CheckPromoImportDepsCommand extends Command
{
    protected $signature = 'sahnebul:promo-import-deps {--warn-only : Eksik araç olsa da çıkış kodu 0 (deploy betiğinde kullanın)}';

    protected $description = 'yt-dlp ve ffmpeg kurulumunu kontrol eder (tanıtım video URL içe aktarımı)';

    public function handle(): int
    {
        $this->info('Tanıtım video URL içe aktarımı — sunucu bağımlılıkları');
        $this->newLine();

        $ffConfigured = config('services.ffmpeg.binary');

        $finder = new ExecutableFinder;
        $ytPath = YtDlpBinaryResolver::resolve();
        $ffPath = is_string($ffConfigured) && $ffConfigured !== '' && is_executable($ffConfigured)
            ? $ffConfigured
            : $finder->find('ffmpeg');

        $this->line('yt-dlp: '.($ytPath ? "<fg=green>{$ytPath}</>" : '<fg=red>bulunamadı</>'));
        if (! $ytPath) {
            $this->line('  → .env YTDLP_BINARY=/tam/yol/yt-dlp veya PATH’e ekleyin (apt install yt-dlp, brew install yt-dlp)');
        } elseif (is_string($ytPath) && $ytPath !== '') {
            $verProcess = new Process([$ytPath, '--version']);
            $verProcess->setTimeout(15);
            $verProcess->run();
            $ver = trim($verProcess->getOutput());
            if ($ver !== '') {
                $this->line('  sürüm: '.$ver);
                if (preg_match('/^(\d{4})\.(\d{2})\.(\d{2})/', $ver, $m) && (int) $m[1] < 2024) {
                    $this->warn('  → Sürüm çok eski; Instagram çıkarıcıları sık güncellenir. apt paketi yetmez: pipx install yt-dlp veya pip install -U yt-dlp; YTDLP_BINARY yolunu güncelleyin.');
                }
            }
        }

        $this->line('ffmpeg: '.($ffPath ? "<fg=green>{$ffPath}</>" : '<fg=red>bulunamadı</>'));
        if (! $ffPath) {
            $this->line('  → .env FFMPEG_BINARY veya PATH (apt install ffmpeg, brew install ffmpeg)');
        }

        $resolved = InstagramYtdlpCookiesPath::resolve();
        if ($resolved !== null) {
            $label = InstagramYtdlpCookiesPath::hasUploadedFile() && $resolved === InstagramYtdlpCookiesPath::uploadedAbsolutePath()
                ? 'panel yüklemesi'
                : '.env YTDLP_COOKIES_FILE';
            $this->line('Aktif cookies dosyası (<fg=green>okunuyor</>): <fg=cyan>'.$label.'</> → '.$resolved);
        } else {
            $env = config('services.ytdlp.cookies_file');
            if (is_string($env) && trim($env) !== '') {
                $this->line('YTDLP_COOKIES_FILE: <fg=yellow>tanımlı ama okunamıyor</> — panelden yükleyin veya yolu düzeltin.');
            } elseif (InstagramYtdlpCookiesPath::hasUploadedFile()) {
                $this->line('Panel çerez dosyası: <fg=yellow>var ama okunamıyor</> (izinler).');
            } else {
                $this->line('Çerez dosyası: <fg=gray>yok</> — admin menü: «Instagram çerez (video)» veya .env YTDLP_COOKIES_FILE');
            }
        }

        $extraArgs = config('services.ytdlp.extra_args_json');
        $this->line('YTDLP_EXTRA_ARGS_JSON: '.(is_array($extraArgs) && $extraArgs !== []
            ? '<fg=cyan>'.count($extraArgs).' ek argv</>'
            : '<fg=gray>tanımlı değil</>'));

        $igCookie = config('services.instagram.fetch_cookies');
        $this->line('INSTAGRAM_FETCH_COOKIES: '.(is_string($igCookie) && trim($igCookie) !== ''
            ? '<fg=green>tanımlı</> (Laravel’in Instagram HTML istekleri; HTTP 429 azaltmaya yardımcı olabilir)'
            : '<fg=gray>tanımlı değil</>'));

        $this->newLine();
        if ($ytPath && $ffPath) {
            $this->info('Gerekli araçlar görünüyor. Hikâye (/stories/…) ve giriş duvarı için YTDLP_COOKIES_FILE sık gerekir; yt-dlp’yi sık güncelleyin.');

            return self::SUCCESS;
        }

        $this->error('Eksik araçlar var; Instagram reel tam video indirmesi çoğu sunucuda çalışmaz.');

        return $this->option('warn-only') ? self::SUCCESS : self::FAILURE;
    }
}
