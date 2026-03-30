<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Services\EventMediaImportFromUrlService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class PurgeEndedEventPromoMediaCommand extends Command
{
    protected $signature = 'events:purge-ended-promo-media {--dry-run : Yalnızca sayım}';

    protected $description = 'Bitmiş etkinliklerin tanıtım video/görsel dosyalarını diskten ve kayıttan kaldırır (etkinlik satırı kalır).';

    public function handle(EventMediaImportFromUrlService $importer): int
    {
        if (! Schema::hasTable('events')) {
            return self::SUCCESS;
        }

        $dry = $this->option('dry-run');
        $count = 0;

        Event::query()
            ->where(function ($q) {
                $q->whereNotNull('promo_gallery')
                    ->orWhereNotNull('promo_video_path')
                    ->orWhereNotNull('promo_embed_url');
            })
            ->orderBy('id')
            ->chunkById(100, function ($events) use ($importer, $dry, &$count) {
                foreach ($events as $event) {
                    if (! $event instanceof Event) {
                        continue;
                    }
                    if (! $event->shouldPurgePromoMediaBySchedule()) {
                        continue;
                    }
                    $count++;
                    if ($dry) {
                        $this->line("Dry-run: etkinlik #{$event->id} — {$event->title}");

                        continue;
                    }
                    $importer->purgePromoGallery($event->fresh());
                    $event->refresh();
                    if (Schema::hasColumn('events', 'promo_show_on_venue_profile_posts')) {
                        $event->forceFill([
                            'promo_show_on_venue_profile_posts' => false,
                            'promo_show_on_venue_profile_videos' => false,
                        ])->saveQuietly();
                    }
                    if (Schema::hasColumn('events', 'promo_show_on_artist_profile_posts')) {
                        $event->forceFill([
                            'promo_show_on_artist_profile_posts' => false,
                            'promo_show_on_artist_profile_videos' => false,
                        ])->saveQuietly();
                    }
                }
            });

        if ($dry) {
            $this->info("Dry-run: {$count} etkinlik temizlenecek.");

            return self::SUCCESS;
        }

        $this->info("Tanıtım medyası temizlenen etkinlik sayısı: {$count}.");

        return self::SUCCESS;
    }
}
