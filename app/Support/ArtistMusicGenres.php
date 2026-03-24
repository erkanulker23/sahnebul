<?php

namespace App\Support;

/**
 * Admin panelde sanatçı için çoklu seçilebilir müzik türleri (sabit liste).
 */
final class ArtistMusicGenres
{
    /**
     * @return list<string>
     */
    public static function labels(): array
    {
        return [
            'Pop',
            'Rock',
            'Rap / Hip-Hop',
            'Elektronik (EDM)',
            'Arabesk',
            'Türk Sanat Müziği',
            'Türk Halk Müziği',
            'Jazz (Caz)',
            'Blues',
            'Reggae',
            'Klasik Müzik',
            'R&B',
            'Country',
            'Metal',
            'Funk',
            'Soul',
            'Indie',
            'Alternatif',
            'Trap',
            'Lo-fi',
            'Gospel',
            'Punk',
            'Hard Rock',
            'Soft Rock',
            'Progressive Rock',
            'Psychedelic Rock',
            'Heavy Metal',
            'Black Metal',
            'Death Metal',
            'Thrash Metal',
            'House',
            'Techno',
            'Trance',
            'Dubstep',
            'Ambient',
            'Chillout',
            'Disco',
            'Synthwave',
            'Afrobeat',
            'Latin',
            'Flamenco',
            'K-Pop',
            'J-Pop',
            'World Music',
            'Experimental',
            'Avant-Garde',
        ];
    }
}
