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

        try {
            $importMax = (int) env('SPOTIFY_IMPORT_MAX', 400);
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
            Artisan::call('artists:fetch-images');
        } catch (\Throwable $e) {
            // Artists created without avatars if fetch fails (offline, etc.)
        }
    }
}
