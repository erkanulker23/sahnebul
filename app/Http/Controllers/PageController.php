<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Inertia\Inertia;

class PageController extends Controller
{
    public function show(string $slug)
    {
        $allowed = [
            'hakkimizda' => 'Hakkımızda',
            'gizlilik-politikasi' => 'Gizlilik',
            'cerez-politikasi' => 'Çerez Politikası',
            'kvkk' => 'Kişisel Verilerin Korunması',
            'ticari-elektronik-ileti' => 'Ticari Elektronik İleti Bilgilendirme Metni',
            'sss' => 'Sıkça Sorulan Sorular',
        ];

        if (! array_key_exists($slug, $allowed)) {
            abort(404);
        }

        $raw = AppSetting::where('key', 'legal_pages')->value('value');
        $pages = $raw ? json_decode($raw, true) : [];
        $page = $pages[$slug] ?? null;

        return Inertia::render('Pages/Show', [
            'title' => $page['title'] ?? $allowed[$slug],
            'content' => $page['content'] ?? 'Bu sayfa içeriği henüz eklenmedi.',
            'slug' => $slug,
        ]);
    }
}
