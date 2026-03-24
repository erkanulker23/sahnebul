<?php

namespace App\Console\Commands;

use App\Models\Artist;
use App\Models\ArtistClaimRequest;
use App\Models\ArtistMedia;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DedupeArtistsByNameCommand extends Command
{
    protected $signature = 'artists:dedupe-by-name
                            {--dry-run : Sadece rapor; silme / birleştirme yapma}';

    protected $description = 'Aynı ada sahip onaylı TR sanatçı kayıtlarını birleştirir (seeder + içe aktarma çiftleri); event / galeri / talepler korunur';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');

        $names = Artist::query()
            ->approved()
            ->notIntlImport()
            ->select('name')
            ->groupBy('name')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('name');

        if ($names->isEmpty()) {
            $this->info('Çift kayıt yok.');

            return self::SUCCESS;
        }

        $this->info('Çift isim sayısı: '.$names->count().($dry ? ' (dry-run)' : ''));

        $merged = 0;
        $deleted = 0;

        foreach ($names as $name) {
            $group = Artist::query()
                ->approved()
                ->notIntlImport()
                ->where('name', $name)
                ->orderBy('id')
                ->get();

            if ($group->count() < 2) {
                continue;
            }

            $keeper = $this->chooseKeeper($group);
            $duplicates = $group->filter(fn (Artist $a) => $a->id !== $keeper->id)->values();

            if ($dry) {
                $this->line("  [{$name}] tutulacak: #{$keeper->id} {$keeper->slug} | silinecek: ".$duplicates->pluck('id')->join(', '));

                continue;
            }

            foreach ($duplicates as $dup) {
                $canonicalSlug = $this->canonicalSlugToInherit($keeper, $dup);
                $this->mergeArtistInto($keeper, $dup);
                $dup->delete();
                if ($canonicalSlug !== null) {
                    $keeper->refresh();
                    $keeper->slug = $canonicalSlug;
                    $keeper->save();
                }
                $deleted++;
            }
            $merged++;
        }

        if ($dry) {
            $this->info('Dry-run bitti. Gerçek birleştirme için --dry-run kullanmayın.');
        } else {
            $this->info("Bitti. İşlenen isim grubu: {$merged}, silinen kayıt: {$deleted}.");
        }

        return self::SUCCESS;
    }

    /**
     * @param  Collection<int, Artist>  $group
     */
    private function chooseKeeper(Collection $group): Artist
    {
        return $group->sortBy([
            fn (Artist $a) => $a->spotify_id ? 0 : 1,
            fn (Artist $a) => preg_match('/-\d+$/', $a->slug) ? 1 : 0,
            fn (Artist $a) => $a->id,
        ])->first();
    }

    /**
     * İçe aktarılan kayıt slug'ı irem-derici-2 iken seeder kaydı irem-derici ise,
     * dup silindikten sonra kısa slug'ı koruyabilmek için hedef slug döner.
     */
    private function canonicalSlugToInherit(Artist $keeper, Artist $dup): ?string
    {
        if (! preg_match('/-\d+$/', (string) $keeper->slug)) {
            return null;
        }
        if (preg_match('/-\d+$/', (string) $dup->slug)) {
            return null;
        }

        return $dup->slug;
    }

    private function mergeArtistInto(Artist $keeper, Artist $dup): void
    {
        DB::transaction(function () use ($keeper, $dup) {
            $this->reassignEventArtists($keeper->id, $dup->id);

            ArtistMedia::query()->where('artist_id', $dup->id)->update(['artist_id' => $keeper->id]);

            $claims = ArtistClaimRequest::query()->where('artist_id', $dup->id)->get();
            foreach ($claims as $claim) {
                $exists = ArtistClaimRequest::query()
                    ->where('artist_id', $keeper->id)
                    ->where('user_id', $claim->user_id)
                    ->exists();
                if ($exists) {
                    $claim->delete();
                } else {
                    $claim->artist_id = $keeper->id;
                    $claim->save();
                }
            }

            $keeper->spotify_id = $keeper->spotify_id ?? $dup->spotify_id;
            $keeper->spotify_url = $keeper->spotify_url ?? $dup->spotify_url;
            $keeper->spotify_genres = $keeper->spotify_genres ?? $dup->spotify_genres;
            $keeper->spotify_albums = $keeper->spotify_albums ?? $dup->spotify_albums;
            $keeper->spotify_popularity = $keeper->spotify_popularity ?? $dup->spotify_popularity;
            $keeper->spotify_followers = $keeper->spotify_followers ?? $dup->spotify_followers;
            if (empty($keeper->avatar) || str_contains((string) $keeper->avatar, 'picsum.photos')) {
                if (! empty($dup->avatar) && ! str_contains((string) $dup->avatar, 'picsum.photos')) {
                    $keeper->avatar = $dup->avatar;
                }
            }
            if (empty(trim((string) $keeper->bio)) && ! empty(trim((string) $dup->bio))) {
                $keeper->bio = $dup->bio;
            }
            $keeper->save();
        });
    }

    private function reassignEventArtists(int $keeperId, int $dupId): void
    {
        $rows = DB::table('event_artists')->where('artist_id', $dupId)->get();
        foreach ($rows as $row) {
            $conflict = DB::table('event_artists')
                ->where('event_id', $row->event_id)
                ->where('artist_id', $keeperId)
                ->exists();
            if ($conflict) {
                DB::table('event_artists')->where('id', $row->id)->delete();
            } else {
                DB::table('event_artists')->where('id', $row->id)->update(['artist_id' => $keeperId]);
            }
        }
    }
}
