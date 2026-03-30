<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

final class CaseInsensitiveSearch
{
    /**
     * SQL LIKE için özel karakterleri kaçırır; aranan metin olduğu gibi kullanılır (büyük/küçük harf ayrımı yok).
     */
    public static function likePattern(string $term): string
    {
        return '%'.addcslashes(trim($term), '%_\\').'%';
    }

    /**
     * @param  Builder<Model>  $query
     */
    public static function whereColumnLikeInsensitive(Builder $query, string $column, string $term): void
    {
        $term = trim($term);
        if ($term === '') {
            return;
        }
        if (! preg_match('/^[a-z][a-z0-9_]*$/i', $column)) {
            throw new \InvalidArgumentException('Invalid column identifier for case-insensitive search.');
        }
        $pattern = self::likePattern($term);
        $query->whereRaw('LOWER('.$column.') LIKE LOWER(?)', [$pattern]);
    }
}
