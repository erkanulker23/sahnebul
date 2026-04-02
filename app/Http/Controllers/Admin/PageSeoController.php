<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\AppSettingsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PageSeoController extends Controller
{
    /** @var list<array{key: string, label: string, variables: string}> */
    private const PAGES = [
        ['key' => 'home', 'label' => 'Ana sayfa (/)', 'variables' => '{site_name}, {year}, {default_description}'],
        ['key' => 'venues_index', 'label' => 'Mekanlar listesi (/mekanlar)', 'variables' => '{site_name}, {year}, {default_description}'],
        ['key' => 'venue_show', 'label' => 'Mekan detay', 'variables' => '{site_name}, {venue_name}, {city_name}, {default_description}'],
        ['key' => 'events_index', 'label' => 'Etkinlikler listesi (/etkinlikler)', 'variables' => '{site_name}, {year}, {default_description}'],
        ['key' => 'events_index_localized', 'label' => 'Etkinlikler şehir+tür (/etkinlik/…)', 'variables' => '{site_name}, {year}, {city_name}, {event_type_label}, {default_description}'],
        ['key' => 'events_index_by_type', 'label' => 'Etkinlikler yalnız tür (/etkinlik/{tür})', 'variables' => '{site_name}, {year}, {event_type_label}, {default_description}'],
        ['key' => 'event_show', 'label' => 'Etkinlik detay', 'variables' => '{site_name}, {event_title}, {venue_name}, {venue_title_suffix}, {city_name}, {default_description}'],
        ['key' => 'artists_index', 'label' => 'Sanatçılar listesi', 'variables' => '{site_name}, {year}, {default_description}'],
        ['key' => 'artist_show', 'label' => 'Sanatçı detay', 'variables' => '{site_name}, {artist_name}, {genre}, {default_description}'],
        ['key' => 'contact', 'label' => 'İletişim', 'variables' => '{site_name}, {year}, {default_description}'],
        ['key' => 'blog_index', 'label' => 'Blog listesi', 'variables' => '{site_name}, {year}, {default_description}'],
        ['key' => 'blog_show', 'label' => 'Blog yazısı', 'variables' => '{site_name}, {blog_title}, {default_description}'],
        ['key' => 'legal_page', 'label' => 'Statik sayfa (KVKK vb.)', 'variables' => '{site_name}, {page_title}, {default_description}'],
        ['key' => 'sehir_sec', 'label' => 'Şehir seç giriş', 'variables' => '{site_name}, {year}, {default_description}'],
        ['key' => 'sehir_sec_city', 'label' => 'Şehir etkinlikleri', 'variables' => '{site_name}, {city_name}, {default_description}'],
        ['key' => 'external_event_show', 'label' => 'Harici etkinlik özeti', 'variables' => '{site_name}, {event_title}, {venue_name}, {city_name}, {default_description}'],
    ];

    public function index(): Response
    {
        $defaults = config('sahnebul.default_page_seo', []);
        $raw = app(AppSettingsService::class)->getJsonCached('page_seo');
        $fromDb = is_array($raw) ? $raw : [];

        $rows = [];
        foreach (self::PAGES as $meta) {
            $k = $meta['key'];
            $def = isset($defaults[$k]) && is_array($defaults[$k]) ? $defaults[$k] : [];
            $ov = isset($fromDb[$k]) && is_array($fromDb[$k]) ? $fromDb[$k] : [];
            $rows[] = [
                'key' => $k,
                'label' => $meta['label'],
                'variables' => $meta['variables'],
                'title' => (string) ($ov['title'] ?? $def['title'] ?? ''),
                'description' => (string) ($ov['description'] ?? $def['description'] ?? ''),
                'suggested_title' => (string) ($def['title'] ?? ''),
                'suggested_description' => (string) ($def['description'] ?? ''),
            ];
        }

        return Inertia::render('Admin/PageSeo/Index', [
            'pages' => $rows,
        ]);
    }

    public function update(Request $request)
    {
        $rules = [];
        foreach (self::PAGES as $meta) {
            $k = $meta['key'];
            $rules['page_seo.'.$k.'.title'] = 'nullable|string|max:500';
            $rules['page_seo.'.$k.'.description'] = 'nullable|string|max:5000';
        }

        $validated = $request->validate($rules);
        $payload = $validated['page_seo'] ?? [];
        if (! is_array($payload)) {
            $payload = [];
        }

        $clean = [];
        foreach (self::PAGES as $meta) {
            $k = $meta['key'];
            $row = $payload[$k] ?? [];
            if (! is_array($row)) {
                continue;
            }
            $t = isset($row['title']) ? trim((string) $row['title']) : '';
            $d = isset($row['description']) ? trim((string) $row['description']) : '';
            if ($t === '' && $d === '') {
                continue;
            }
            $clean[$k] = [
                'title' => $t === '' ? null : $t,
                'description' => $d === '' ? null : $d,
            ];
        }

        AppSetting::updateOrCreate(
            ['key' => 'page_seo'],
            ['value' => json_encode($clean, JSON_UNESCAPED_UNICODE)]
        );

        app(AppSettingsService::class)->forgetCaches();

        return back()->with('success', 'Sayfa SEO şablonları güncellendi.');
    }
}
