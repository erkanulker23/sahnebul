<?php

namespace App\Support;

/**
 * Türkçe alfabe sırası (A–Z, Ç, Ğ, İ vb.) — liste filtreleri için.
 */
final class TurkishAlphabet
{
    /**
     * @var list<string>
     */
    public const LETTERS = [
        'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H', 'I', 'İ', 'J', 'K', 'L', 'M',
        'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z',
    ];
}
