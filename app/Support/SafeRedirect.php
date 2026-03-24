<?php

namespace App\Support;

class SafeRedirect
{
    /**
     * İç, göreli yollar için güvenli dönüş URL'si (açık yönlendirme önleme).
     */
    public static function relativePath(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        $path = urldecode($path);

        if (! str_starts_with($path, '/') || str_starts_with($path, '//')) {
            return null;
        }

        if (str_contains($path, "\0") || str_contains($path, "\n") || str_contains($path, "\r")) {
            return null;
        }

        if (str_contains($path, '\\') || str_contains($path, ':')) {
            return null;
        }

        if (preg_match('/\.\./', $path) === 1) {
            return null;
        }

        if (strlen($path) > 2048) {
            return null;
        }

        return $path;
    }

    public static function slugParam(mixed $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        if (preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/i', $value) !== 1) {
            return null;
        }

        return $value;
    }
}
