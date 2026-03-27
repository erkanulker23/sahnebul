<?php

namespace App\Support;

/**
 * Ana sayfa (/) hero slider — `app_settings.site` JSON içinde saklanır.
 * Eski tek alan `home_hero_image_path` geriye dönük okunur.
 */
final class HomeHeroSlides
{
    public const MAX_SLIDES = 3;

    /**
     * @param  array<string, mixed>  $site  getSitePublicSettings() çıktısı
     * @return list<string> En fazla 3, `site/` ile başlayan depolama yolları
     */
    public static function pathsFromSite(array $site): array
    {
        $out = [];
        $raw = $site['home_hero_slide_paths'] ?? null;
        if (is_array($raw)) {
            foreach ($raw as $p) {
                if (! is_string($p)) {
                    continue;
                }
                $t = trim($p);
                if ($t !== '' && str_starts_with($t, 'site/')) {
                    $out[] = $t;
                }
            }
        }
        $out = array_values(array_unique($out));
        $out = array_slice($out, 0, self::MAX_SLIDES);
        if ($out !== []) {
            return $out;
        }

        $legacy = isset($site['home_hero_image_path']) && is_string($site['home_hero_image_path'])
            ? trim($site['home_hero_image_path'])
            : '';
        if ($legacy !== '' && str_starts_with($legacy, 'site/')) {
            return [$legacy];
        }

        return [];
    }
}
