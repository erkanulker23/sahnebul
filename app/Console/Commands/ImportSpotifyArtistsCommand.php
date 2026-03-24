<?php

namespace App\Console\Commands;

use App\Models\Artist;
use App\Models\ArtistMedia;
use App\Services\MusicBrainzClient;
use App\Services\SpotifyArtistImporter;
use App\Services\SpotifyService;
use App\Services\WikidataSparqlClient;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class ImportSpotifyArtistsCommand extends Command
{
    protected $signature = 'spotify:import-artists
                            {--max=500 : İçe aktarılacak / güncellenecek en fazla sanatçı}
                            {--pool=3000 : (Spotify API) Keşif aşamasında toplanacak en fazla benzersiz ID}
                            {--with-albums : Spotify’dan albüm önizlemesi (API + zenginleştirme)}
                            {--with-gallery : Albüm kapaklarından galeri (artist_media; boşsa doldurur)}
                            {--force-gallery : Mevcut galeriyi silip yeniden oluşturur}
                            {--with-musicbrainz : Wikidata sonrası MusicBrainz ile eksikleri tamamlar (yavaş; çoğu kurulumda kapalı)}
                            {--skip-enrich : Spotify anahtarı varken Wikidata sonrası zenginleştirmeyi atla}
                            {--browse-only : (Spotify API) Yalnızca browse / çalma listeleri keşfi}
                            {--search-only : (Spotify API) Yalnızca arama sorguları keşfi}
                            {--musicbrainz : Spotify API varken bile Wikidata+MB yolunu kullan}
                            {--mb-query= : MusicBrainz Lucene sorgusu (örn. country:TR)}
                            {--enrich-only : İçe aktarma yapmadan yalnızca TR Spotify zenginleştirmesi (isim→ID + toplu güncelleme)}
                            {--skip-link-by-name : spotify_id boş TR kayıtlarında Spotify’da isim aramasıyla ID atama}
                            {--link-by-name-limit=500 : İsimle bağlanacak en fazla sanatçı (0 = atla)}';

    protected $description = 'Türk sanatçı içe aktarma: Wikidata (P2207+P18) + isteğe MB; Spotify API varsa görsel/albüm/galeri zenginleştirme';

    public function handle(SpotifyService $spotify, SpotifyArtistImporter $importer, MusicBrainzClient $musicbrainz, WikidataSparqlClient $wikidata): int
    {
        if ($this->option('enrich-only')) {
            $hasSpotify = (bool) (config('services.spotify.client_id') && config('services.spotify.client_secret'));
            if (! $hasSpotify) {
                $this->error('SPOTIFY_CLIENT_ID ve SPOTIFY_CLIENT_SECRET .env içinde tanımlı olmalı.');

                return self::FAILURE;
            }
            $this->info('Yalnızca TR sanatçı Spotify zenginleştirmesi (isteğe bağlı isim→ID bağlama).');
            if (! $this->maybeEnrichWithSpotify($spotify)) {
                return self::FAILURE;
            }

            return self::SUCCESS;
        }

        $max = max(1, (int) $this->option('max'));
        $forceMb = (bool) $this->option('musicbrainz');
        $hasSpotify = (bool) (config('services.spotify.client_id') && config('services.spotify.client_secret'));

        if ($forceMb || ! $hasSpotify) {
            if (! $hasSpotify && ! $forceMb) {
                $this->warn('SPOTIFY_CLIENT_ID/SECRET yok — Wikidata (+ isteğe MusicBrainz). Anahtar eklerseniz içe aktarma sonunda Spotify ile görsel ve albümler doldurulur.');
            }

            return $this->importViaWikidataAndMusicBrainz($spotify, $musicbrainz, $wikidata, $max);
        }

        return $this->importViaSpotifyApi($spotify, $importer, $max);
    }

    /**
     * MusicBrainz’te çoğu sanatçıda Spotify URL’si yok; önce Wikidata P2207 (+ isteğe P18 görsel) ile ID alınır.
     */
    private function importViaWikidataAndMusicBrainz(SpotifyService $spotify, MusicBrainzClient $client, WikidataSparqlClient $wikidata, int $max): int
    {
        $imported = 0;

        $this->info('1) Wikidata: Türkiye ile ilişkili kayıtlar (P2207; isteğe P18 görsel).');
        $rows = $wikidata->collectTurkishSpotifyArtists($max);
        if (count($rows) < $max) {
            $this->warn('Wikidata’da bu kriterle en fazla '.count($rows).' eşleşme bulundu (OFFSET ile tükenmiş olabilir).');
        }

        foreach ($rows as $row) {
            if ($imported >= $max) {
                break;
            }
            $sid = $row['spotify_id'];
            $url = 'https://open.spotify.com/artist/'.$sid;
            $avatar = $row['image'] ?? null;
            $this->upsertFromNormalized(
                spotifyId: $sid,
                name: $row['label'],
                spotifyUrl: $url,
                genres: [],
                primaryGenre: null,
                bioTemplate: 'Kaynak: Wikidata (Türkiye ile ilişkili kayıt; Spotify sanatçı ID).',
                avatar: $avatar,
                popularity: null,
                followers: null,
                albums: null,
                countryCode: 'TR',
            );
            $imported++;
        }

        $this->info("Wikidata ile eklenen/güncellenen: {$imported}.");

        $withMb = (bool) $this->option('with-musicbrainz');

        if ($imported >= $max || ! $withMb) {
            if (! $withMb && $imported < $max) {
                $this->warn('MusicBrainz atlandı (yalnızca Türkiye Wikidata havuzu; açmak için --with-musicbrainz).');
            }
            if (! $this->maybeEnrichWithSpotify($spotify)) {
                $this->warn('Spotify zenginleştirme atlandı (Web API reddetti). php artisan spotify:diagnose');
            }

            return self::SUCCESS;
        }

        $remaining = $max - $imported;
        $this->info("2) MusicBrainz: kalan {$remaining} için tür etiketi + Spotify URL (yavaş, ~1 istek/sn)…");

        $mbAdded = $this->importViaMusicBrainzOnly($client, $remaining);

        $total = $imported + $mbAdded;
        $this->info("MusicBrainz ile ek: {$mbAdded}. Toplam: {$total}.");

        if (! $this->maybeEnrichWithSpotify($spotify)) {
            $this->warn('Spotify zenginleştirme atlandı (Web API reddetti). php artisan spotify:diagnose');
        }

        return self::SUCCESS;
    }

    private function maybeEnrichWithSpotify(SpotifyService $spotify): bool
    {
        if ((bool) $this->option('skip-enrich')) {
            return true;
        }
        if (! config('services.spotify.client_id') || ! config('services.spotify.client_secret')) {
            return true;
        }

        $withAlbums = (bool) $this->option('with-albums');
        $withGallery = (bool) $this->option('with-gallery');
        $forceGallery = (bool) $this->option('force-gallery');

        $probe = $spotify->probeWebApiCatalog();
        if (! $probe['ok']) {
            $status = $probe['http_status'] !== null ? (string) $probe['http_status'] : '?';
            $this->error("Spotify Web API kullanılamıyor (HTTP {$status}).");
            if (! empty($probe['hint'])) {
                $this->line($probe['hint']);
            }
            $this->newLine();
            $this->warn('Ayrıntı: php artisan spotify:diagnose');

            return false;
        }

        $this->info('Spotify Web API: Türkiye (TR) sanatçılarında görsel / tür / albüm zenginleştirmesi…');

        if (! $this->option('skip-link-by-name')) {
            $linkLimit = max(0, (int) $this->option('link-by-name-limit'));
            if ($linkLimit > 0) {
                $linked = $this->linkTrArtistsMissingSpotifyId($spotify, $linkLimit);
                if ($linked > 0) {
                    $this->info("İsim aramasıyla spotify_id atanan: {$linked} sanatçı.");
                }
            }
        }

        $n = $this->enrichTurkishArtistsWithSpotify($spotify, $withAlbums, $withGallery, $forceGallery);
        $this->info("Zenginleştirilen toplu güncelleme: {$n} sanatçı.");
        if ($n === 0) {
            $withSid = Artist::query()->where('country_code', 'TR')->whereNotNull('spotify_id')->count();
            if ($withSid > 0) {
                $this->warn("Spotify API’den sanatçı verisi alınamadı (veritabanında {$withSid} TR kayıtta spotify_id var). SPOTIFY_CLIENT_ID/SECRET, php artisan config:clear ve ağ/rate limit kontrol edin.");
            } else {
                $this->warn('Spotify zenginleştirme 0 kayıt. TR sanatçılarda spotify_id yok; seeder/Spotify ID atayın veya --link-by-name-limit kullanın.');
            }
        }

        return true;
    }

    /**
     * spotify_id olmayan onaylı TR sanatçıları için Spotify aramasıyla ID atar (çakışan ID başka kayıtta varsa atlanır).
     */
    private function linkTrArtistsMissingSpotifyId(SpotifyService $spotify, int $limit): int
    {
        $artists = Artist::query()
            ->where('status', 'approved')
            ->where('country_code', 'TR')
            ->whereNull('spotify_id')
            ->orderBy('id')
            ->limit($limit)
            ->get(['id', 'name', 'slug', 'social_links']);

        $linked = 0;
        foreach ($artists as $artist) {
            $sid = $this->resolveSpotifyArtistIdByName($spotify, $artist->name);
            if ($sid === null) {
                continue;
            }
            if (Artist::query()->where('spotify_id', $sid)->where('id', '!=', $artist->id)->exists()) {
                $this->warn("Spotify ID başka kayıtta: {$artist->name} ({$sid}) — atlandı.");

                continue;
            }
            $url = 'https://open.spotify.com/artist/'.$sid;
            $social = $artist->social_links ?? [];
            if (! is_array($social)) {
                $social = [];
            }
            $social['spotify'] = $url;
            $artist->spotify_id = $sid;
            $artist->spotify_url = $url;
            $artist->social_links = $social;
            $artist->save();
            $linked++;
            $this->line("  Bağlandı: {$artist->name} → {$sid}");
            usleep(120_000);
        }

        return $linked;
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    private function resolveSpotifyArtistIdByName(SpotifyService $spotify, string $name): ?string
    {
        $items = $spotify->searchArtists($name, 15);
        if ($items === []) {
            return null;
        }

        $norm = static function (string $s): string {
            $s = preg_replace('/\s+/u', ' ', trim($s)) ?? '';

            return mb_strtolower($s, 'UTF-8');
        };
        $want = $norm($name);

        foreach ($items as $item) {
            $n = $item['name'] ?? '';
            if (! is_string($n) || $n === '') {
                continue;
            }
            if ($norm($n) === $want) {
                $id = $item['id'] ?? null;

                return is_string($id) && $id !== '' ? $id : null;
            }
        }

        $minPop = (int) config('services.spotify.link_by_name_min_popularity', 28);
        if ($minPop <= 0) {
            return null;
        }

        foreach ($items as $item) {
            $pop = (int) ($item['popularity'] ?? 0);
            $id = $item['id'] ?? null;
            if ($pop >= $minPop && is_string($id) && $id !== '') {
                return $id;
            }
        }

        return null;
    }

    /**
     * Yalnızca MusicBrainz üzerinden (URL ilişkisinde open.spotify.com olan kayıtlar).
     */
    private function importViaMusicBrainzOnly(MusicBrainzClient $client, int $max): int
    {
        $queries = array_values(array_unique(array_filter([
            $this->option('mb-query') ?: null,
            config('services.musicbrainz.search_query', 'country:TR'),
            'area:Turkey',
        ])));

        $imported = 0;
        $bar = $this->output->createProgressBar($max);
        $bar->start();

        foreach ($queries as $q) {
            if ($imported >= $max) {
                break;
            }
            $offset = 0;
            while ($imported < $max) {
                $search = $client->get('artist', [
                    'query' => $q,
                    'limit' => 100,
                    'offset' => $offset,
                    'fmt' => 'json',
                ]);

                if (! $search || empty($search['artists'])) {
                    break;
                }

                foreach ($search['artists'] as $row) {
                    if ($imported >= $max) {
                        break 3;
                    }
                    $mbid = $row['id'] ?? null;
                    if (! $mbid) {
                        continue;
                    }

                    $detail = $client->get('artist/'.$mbid, [
                        'inc' => 'url-rels+tags',
                        'fmt' => 'json',
                    ]);
                    if (! $detail) {
                        continue;
                    }

                    [$spotifyId, $spotifyUrl] = $this->extractSpotifyFromMusicBrainz($detail);
                    if (! $spotifyId) {
                        continue;
                    }

                    if (Artist::where('spotify_id', $spotifyId)->exists()) {
                        continue;
                    }

                    $tags = $detail['tags'] ?? [];
                    if (is_array($tags)) {
                        usort($tags, fn ($a, $b): int => ($b['count'] ?? 0) <=> ($a['count'] ?? 0));
                    } else {
                        $tags = [];
                    }

                    $genreNames = [];
                    foreach (array_slice($tags, 0, 25) as $t) {
                        if (is_array($t) && ! empty($t['name'])) {
                            $genreNames[] = (string) $t['name'];
                        }
                    }

                    $name = (string) ($detail['name'] ?? $row['name'] ?? 'İsimsiz');
                    $bio = $this->buildBioFromMusicBrainzTags($genreNames);
                    $primary = $genreNames[0] ?? null;
                    $primary = $primary ? Str::title(str_replace(['-', '_'], ' ', $primary)) : null;

                    $this->upsertFromNormalized(
                        spotifyId: $spotifyId,
                        name: $name,
                        spotifyUrl: $spotifyUrl,
                        genres: $genreNames,
                        primaryGenre: $primary,
                        bioTemplate: $bio,
                        avatar: null,
                        popularity: null,
                        followers: null,
                        albums: null,
                        countryCode: 'TR',
                    );

                    $imported++;
                    $bar->advance();
                }

                $offset += 100;
                $total = (int) ($search['count'] ?? 0);
                if ($offset >= $total) {
                    break;
                }
            }
        }

        $bar->finish();
        $this->newLine();

        return $imported;
    }

    /**
     * @param  array<string, mixed>  $detail
     * @return array{0: string|null, 1: string|null}
     */
    private function extractSpotifyFromMusicBrainz(array $detail): array
    {
        foreach ($detail['relations'] ?? [] as $rel) {
            if (! is_array($rel)) {
                continue;
            }
            $url = $rel['url']['resource'] ?? '';
            if (! is_string($url)) {
                continue;
            }
            if (preg_match('#open\.spotify\.com/(?:intl-[a-z-]+/)?artist/([A-Za-z0-9]+)#i', $url, $m)) {
                return [$m[1], $url];
            }
        }

        return [null, null];
    }

    /**
     * @param  list<string>  $tags
     */
    private function buildBioFromMusicBrainzTags(array $tags): ?string
    {
        if ($tags === []) {
            return null;
        }

        return 'MusicBrainz etiketleri: '.implode(', ', array_slice($tags, 0, 10)).'.';
    }

    private function enrichTurkishArtistsWithSpotify(
        SpotifyService $spotify,
        bool $withAlbums,
        bool $withGallery,
        bool $forceGallery,
    ): int {
        $ids = Artist::query()
            ->where('country_code', 'TR')
            ->whereNotNull('spotify_id')
            ->pluck('spotify_id')
            ->map(fn ($id) => is_string($id) ? trim($id) : '')
            ->filter(fn (string $id) => $id !== '' && preg_match('/^[0-9A-Za-z]{8,32}$/', $id))
            ->unique()
            ->values()
            ->all();

        if ($ids === []) {
            return 0;
        }

        $updated = 0;
        foreach (array_chunk($ids, 50) as $chunk) {
            $batch = $spotify->getSeveralArtists($chunk);
            foreach ($batch as $api) {
                if (! is_array($api) || empty($api['id'])) {
                    continue;
                }
                $albums = null;
                if ($withAlbums) {
                    $albums = $spotify->getArtistAlbumsPreview((string) $api['id'], 12);
                    usleep(80_000);
                }
                $this->upsertFromSpotifyApiPayload($api, $albums, 'TR');
                $artist = Artist::where('spotify_id', (string) $api['id'])->first();
                if ($artist && $withGallery && is_array($albums) && $albums !== []) {
                    $this->syncGalleryFromAlbumCovers($artist, $albums, $forceGallery);
                }
                $updated++;
            }
            usleep(100_000);
        }

        return $updated;
    }

    /**
     * @param  list<array{id: string, name: string, release_date: string|null, image: string|null, url: string|null}>  $albums
     */
    private function syncGalleryFromAlbumCovers(Artist $artist, array $albums, bool $force): void
    {
        if ($albums === []) {
            return;
        }
        if (! $force && $artist->media()->exists()) {
            return;
        }
        if ($force) {
            $artist->media()->delete();
        }

        $order = 0;
        foreach (array_slice($albums, 0, 12) as $al) {
            $url = $al['image'] ?? null;
            if (! is_string($url) || $url === '') {
                continue;
            }
            ArtistMedia::create([
                'artist_id' => $artist->id,
                'type' => 'photo',
                'path' => $url,
                'title' => $al['name'] ?? null,
                'order' => $order++,
            ]);
        }
    }

    private function importViaSpotifyApi(SpotifyService $spotify, SpotifyArtistImporter $importer, int $max): int
    {
        $pool = max($max, min(8000, (int) $this->option('pool')));
        $withAlbums = (bool) $this->option('with-albums');
        $withGallery = (bool) $this->option('with-gallery');
        $forceGallery = (bool) $this->option('force-gallery');
        $browseOnly = (bool) $this->option('browse-only');
        $searchOnly = (bool) $this->option('search-only');

        if ($browseOnly && $searchOnly) {
            $this->error('--browse-only ve --search-only birlikte kullanılamaz.');

            return self::FAILURE;
        }

        $useBrowse = ! $searchOnly;
        $useSearch = ! $browseOnly;

        $this->info('Spotify Web API keşfi (pazar: '.$spotify->market().'); country_code=INT (yabancı havuz). Sonra: php artisan artists:prune-foreign');

        $ids = $importer->discoverArtistIds(
            $pool,
            fn (string $m) => $this->line('  '.$m),
            $useBrowse,
            $useSearch,
        );

        if ($ids === []) {
            $this->warn('Hiç sanatçı ID toplanamadı.');

            return self::FAILURE;
        }

        $this->info('Toplam '.count($ids).' benzersiz ID; ayrıntılar çekiliyor...');

        $aggregated = [];
        foreach (array_chunk($ids, 50) as $chunk) {
            $batch = $spotify->getSeveralArtists($chunk);
            foreach ($batch as $row) {
                if (is_array($row) && ! empty($row['id'])) {
                    $aggregated[] = $row;
                }
            }
        }

        usort($aggregated, fn (array $a, array $b): int => ($b['popularity'] ?? 0) <=> ($a['popularity'] ?? 0));
        $aggregated = array_slice($aggregated, 0, $max);

        $bar = $this->output->createProgressBar(count($aggregated));
        $bar->start();

        $imported = 0;
        foreach ($aggregated as $api) {
            $albums = null;
            if ($withAlbums) {
                $albums = $spotify->getArtistAlbumsPreview((string) $api['id'], 12);
                usleep(60_000);
            }
            $this->upsertFromSpotifyApiPayload($api, $albums, 'INT');
            if ($withGallery && is_array($albums) && $albums !== []) {
                $artist = Artist::where('spotify_id', (string) $api['id'])->first();
                if ($artist) {
                    $this->syncGalleryFromAlbumCovers($artist, $albums, $forceGallery);
                }
            }
            $imported++;
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Tamamlandı. İşlenen sanatçı: {$imported} (INT — Türk olmayanları silmek için: php artisan artists:prune-foreign).");

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $api
     * @param  list<array<string, mixed>>|null  $albums
     */
    private function upsertFromSpotifyApiPayload(array $api, ?array $albums, string $countryCode = 'INT'): void
    {
        $genres = [];
        foreach ($api['genres'] ?? [] as $g) {
            if (is_string($g) && $g !== '') {
                $genres[] = $g;
            }
        }

        $followers = isset($api['followers']['total']) ? (int) $api['followers']['total'] : null;
        $popularity = isset($api['popularity']) ? (int) $api['popularity'] : null;

        $images = $api['images'] ?? [];
        $avatar = null;
        if (is_array($images[0] ?? null) && ! empty($images[0]['url'])) {
            $avatar = (string) $images[0]['url'];
        }

        $url = $api['external_urls']['spotify'] ?? null;
        $url = is_string($url) ? $url : null;

        $bio = $this->buildBioFromSpotify($genres, $followers, $popularity);

        $this->upsertFromNormalized(
            spotifyId: (string) $api['id'],
            name: (string) ($api['name'] ?? 'İsimsiz'),
            spotifyUrl: $url,
            genres: $genres,
            primaryGenre: $this->primaryGenreLabel($genres),
            bioTemplate: $bio,
            avatar: $avatar,
            popularity: $popularity,
            followers: $followers,
            albums: $albums,
            countryCode: $countryCode,
        );
    }

    /**
     * @param  list<string>  $genres
     * @param  list<array<string, mixed>>|null  $albums
     */
    private function upsertFromNormalized(
        string $spotifyId,
        string $name,
        ?string $spotifyUrl,
        array $genres,
        ?string $primaryGenre,
        ?string $bioTemplate,
        ?string $avatar,
        ?int $popularity,
        ?int $followers,
        ?array $albums,
        string $countryCode = 'TR',
    ): void {
        $spotifyId = trim($spotifyId);
        if ($spotifyId === '') {
            return;
        }

        $existing = Artist::where('spotify_id', $spotifyId)->first();

        $social = $existing?->social_links ?? [];
        if (! is_array($social)) {
            $social = [];
        }
        if ($spotifyUrl !== null) {
            $social['spotify'] = $spotifyUrl;
        }

        $slug = $existing?->slug ?? $this->newUniqueSlug($name);
        $resolvedCountry = $this->resolveCountryCode($existing, $countryCode);

        Artist::updateOrCreate(
            ['spotify_id' => $spotifyId],
            [
                'name' => $name,
                'slug' => $slug,
                'bio' => $this->mergeBio($existing?->bio, $bioTemplate),
                'avatar' => $avatar ?? $existing?->avatar,
                'genre' => $primaryGenre ?? $existing?->genre,
                'spotify_url' => $spotifyUrl,
                'spotify_genres' => $genres !== [] ? $genres : null,
                'spotify_popularity' => $popularity,
                'spotify_followers' => $followers,
                'spotify_albums' => $albums !== null ? $albums : $existing?->spotify_albums,
                'social_links' => $social !== [] ? $social : null,
                'status' => 'approved',
                'country_code' => $resolvedCountry,
            ],
        );
    }

    private function resolveCountryCode(?Artist $existing, string $incoming): string
    {
        if ($incoming === 'TR') {
            return 'TR';
        }
        if ($incoming === 'INT') {
            return $existing?->country_code === 'TR' ? 'TR' : 'INT';
        }

        return $incoming;
    }

    private function mergeBio(?string $current, ?string $generated): ?string
    {
        if ($generated === null) {
            return $current;
        }
        if ($current === null || trim($current) === '') {
            return $generated;
        }
        if (str_contains($current, 'Spotify türleri:')
            || str_contains($current, 'MusicBrainz etiketleri:')
            || str_contains($current, 'Kaynak: Wikidata')) {
            return $generated;
        }

        return trim($current."\n\n".$generated);
    }

    /**
     * @param  list<string>  $genres
     */
    private function buildBioFromSpotify(array $genres, ?int $followers, ?int $popularity): ?string
    {
        $parts = [];
        if ($genres !== []) {
            $parts[] = 'Spotify türleri: '.implode(', ', array_slice($genres, 0, 8)).'.';
        }
        if ($followers !== null && $followers > 0) {
            $parts[] = 'Spotify\'da yaklaşık '.number_format($followers, 0, ',', '.').' takipçi.';
        }
        if ($popularity !== null) {
            $parts[] = 'Popülerlik skoru: '.$popularity.'/100.';
        }

        return $parts === [] ? null : implode(' ', $parts);
    }

    /**
     * @param  list<string>  $genres
     */
    private function primaryGenreLabel(array $genres): ?string
    {
        if ($genres === []) {
            return null;
        }
        $g = $genres[0];

        return Str::title(str_replace(['-', '_'], ' ', $g));
    }

    private function newUniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'sanatci';
        }
        $slug = $base;
        $i = 2;
        while (Artist::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
