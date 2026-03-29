<?php

namespace App\Support;

use App\Services\AppSettingsService;
use Illuminate\Support\Facades\App;

/**
 * Admin paneldeki sayfa bazlı SEO şablonları — {site_name}, {event_title} vb. değişkenler.
 */
final class PageSeoResolver
{
    /**
     * @param  array<string, string>  $vars
     * @return array{0: string, 1: string} [titleSegment, description]
     */
    public static function apply(string $pageKey, array $vars, string $defaultTitle, string $defaultDescription): array
    {
        $row = self::mergedRow($pageKey);
        if ($row === null) {
            return [$defaultTitle, $defaultDescription];
        }

        $titleT = trim((string) ($row['title'] ?? ''));
        $descT = trim((string) ($row['description'] ?? ''));
        $title = $titleT !== '' ? self::replaceVars($titleT, $vars) : $defaultTitle;
        $desc = $descT !== '' ? self::replaceVars($descT, $vars) : $defaultDescription;

        return [$title, $desc];
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function mergedRow(string $pageKey): ?array
    {
        /** @var array<string, array<string, string>> $defaults */
        $defaults = config('sahnebul.default_page_seo', []);
        $fromDb = App::make(AppSettingsService::class)->getJsonCached('page_seo');
        if (! is_array($fromDb)) {
            $fromDb = [];
        }

        $base = isset($defaults[$pageKey]) && is_array($defaults[$pageKey]) ? $defaults[$pageKey] : [];
        $override = isset($fromDb[$pageKey]) && is_array($fromDb[$pageKey]) ? $fromDb[$pageKey] : [];

        if ($base === [] && $override === []) {
            return null;
        }

        return array_merge($base, $override);
    }

    /**
     * @param  array<string, string>  $vars
     */
    private static function replaceVars(string $template, array $vars): string
    {
        if ($template === '') {
            return '';
        }

        return (string) preg_replace_callback(
            '/\{([a-z0-9_]+)\}/',
            function (array $m) use ($vars): string {
                $k = $m[1] ?? '';

                return $vars[$k] ?? $m[0];
            },
            $template
        );
    }
}
