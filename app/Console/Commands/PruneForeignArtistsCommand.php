<?php

namespace App\Console\Commands;

use App\Models\Artist;
use Database\Seeders\ArtistSeeder;
use Illuminate\Console\Command;

/**
 * Türkiye dışı / eski genel Wikidata içe aktarımlarını temizler; seeder + Türkiye kaynaklı kayıtları TR işaretler.
 */
class PruneForeignArtistsCommand extends Command
{
    protected $signature = 'artists:prune-foreign {--dry-run : Silinecekleri listele, silme}';

    protected $description = 'Türk sanatçı dışındaki (country INT, eski Wikidata havuzu vb.) kayıtları kaldırır';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');

        $this->markTurkish();

        $toDelete = Artist::query()
            ->where(function ($q) {
                $q->where('country_code', 'INT')
                    ->orWhere(function ($q2) {
                        $q2->where('bio', 'like', '%Kaynak: Wikidata%')
                            ->where('bio', 'not like', '%Türkiye ile ilişkili%');
                    });
            })
            ->get(['id', 'name', 'slug', 'country_code', 'bio']);

        if ($toDelete->isEmpty()) {
            $this->info('Silinecek yabancı / eski havuz kaydı yok.');

            return self::SUCCESS;
        }

        $this->warn('Kaldırılacak: '.$toDelete->count().' kayıt.');
        foreach ($toDelete->take(30) as $a) {
            $this->line("  — {$a->name} ({$a->slug})");
        }
        if ($toDelete->count() > 30) {
            $this->line('  …');
        }

        if ($dry) {
            $this->info('Dry-run: silinmedi.');

            return self::SUCCESS;
        }

        $ids = $toDelete->pluck('id');
        Artist::query()->whereIn('id', $ids)->delete();
        $this->info('Silindi: '.$ids->count().' sanatçı.');

        return self::SUCCESS;
    }

    private function markTurkish(): void
    {
        Artist::query()->whereNotNull('user_id')->update(['country_code' => 'TR']);

        Artist::query()
            ->whereIn('slug', ArtistSeeder::seededSlugs())
            ->update(['country_code' => 'TR']);

        Artist::query()
            ->where('bio', 'like', '%Türkiye ile ilişkili%')
            ->update(['country_code' => 'TR']);

        Artist::query()
            ->where('bio', 'like', 'MusicBrainz etiketleri:%')
            ->update(['country_code' => 'TR']);
    }
}
