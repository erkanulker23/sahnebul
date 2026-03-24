<?php

namespace App\Console\Commands;

use App\Services\EventArtistLinkResolver;
use Illuminate\Console\Command;

class RepairEventArtistLinksCommand extends Command
{
    protected $signature = 'events:repair-artist-links {--dry-run : Yalnızca rapor; veritabanına yazılmaz}';

    protected $description = 'Sanatçısı olmayan yayınlanmış etkinlikleri başlıktan eşleşen onaylı sanatçıya bağlar';

    public function handle(EventArtistLinkResolver $resolver): int
    {
        $dry = (bool) $this->option('dry-run');
        if ($dry) {
            $this->warn('Dry run — kayıt güncellenmeyecek.');
        }

        $result = $resolver->repairAllPublishedWithoutArtists($dry);
        $this->info("Bağlanan etkinlik: {$result['attached']}");
        $this->info("Başlıktan eşleşmeyen: {$result['unmatched']}");

        return self::SUCCESS;
    }
}
