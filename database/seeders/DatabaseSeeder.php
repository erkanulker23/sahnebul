<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CategorySeeder::class,
            CitySeeder::class,
            AdminUserSeeder::class,
            MusicGenreSeeder::class,
            ArtistSeeder::class,
            VenueSeeder::class,
            VenueMediaSeeder::class,
            EventSeeder::class,
            AppSettingSeeder::class,
            SubscriptionPlanSeeder::class,
            DemoProfileUsersSeeder::class,
            BlogPostSeeder::class,
        ]);

        // Ağır işlemler: CI / tünel / production seed zaman aşımına düşmesin.
        // Yerelde tam içe aktarma için .env: SPOTIFY_IMPORT_MAX=400 ve isteğe SEED_FETCH_ARTIST_IMAGES=true
        try {
            $importMax = (int) env('SPOTIFY_IMPORT_MAX', 0);
            if ($importMax > 0 && env('SPOTIFY_CLIENT_ID') && env('SPOTIFY_CLIENT_SECRET')) {
                Artisan::call('spotify:import-artists', [
                    '--max' => $importMax,
                    '--pool' => min(5000, $importMax * 6),
                ]);
            }
        } catch (\Throwable) {
            // Spotify kapalı veya kota: statik ArtistSeeder yeterli
        }

        try {
            if (filter_var(env('SEED_FETCH_ARTIST_IMAGES', false), FILTER_VALIDATE_BOOLEAN)) {
                Artisan::call('artists:fetch-images');
            }
        } catch (\Throwable) {
            // Artists created without avatars if fetch fails (offline, etc.)
        }
    }
}
