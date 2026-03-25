<?php

namespace App\Console\Commands;

use App\Models\Artist;
use App\Services\SpotifyService;
use App\Services\WikimediaArtistImageResolver;
use App\Support\SeededArtistImageUrls;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FetchArtistImagesCommand extends Command
{
    protected $signature = 'artists:fetch-images
                            {--force : Mevcut avatarı da yeniden indir}
                            {--limit= : En fazla işlenecek sanatçı sayısı}
                            {--sleep=200 : İstekler arası bekleme (ms; Wikimedia yükünü azaltır)}';

    protected $description = 'Önce Spotify albüm kapağı (spotify_id + API), yoksa Wikimedia. --force tüm kayıtları yeniden işler';

    public function handle(WikimediaArtistImageResolver $resolver, SpotifyService $spotify): int
    {
        $this->info('Spotify albüm kapağı (varsa) veya Wikimedia ile sanatçı görselleri indiriliyor (ada göre A→Z)…');
        Storage::disk('public')->makeDirectory('artists');

        $force = (bool) $this->option('force');
        $limitOpt = $this->option('limit');
        $limit = ($limitOpt !== null && $limitOpt !== '') ? max(1, (int) $limitOpt) : null;
        $sleepMs = max(0, (int) $this->option('sleep'));

        $query = Artist::query()->orderBy('name')->orderBy('id');

        if (! $force) {
            $query->approved()
                ->notIntlImport()
                ->where(function ($q) {
                    $q->whereNull('avatar')
                        ->orWhere('avatar', 'like', '%picsum.photos%');
                });
        }
        // --force: filtre yok; tüm kayıtlar (onay + INT içe aktarma dahil)

        if ($limit !== null) {
            $query->limit($limit);
        }

        $artists = $query->get();

        if ($artists->isEmpty()) {
            $this->info('İşlenecek sanatçı yok. Tüm kayıtlar için --force kullanın.');

            return self::SUCCESS;
        }

        $bar = $this->output->createProgressBar($artists->count());
        $bar->start();

        $updated = 0;
        foreach ($artists as $artist) {
            $url = SeededArtistImageUrls::bySlug()[$artist->slug] ?? $this->resolveImageUrl($artist, $resolver, $spotify);

            if ($url !== null && $this->downloadAndSave($artist, $url)) {
                $updated++;
            }

            $bar->advance();
            if ($sleepMs > 0) {
                usleep($sleepMs * 1000);
            }
        }

        $bar->finish();
        $this->newLine();
        $this->info("Bitti. Güncellenen avatar: {$updated} / {$artists->count()}.");

        return self::SUCCESS;
    }

    private function resolveImageUrl(Artist $artist, WikimediaArtistImageResolver $resolver, SpotifyService $spotify): ?string
    {
        $sid = $artist->spotify_id;
        if (is_string($sid) && $sid !== '' && $spotify->spotifyArtistMatchesLocalName($sid, $artist->name)) {
            $albumCover = $spotify->getArtistAlbumCoverImageUrl($sid);
            if ($albumCover !== null) {
                return $albumCover;
            }
            $profile = $spotify->getArtistImageUrl($sid);
            if ($profile !== null) {
                return $profile;
            }
        }

        return $resolver->resolveImageUrl($artist->name, $artist->country_code);
    }

    protected function downloadAndSave(Artist $artist, string $url): bool
    {
        try {
            $response = Http::timeout(45)
                ->withHeaders([
                    'User-Agent' => config('services.wikidata.user_agent', 'Sahnebul/1.0 (https://sahnebul.com)'),
                ])
                ->get($url);

            if (! $response->successful()) {
                return false;
            }

            $body = $response->body();
            if (strlen($body) < 100) {
                return false;
            }

            $ext = pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'jpg';
            $ext = strtolower($ext);
            if (! in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
                $ext = 'jpg';
            }
            if ($ext === 'jpeg') {
                $ext = 'jpg';
            }

            $filename = Str::slug($artist->name).'-'.substr(md5($url), 0, 8).'.'.$ext;
            $path = 'artists/'.$filename;

            Storage::disk('public')->put($path, $body);
            $artist->update(['avatar' => $path]);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }
}
