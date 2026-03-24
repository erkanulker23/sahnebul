<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SpotifyDiagnoseCommand extends Command
{
    protected $signature = 'spotify:diagnose';

    protected $description = 'Spotify token ve Web API’yi adım adım dener; HTTP durumunu ve kısa yanıt gövdesini terminale yazar';

    public function handle(): int
    {
        $id = trim((string) config('services.spotify.client_id'));
        $secret = trim((string) config('services.spotify.client_secret'));

        if ($id === '' || $secret === '') {
            $this->error('SPOTIFY_CLIENT_ID veya SPOTIFY_CLIENT_SECRET boş (config/services veya .env).');

            return self::FAILURE;
        }

        $this->line('Client ID önizleme: '.substr($id, 0, 6).'… (uzunluk: '.strlen($id).')');
        $this->line('Client secret uzunluk: '.strlen($secret).' karakter');
        $this->newLine();

        Cache::forget('spotify_access_token');

        try {
            $tokenRes = Http::timeout(25)
                ->asForm()
                ->withBasicAuth($id, $secret)
                ->post('https://accounts.spotify.com/api/token', [
                    'grant_type' => 'client_credentials',
                ]);
        } catch (\Throwable $e) {
            $this->error('accounts.spotify.com bağlantı hatası: '.$e->getMessage());
            $this->warn('SSL/proxy veya DNS sorunu olabilir; aynı makinede: curl -I https://accounts.spotify.com');

            return self::FAILURE;
        }

        $this->line('POST https://accounts.spotify.com/api/token → HTTP '.$tokenRes->status());

        if (! $tokenRes->ok()) {
            $this->error('Access token alınamadı.');
            $this->line(Str::limit((string) $tokenRes->body(), 800));
            $this->newLine();
            $this->warn('Sık nedenler:');
            $this->warn(' • Developer Dashboard’daki Client ID ile Client Secret yer değiştirmiş olabilir (sırayı kontrol edin).');
            $this->warn(' • Secret yenilendiyse .env’deki SPOTIFY_CLIENT_SECRET güncel değil.');
            $this->warn(' • .env satırında fazladan tırnak/boşluk (trim genelde yeterli; yine de kopyalarken dikkat).');

            return self::FAILURE;
        }

        $access = $tokenRes->json('access_token');
        if (! is_string($access) || $access === '') {
            $this->error('Yanıtta access_token yok veya boş.');
            $this->line(Str::limit((string) $tokenRes->body(), 500));

            return self::FAILURE;
        }

        $this->info('Access token alındı ('.strlen($access).' karakter).');
        $this->newLine();

        $testId = '24hR7ZaxdlZLaTnzZOlwMh';

        try {
            $apiRes = Http::timeout(25)
                ->withToken($access)
                ->acceptJson()
                ->get('https://api.spotify.com/v1/artists', [
                    'ids' => $testId,
                ]);
        } catch (\Throwable $e) {
            $this->error('api.spotify.com bağlantı hatası: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->line('GET https://api.spotify.com/v1/artists?ids=… → HTTP '.$apiRes->status());

        if (! $apiRes->ok()) {
            $this->error('Web API hata yanıtı:');
            $body = (string) $apiRes->body();
            $this->line(Str::limit($body, 800));
            if ($apiRes->status() === 403 && str_contains(strtolower($body), 'premium')) {
                $this->newLine();
                $this->warn('Spotify Developer Dashboard’da uygulama genelde "development mode" başlar.');
                $this->warn('Bu modda Web API’nin çalışması için uygulamayı oluşturan Spotify hesabında aktif Premium abonelik gerekir.');
                $this->warn('Çözüm: Premium’lu bir hesapla yeni app oluşturun veya mevcut hesaba Premium ekleyin; abonelik yeni ise birkaç saat sürebilir.');
                $this->line('Bkz. https://developer.spotify.com/documentation/web-api/concepts/quota-modes');
            }

            return self::FAILURE;
        }

        $artists = $apiRes->json('artists');
        $first = is_array($artists) && isset($artists[0]) && is_array($artists[0]) ? $artists[0] : null;

        if ($first === null || empty($first['id'])) {
            $this->error('Yanıtta beklenen sanatçı nesnesi yok (geçersiz ID veya boş dizi).');
            $this->line(Str::limit((string) $apiRes->body(), 600));

            return self::FAILURE;
        }

        $name = $first['name'] ?? '?';
        $this->info("Spotify Web API çalışıyor. Örnek sanatçı: {$name} (id: {$first['id']})");

        return self::SUCCESS;
    }
}
