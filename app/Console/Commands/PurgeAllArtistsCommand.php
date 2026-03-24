<?php

namespace App\Console\Commands;

use App\Models\Artist;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PurgeAllArtistsCommand extends Command
{
    protected $signature = 'artists:purge-all {--force : Onay sormadan sil}';

    protected $description = 'Tüm sanatçı kayıtlarını siler (event_artists, artist_media, claim istekleri veritabanı cascade ile temizlenir)';

    public function handle(): int
    {
        if (! $this->option('force')) {
            if (! $this->confirm('Tüm sanatçılar silinecek; etkinlikler kalır, sanatçı bağları sıfırlanır. Devam?')) {
                return self::FAILURE;
            }
        }

        $n = Artist::query()->count();

        DB::transaction(fn () => Artist::query()->delete());

        $this->info("Silinen sanatçı: {$n}");

        return self::SUCCESS;
    }
}
