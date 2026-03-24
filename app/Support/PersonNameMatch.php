<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Sanatçı adı ile Spotify / Vikipedi / Wikidata metinlerinin aynı kişiye ait olup olmadığını kaba doğrular.
 */
final class PersonNameMatch
{
    /**
     * İki görünen ad (yerel kayıt vs Spotify) aynı kişi mi?
     */
    public static function likelySame(string $local, string $remote): bool
    {
        $a = self::fold($local);
        $b = self::fold($remote);
        if ($a === '' || $b === '') {
            return false;
        }
        if ($a === $b) {
            return true;
        }

        similar_text($a, $b, $pct);
        if ($pct >= 92.0) {
            return true;
        }

        $wordsA = self::significantTokens($a);
        if ($wordsA === []) {
            return false;
        }

        $long = array_values(array_filter($wordsA, static fn (string $w): bool => mb_strlen($w) >= 3));
        if ($long === []) {
            return $pct >= 90.0;
        }

        foreach ($long as $w) {
            if (! str_contains($b, $w)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Vikipedi madde başlığı bu sanatçıya ait görünüyor mu? (politika/spor sayfalarını ele).
     */
    public static function wikipediaTitleMatchesArtist(string $title, string $artistName): bool
    {
        if (self::titlePoliticsOrNoise($title)) {
            return false;
        }

        $t = self::fold($title);
        $t = preg_replace('/\([^)]*\)/u', ' ', $t) ?? $t;
        $t = preg_replace('/\s+/u', ' ', $t) ?? $t;
        $t = trim((string) $t);

        $words = self::significantTokens(self::fold($artistName));
        $long = array_values(array_filter($words, static fn (string $w): bool => mb_strlen($w) >= 3));
        $check = $long !== [] ? $long : $words;
        if ($check === []) {
            return false;
        }

        foreach ($check as $w) {
            if (! str_contains($t, $w)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Wikidata arama sonucu etiketi / kısa açıklama bu sanatçıyla uyumlu mu?
     */
    public static function wikidataHitMatchesArtist(string $label, ?string $description, string $artistName): bool
    {
        $desc = self::fold((string) $description);
        if ($desc !== '' && self::textPoliticsOrNoise($desc)) {
            return false;
        }

        $labPlain = trim((string) preg_replace('/\s*\([^)]*\)\s*/u', ' ', $label));
        if ($labPlain === '') {
            return false;
        }

        return self::likelySame($artistName, $labPlain);
    }

    public static function fold(string $s): string
    {
        $s = trim($s);
        if ($s === '') {
            return '';
        }
        $s = Str::ascii($s);
        $s = mb_strtolower($s, 'UTF-8');

        return preg_replace('/\s+/u', ' ', $s) ?? $s;
    }

    /**
     * @return list<string>
     */
    private static function significantTokens(string $folded): array
    {
        $parts = preg_split('/\s+/u', $folded) ?: [];
        $out = [];
        foreach ($parts as $p) {
            $p = trim($p);
            if (mb_strlen($p) >= 2) {
                $out[] = $p;
            }
        }

        return $out;
    }

    private static function titlePoliticsOrNoise(string $title): bool
    {
        return self::textPoliticsOrNoise(self::fold($title));
    }

    private static function textPoliticsOrNoise(string $folded): bool
    {
        if ($folded === '') {
            return true;
        }

        $needles = [
            'chp ', ' chp', 'halk partisi', 'ak parti', 'milletvekili', 'belediye baskan',
            'cumhuriyet halk', 'secim', 'siyasi ', ' politics', 'provincial chair',
            'deputy ', 'parliament', 'grand national assembly', 'tbmm',
        ];
        foreach ($needles as $n) {
            if (str_contains($folded, $n)) {
                return true;
            }
        }

        return false;
    }
}
