<?php

namespace App\Support;

final class AdPlacementCatalog
{
    /**
     * @return list<array{key: string, label: string, description: string}>
     */
    public static function definitions(): array
    {
        return [
            [
                'key' => 'header_below_nav',
                'label' => 'Üst şerit (nav altı)',
                'description' => 'Tüm genel sayfalarda ana menünün hemen altında, tam genişlik.',
            ],
            [
                'key' => 'home_below_hero',
                'label' => 'Ana sayfa — hero altı',
                'description' => 'Ana sayfada (/) hero görselinin altında, trend sanatçılar bölümünden önce.',
            ],
            [
                'key' => 'venues_list_top',
                'label' => 'Mekanlar listesi üstü',
                'description' => 'Mekanlar liste sayfasında (/mekanlar) grid’den önce.',
            ],
            [
                'key' => 'events_index_top',
                'label' => 'Etkinlikler listesi üstü',
                'description' => 'Etkinlikler sayfasında kırmızı şeritten sonra, filtrelerin üstünde.',
            ],
            [
                'key' => 'venue_sidebar',
                'label' => 'Mekan detay — yan sütun',
                'description' => 'Mekan detay sayfasında sağ sütunda, iletişim kutusunun üstünde.',
            ],
            [
                'key' => 'event_detail_sidebar',
                'label' => 'Etkinlik detay — sponsor / yan reklam',
                'description' => 'Etkinlik detay sayfasında sağ sütunda (tarih kutusunun üstü). Görsel yoksa «Sponsor başvurusu» alanı gösterilir.',
            ],
            [
                'key' => 'blog_sidebar',
                'label' => 'Blog — yan sütun',
                'description' => 'Blog liste sayfasında yazı ızgarasının sağında (masaüstü).',
            ],
            [
                'key' => 'footer_above',
                'label' => 'Footer üstü',
                'description' => 'Tüm genel sayfalarda footer’dan hemen önce, tam genişlik.',
            ],
        ];
    }

    /**
     * @return list<string>
     */
    public static function slotKeys(): array
    {
        return array_column(self::definitions(), 'key');
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultSlot(): array
    {
        return [
            'enabled' => false,
            'type' => 'banner',
            'image_url' => '',
            'link_url' => '',
            'alt' => '',
            'title' => '',
            'html' => '',
        ];
    }

    /**
     * @param  array<string, mixed>|null  $raw
     * @return array{slots: array<string, array<string, mixed>>}
     */
    public static function normalize(?array $raw): array
    {
        $raw = $raw ?? [];

        if (isset($raw['slots']) && is_array($raw['slots'])) {
            $slots = [];
            foreach (self::slotKeys() as $key) {
                $slots[$key] = self::mergeSlot($raw['slots'][$key] ?? []);
            }

            return ['slots' => $slots];
        }

        $slots = [];
        foreach (self::slotKeys() as $key) {
            $slots[$key] = self::defaultSlot();
        }

        if (isset($raw['top_banner']) && is_array($raw['top_banner'])) {
            $slots['header_below_nav'] = self::legacyCardToSlot($raw['top_banner']);
        }
        if (isset($raw['sidebar_banner']) && is_array($raw['sidebar_banner'])) {
            $slots['venue_sidebar'] = self::legacyCardToSlot($raw['sidebar_banner']);
        }

        return ['slots' => $slots];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function mergeSlot(array $data): array
    {
        $type = $data['type'] ?? 'banner';
        if (! in_array($type, ['banner', 'adsense', 'custom_html'], true)) {
            $type = 'banner';
        }

        $html = isset($data['html']) ? (string) $data['html'] : '';
        if (strlen($html) > 65535) {
            $html = substr($html, 0, 65535);
        }

        $enabledRaw = $data['enabled'] ?? false;
        $enabled = filter_var($enabledRaw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($enabled === null) {
            $enabled = false;
        }

        return [
            'enabled' => $enabled,
            'type' => $type,
            'image_url' => isset($data['image_url']) ? mb_substr((string) $data['image_url'], 0, 2048) : '',
            'link_url' => isset($data['link_url']) ? mb_substr((string) $data['link_url'], 0, 2048) : '',
            'alt' => isset($data['alt']) ? mb_substr((string) $data['alt'], 0, 500) : '',
            'title' => isset($data['title']) ? mb_substr((string) $data['title'], 0, 500) : '',
            'html' => $html,
        ];
    }

    /**
     * @param  array<string, mixed>  $b
     * @return array<string, mixed>
     */
    private static function legacyCardToSlot(array $b): array
    {
        $title = htmlspecialchars((string) ($b['title'] ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = htmlspecialchars((string) ($b['text'] ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $url = htmlspecialchars((string) ($b['url'] ?? '#'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $cta = htmlspecialchars((string) ($b['cta'] ?? 'Detay'), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return [
            /** Eski top_banner / sidebar_banner kayıtları yalnızca şablon taşır; yayında göstermek için panelde Aktif işaretlenmeli. */
            'enabled' => false,
            'type' => 'custom_html',
            'image_url' => '',
            'link_url' => '',
            'alt' => '',
            'title' => '',
            'html' => '<div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center dark:border-amber-500/25 dark:bg-amber-500/5"><p class="font-semibold text-amber-900 dark:text-amber-200">'.$title.'</p><p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">'.$text.'</p><a href="'.$url.'" class="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950">'.$cta.'</a></div>',
        ];
    }
}
