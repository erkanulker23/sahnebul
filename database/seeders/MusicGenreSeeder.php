<?php

namespace Database\Seeders;

use App\Models\MusicGenre;
use App\Support\ArtistMusicGenres;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MusicGenreSeeder extends Seeder
{
    public function run(): void
    {
        foreach (ArtistMusicGenres::labels() as $i => $name) {
            MusicGenre::query()->firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'order' => $i * 10],
            );
        }
    }
}
