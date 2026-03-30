<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Services\EventMediaImportFromUrlService;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Çerez / yt-dlp güncellemesinden sonra galeride kalan «yalnız Instagram bağlantısı» satırlarını tekrar indirmek için.
 */
class RetryInstagramPromoVideosCommand extends Command
{
    protected $signature = 'sahnebul:retry-instagram-promo-videos
                            {--event= : Yalnız bu etkinlik ID}
                            {--dry-run : Bağlantıları listele, içe aktarma çalıştırma}
                            {--include-stories : /stories/… satırlarını da dene (çoğu sunucuda çerez şart)}';

    protected $description = 'Etkinlik galerisinde Instagram embed var, video_path boş olan öğeler için MP4 indirmeyi yeniden dener';

    public function handle(EventMediaImportFromUrlService $importer): int
    {
        $eventId = $this->option('event');
        $dry = (bool) $this->option('dry-run');
        $includeStories = (bool) $this->option('include-stories');

        $query = Event::query()->whereNotNull('promo_gallery');
        if ($eventId !== null && $eventId !== '') {
            $query->whereKey((int) $eventId);
        }

        $events = $query->get();
        if ($events->isEmpty()) {
            $this->warn('İşlenecek etkinlik yok (promo_gallery dolu kayıt).');

            return self::SUCCESS;
        }

        $delay = (int) config('services.instagram.batch_delay_seconds', 0);
        $totalAttempts = 0;
        $ok = 0;

        foreach ($events as $event) {
            $items = $this->instagramItemsNeedingVideo($event, $includeStories);
            foreach ($items as $embedUrl) {
                $totalAttempts++;
                $label = $this->shortEventLabel($event).' — '.Str::limit($embedUrl, 72);
                if ($dry) {
                    $this->line('[dry-run] '.$label);

                    continue;
                }
                if ($delay > 0 && $totalAttempts > 1) {
                    sleep($delay);
                }
                $r = $importer->import($event->fresh(), $embedUrl, 'promo_video', true, false, 'video');
                if ($r['success']) {
                    /** @var array<string, mixed> $details */
                    $details = is_array($r['details'] ?? null) ? $r['details'] : [];
                    $saved = ($details['video_saved'] ?? false) === true;
                    if ($saved) {
                        $ok++;
                        $this->info('MP4: '.$label);
                    } else {
                        $this->warn('Başarılı ama video yok: '.$label.' — '.$r['message']);
                    }
                } else {
                    $this->error('Başarısız: '.$label.' — '.$r['message']);
                }
            }
        }

        if ($dry) {
            $this->newLine();
            $this->info("Dry-run: {$totalAttempts} satır yeniden denenebilir.");

            return self::SUCCESS;
        }

        $this->newLine();
        $this->info("Bitti. Yeni MP4 kaydı: {$ok} / {$totalAttempts} deneme.");

        return self::SUCCESS;
    }

    private function shortEventLabel(Event $event): string
    {
        $t = trim((string) ($event->title ?? ''));
        if ($t === '') {
            return '#'.$event->getKey();
        }

        return Str::limit($t, 48);
    }

    /**
     * @return list<string>
     */
    private function instagramItemsNeedingVideo(Model $event, bool $includeStories): array
    {
        $raw = $event->promo_gallery;
        if (! is_array($raw)) {
            return [];
        }
        $out = [];
        foreach (array_values($raw) as $item) {
            if (! is_array($item)) {
                continue;
            }
            $embed = trim((string) ($item['embed_url'] ?? ''));
            $vp = trim((string) ($item['video_path'] ?? ''));
            if ($embed === '' || ! str_contains($embed, 'instagram.com')) {
                continue;
            }
            if ($vp !== '') {
                continue;
            }
            if (str_contains($embed, '/stories/') && ! $includeStories) {
                continue;
            }
            $out[] = $embed;
        }

        return array_values(array_unique($out));
    }
}
