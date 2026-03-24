<?php

namespace App\Console\Commands;

use App\Models\Artist;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FetchArtistImagesGoogleCommand extends Command
{
    protected $signature = 'artists:fetch-images-google
                            {--force : Mevcut avatarı da yeniden ara ve indir}
                            {--dry-run : İndirme yapma; sadece bulunan URL’leri listele}
                            {--limit= : En fazla bu kadar sanatçı işle (günlük API kotası için)}
                            {--sleep=300 : Google istekleri arası bekleme (milisaniye)}';

    protected $description = 'Google Custom Search (görsel) ile onaylı TR sanatçı avatarı arar ve storage’a indirir; API anahtarı + Search Engine ID gerekir';

    public function handle(): int
    {
        $key = trim((string) config('services.google.custom_search_key'));
        $cx = trim((string) config('services.google.custom_search_cx'));

        if ($key === '') {
            $this->error('GOOGLE_CUSTOM_SEARCH_API_KEY boş: .env satırında = işaretinden sonra Cloud Console’daki API key olmalı (tırnak kullanmayın).');
        }
        if ($cx === '') {
            $this->error('GOOGLE_CUSTOM_SEARCH_ENGINE_ID boş: Programmable Search Engine “Search engine ID” (cx) değerini yazın.');
        }
        if ($key === '' || $cx === '') {
            $this->newLine();
            $this->line('Kurulum: Custom Search API etkin; https://programmablesearchengine.google.com/ → cx');
            $this->line('https://developers.google.com/custom-search/v1/overview');

            return self::FAILURE;
        }

        $force = (bool) $this->option('force');
        $dry = (bool) $this->option('dry-run');
        $limitOpt = $this->option('limit');
        $limit = ($limitOpt !== null && $limitOpt !== '') ? max(1, (int) $limitOpt) : null;
        $sleepMs = max(0, (int) $this->option('sleep'));

        Storage::disk('public')->makeDirectory('artists');

        $query = Artist::query()
            ->approved()
            ->notIntlImport()
            ->orderBy('id');

        if (! $force) {
            $query->where(function ($q) {
                $q->whereNull('avatar')
                    ->orWhere('avatar', 'like', '%picsum.photos%');
            });
        }

        if ($limit !== null) {
            $query->limit($limit);
        }

        $artists = $query->get();

        if ($artists->isEmpty()) {
            $this->info('İşlenecek sanatçı yok. Avatarı olanlar için --force kullanın.');

            return self::SUCCESS;
        }

        $this->info(($dry ? '[dry-run] ' : '').'İşlenecek sanatçı: '.$artists->count());
        if ($dry) {
            $this->warn('dry-run: dosya yazılmaz; Google istekleri yine yapılır (kota düşer).');
        }

        $apiErr = $this->probeCustomSearchJsonApi($key, $cx);
        if ($apiErr !== null) {
            $this->newLine();
            $this->error('Google Custom Search JSON API kullanılamıyor: '.$apiErr);
            $this->newLine();
            $this->warn('Bu hata genelde API projede kapalıyken veya üstte yanlış proje seçiliyken olur:');
            $this->line('• Cloud Console üst çubuğunda proje seçiciden, API anahtarını (sahnebul) oluşturduğunuz proje açık olsun.');
            $this->line('• APIs & Services → Library → "Custom Search API" → MANAGE/ENABLE: https://console.cloud.google.com/apis/library/customsearch.googleapis.com');
            $this->line('• APIs & Services → Enabled APIs listesinde "Custom Search API" görünmeli. Açtıktan sonra 1–2 dk bekleyin.');
            $this->line('• Credentials’taki API key bu projeye ait olmalı; başka projeden kopyalanmış anahtar çalışmaz.');
            $this->line('• Hâlâ aynı mesaj: Billing → projeye faturalandırma bağlayın (ücretsiz kota için bile gerekli olabiliyor).');

            return self::FAILURE;
        }

        $bar = $dry ? null : $this->output->createProgressBar($artists->count());
        $bar?->start();

        $ok = 0;
        foreach ($artists as $artist) {
            $candidates = $this->searchImageCandidateUrls($key, $cx, $artist->name);
            if ($candidates === []) {
                if ($this->output->isVerbose()) {
                    $this->warn("  Görsel URL bulunamadı: {$artist->name}");
                }
            } elseif ($dry) {
                $this->line('  '.$artist->name.' → '.$candidates[0]);
                $ok++;
            } elseif ($this->downloadFirstWorkingAvatar($artist, $candidates)) {
                $ok++;
            } elseif ($this->output->isVerbose()) {
                $this->warn("  İndirilemedi ({$artist->name}); aday: ".count($candidates));
            }

            $bar?->advance();
            if ($sleepMs > 0) {
                usleep($sleepMs * 1000);
            }
        }

        $bar?->finish();
        $this->newLine();
        if ($dry) {
            $this->info("Dry-run bitti. Bulunan görsel URL sayısı: {$ok} / {$artists->count()}.");
        } else {
            $this->info("Tamam. Avatar güncellenen: {$ok} / {$artists->count()}.");
        }

        return self::SUCCESS;
    }

    /**
     * Tek istekle JSON API erişimini doğrular (items boş olsa bile “access” hatası yoksa geçer).
     */
    private function probeCustomSearchJsonApi(string $apiKey, string $cx): ?string
    {
        $response = Http::timeout(20)->get('https://www.googleapis.com/customsearch/v1', [
            'key' => $apiKey,
            'cx' => $cx,
            'q' => 'portrait',
            'searchType' => 'image',
            'num' => 1,
        ]);

        $json = $response->json();
        if (! is_array($json)) {
            return 'Beklenmeyen yanıt (HTTP '.$response->status().').';
        }
        if (isset($json['error']['message']) && is_string($json['error']['message'])) {
            return $json['error']['message'];
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function searchImageCandidateUrls(string $apiKey, string $cx, string $artistName): array
    {
        $safeName = str_replace('"', ' ', $artistName);
        $queries = [
            $safeName.' şarkıcı sanatçı',
            $safeName.' müzik',
            '"'.$safeName.'" singer',
        ];

        foreach ($queries as $q) {
            $urls = $this->fetchImageUrlsForQuery($apiKey, $cx, $q);
            if ($urls !== []) {
                return $urls;
            }
        }

        return [];
    }

    /**
     * @return list<string>
     */
    private function fetchImageUrlsForQuery(string $apiKey, string $cx, string $q): array
    {
        $response = Http::timeout(25)->get('https://www.googleapis.com/customsearch/v1', [
            'key' => $apiKey,
            'cx' => $cx,
            'q' => $q,
            'searchType' => 'image',
            'num' => 10,
            'safe' => 'active',
        ]);

        $body = (string) $response->body();
        $json = $response->json();

        if (isset($json['error']) && is_array($json['error'])) {
            $msg = (string) ($json['error']['message'] ?? json_encode($json['error']));
            if ($this->output->isVerbose()) {
                $this->line('  Google API error: '.$msg);
            }
            Log::warning('Google Custom Search API error', ['message' => Str::limit($msg, 500)]);

            return [];
        }

        if (! $response->ok()) {
            if ($this->output->isVerbose()) {
                $this->line('  HTTP '.$response->status().': '.Str::limit($body, 200));
            }
            Log::debug('Google Custom Search HTTP hatası', ['status' => $response->status(), 'body' => Str::limit($body, 400)]);

            return [];
        }

        $items = $json['items'] ?? null;
        if (! is_array($items)) {
            return [];
        }

        $out = [];
        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            $link = $item['link'] ?? null;
            if (! is_string($link) || (! str_starts_with($link, 'http://') && ! str_starts_with($link, 'https://'))) {
                continue;
            }
            $mime = strtolower((string) ($item['mime'] ?? ''));
            if (str_contains($mime, 'svg')) {
                continue;
            }
            $img = $item['image'] ?? [];
            $w = is_array($img) ? (int) ($img['width'] ?? 0) : 0;
            $h = is_array($img) ? (int) ($img['height'] ?? 0) : 0;
            if ($w > 0 && $h > 0 && ($w < 80 || $h < 80)) {
                continue;
            }
            $out[] = $link;
        }

        return $out;
    }

    /**
     * @param  list<string>  $urls
     */
    private function downloadFirstWorkingAvatar(Artist $artist, array $urls): bool
    {
        foreach ($urls as $url) {
            if ($this->downloadAndSetAvatar($artist, $url)) {
                return true;
            }
        }

        return false;
    }

    private function downloadAndSetAvatar(Artist $artist, string $url): bool
    {
        try {
            $response = Http::timeout(35)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept' => 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                ])
                ->get($url);

            if (! $response->successful()) {
                return false;
            }

            $body = $response->body();
            if (strlen($body) < 200 || strlen($body) > 8_000_000) {
                return false;
            }

            if (! $this->looksLikeImageBody($body, $response->header('Content-Type'))) {
                return false;
            }

            $ext = $this->guessExtension($response->header('Content-Type'), $url);

            $filename = Str::slug($artist->name).'-g'.substr(md5($url), 0, 10).'.'.$ext;
            $path = 'artists/'.$filename;

            Storage::disk('public')->put($path, $body);
            $artist->update(['avatar' => $path]);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function looksLikeImageBody(string $body, ?string $contentType): bool
    {
        $ct = strtolower((string) $contentType);
        if (str_contains($ct, 'image/') && ! str_contains($ct, 'svg')) {
            return true;
        }

        $webp = strlen($body) > 12 && str_starts_with($body, 'RIFF') && substr($body, 8, 4) === 'WEBP';

        return str_starts_with($body, "\xFF\xD8\xFF")
            || str_starts_with($body, "\x89PNG\r\n\x1a\n")
            || str_starts_with($body, 'GIF8')
            || $webp;
    }

    private function guessExtension(?string $contentType, string $url): string
    {
        $ct = strtolower((string) $contentType);
        if (str_contains($ct, 'png')) {
            return 'png';
        }
        if (str_contains($ct, 'webp')) {
            return 'webp';
        }
        if (str_contains($ct, 'gif')) {
            return 'gif';
        }

        $path = parse_url($url, PHP_URL_PATH);
        if (is_string($path)) {
            $e = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            if (in_array($e, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
                return $e === 'jpeg' ? 'jpg' : $e;
            }
        }

        return 'jpg';
    }
}
