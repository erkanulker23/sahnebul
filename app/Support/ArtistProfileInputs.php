<?php

namespace App\Support;

class ArtistProfileInputs
{
    /**
     * open.spotify.com/artist/{id} veya spotify:artist:{id} biçiminden Spotify sanatçı kimliğini çıkarır.
     */
    public static function extractSpotifyArtistId(string $urlOrUri): ?string
    {
        $s = trim($urlOrUri);
        if ($s === '') {
            return null;
        }
        if (preg_match('#^spotify:artist:([a-zA-Z0-9]+)\s*$#', $s, $m)) {
            return $m[1];
        }
        if (preg_match('#open\.spotify\.com/(?:intl-[a-z]{2}/)?artist/([a-zA-Z0-9]+)#i', $s, $m)) {
            return $m[1];
        }
        if (preg_match('#^[a-zA-Z0-9]{22}\s*$#', $s, $m)) {
            return trim($m[0]);
        }

        return null;
    }

    /**
     * @return array<string, string>|null
     */
    public static function normalizeSocialLinks(mixed $input): ?array
    {
        if (! is_array($input)) {
            return null;
        }
        $out = [];
        foreach ($input as $key => $value) {
            if (! is_string($key) || ! is_string($value)) {
                continue;
            }
            $value = trim($value);
            if ($value !== '') {
                $out[$key] = $value;
            }
        }

        return $out === [] ? null : $out;
    }

    /**
     * @param  list<string>  $allowedKeys
     * @return array<string, string>|null
     */
    public static function normalizeStringMap(mixed $input, array $allowedKeys): ?array
    {
        if (! is_array($input)) {
            return null;
        }
        $allowed = array_flip($allowedKeys);
        $out = [];
        foreach ($input as $key => $value) {
            if (! is_string($key) || ! isset($allowed[$key]) || ! is_string($value)) {
                continue;
            }
            $value = trim($value);
            if ($value !== '') {
                $out[$key] = $value;
            }
        }

        return $out === [] ? null : $out;
    }
}
