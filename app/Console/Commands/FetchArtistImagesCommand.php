<?php

namespace App\Console\Commands;

use App\Models\Artist;
use App\Services\SpotifyService;
use App\Services\WikimediaArtistImageResolver;
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

    /** İsteğe bağlı doğrudan URL (bilinen slug’lar). */
    protected array $imageUrls = [
        'muslum-gurses' => 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Muslum_Gurses.jpg',
        'duman' => 'https://upload.wikimedia.org/wikipedia/commons/0/02/Duman_Grubu.jpg',
        'teoman' => 'https://upload.wikimedia.org/wikipedia/commons/8/88/Teoman_P1360225.jpg',
        'mor-ve-otesi' => 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Mor_ve_%C3%96tesi%2C_Turkey%2C_Eurovision_2008.jpg',
        'sebnem-ferah' => 'https://upload.wikimedia.org/wikipedia/commons/7/70/Sebnem_Ferah_VF.jpg',
        'can-gox' => 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Can_Gox_-_27.6.17.jpg',
        'imer-demirer' => 'https://upload.wikimedia.org/wikipedia/commons/0/02/%C4%B0mer_Demirer.jpg',
        'ayna' => 'https://upload.wikimedia.org/wikipedia/commons/0/05/Erhan_G%C3%BClery%C3%BCz.jpg',
        'gripin' => 'https://upload.wikimedia.org/wikipedia/commons/4/49/Gripin_-_Kakt%C3%BCs_Kafe_Bar_-_31.12.09.jpg',
        'athena' => 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Athena_Band%28G%C3%B6khan_%C3%96zo%C4%9Fuz%29.JPG',
        'manga' => 'https://upload.wikimedia.org/wikipedia/commons/6/6d/MaNga_at_Eurovision_2010.jpg',
        'hayko-cepkin' => 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Hayko_Cepkin_2013.jpg',
        'sezen-aksu' => 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Sezen_Aksu_2013.jpg',
        'tarkan' => 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Tarkan_2006.jpg',
        'sertab-erener' => 'https://upload.wikimedia.org/wikipedia/commons/9/96/Sertab_Erener_2011.jpg',
        'pentagram' => 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Pentagram_%28band%29_2011.jpg',
        'neset-ertas' => 'https://upload.wikimedia.org/wikipedia/commons/4/42/Ne%C5%9Fet_Erta%C5%9F.jpg',
        'asik-veysel' => 'https://upload.wikimedia.org/wikipedia/commons/5/51/A%C5%9F%C4%B1k_Veysel.jpg',
        'orhan-gencebay' => 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Orhan_Gencebay_2011.jpg',
        'bulent-ersoy' => 'https://upload.wikimedia.org/wikipedia/commons/1/18/B%C3%BClent_Ersoy_2012.jpg',
        'zeki-muren' => 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Zeki_M%C3%BCren_2.jpg',
        'ajda-pekkan' => 'https://upload.wikimedia.org/wikipedia/commons/6/68/Ajda_Pekkan_2011.jpg',
        'ibrahim-tatlises' => 'https://upload.wikimedia.org/wikipedia/commons/3/3e/%C4%B0brahim_Tatl%C4%B1ses_2013.jpg',
        'ceza' => 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Ceza_2011.jpg',
    ];

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
            $url = $this->imageUrls[$artist->slug] ?? $this->resolveImageUrl($artist, $resolver, $spotify);

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
