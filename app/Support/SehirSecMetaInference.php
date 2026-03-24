<?php

namespace App\Support;

/**
 * Bubilet şehir-sec kartları için meta alanları (ilçe, sanatçı/performans türü).
 */
final class SehirSecMetaInference
{
    /**
     * @return array{slug: string, label: string}
     */
    public static function artistTypeFromTitle(string $title): array
    {
        $t = mb_strtolower($title, 'UTF-8');

        if (preg_match('/basketball|futbol|maç|spor|globetrotters|volleyball|voleybol/u', $t)) {
            return ['slug' => 'spor', 'label' => 'Spor'];
        }

        if (preg_match('/tolgshow|güldür|stand\s*-?\s*up|komedi|kahkaha|crazyyy|hayrettin|şehriban|memleket|zengin mutfağı|kaos night|burda olan|ilker ayrik|güldür güldür/u', $t)) {
            return ['slug' => 'komedi', 'label' => 'Komedi & stand-up'];
        }

        if (preg_match('/tiyatro|dans|bale|gala gösteri|musical|müzikal/u', $t)) {
            return ['slug' => 'sahne', 'label' => 'Tiyatro & sahne'];
        }

        if (preg_match('/symphony|orchestra|filarmoni|candle|vivaldi|mozart|klassik|piyano\s+akşamı|echoes\s+of/u', $t)) {
            return ['slug' => 'klasik', 'label' => 'Klasik & enstrümantal'];
        }

        if (preg_match('/konser|live|circuit|dj\s|festival|potter.*concert|canlı\s+müzik/u', $t)) {
            return ['slug' => 'konser', 'label' => 'Konser & popüler müzik'];
        }

        if (preg_match('/gösteri|show|one\s+man|tek\s+kişilik/u', $t)) {
            return ['slug' => 'gosteri', 'label' => 'Gösteri'];
        }

        return ['slug' => 'diger', 'label' => 'Diğer'];
    }

    /**
     * @return list<array{slug: string, label: string}>
     */
    public static function artistTypeFilterOptions(): array
    {
        return [
            ['slug' => 'spor', 'label' => 'Spor'],
            ['slug' => 'komedi', 'label' => 'Komedi & stand-up'],
            ['slug' => 'sahne', 'label' => 'Tiyatro & sahne'],
            ['slug' => 'klasik', 'label' => 'Klasik & enstrümantal'],
            ['slug' => 'konser', 'label' => 'Konser & popüler müzik'],
            ['slug' => 'gosteri', 'label' => 'Gösteri'],
            ['slug' => 'diger', 'label' => 'Diğer'],
        ];
    }

    public static function isValidArtistTypeSlug(string $slug): bool
    {
        return self::labelForArtistTypeSlug($slug) !== null;
    }

    public static function labelForArtistTypeSlug(string $slug): ?string
    {
        foreach (self::artistTypeFilterOptions() as $opt) {
            if ($opt['slug'] === $slug) {
                return $opt['label'];
            }
        }

        return null;
    }
}
