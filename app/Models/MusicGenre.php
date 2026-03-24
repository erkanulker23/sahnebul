<?php

namespace App\Models;

use App\Support\ArtistMusicGenres;
use Illuminate\Database\Eloquent\Model;

class MusicGenre extends Model
{
    protected $fillable = ['name', 'slug', 'order'];

    /**
     * @return list<string>
     */
    public static function optionNamesOrdered(): array
    {
        $fromDb = static::query()->orderBy('order')->orderBy('name')->pluck('name')->all();

        return $fromDb !== [] ? array_values($fromDb) : ArtistMusicGenres::labels();
    }

    public static function usageCount(self $genre): int
    {
        return Artist::query()
            ->whereJsonContains('music_genres', $genre->name)
            ->count();
    }
}
