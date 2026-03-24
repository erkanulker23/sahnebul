<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Category;
use App\Models\City;
use App\Models\User;
use App\Models\Venue;
use App\Services\AppSettingsService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function __construct(
        private readonly AppSettingsService $appSettings,
    ) {}

    public function index()
    {
        $systemStats = [
            'total_users' => User::count(),
            'total_venues' => Venue::count(),
            'categories_count' => Category::count(),
            'cities_count' => City::count(),
        ];

        $footer = $this->appSettings->getRawCached('footer');
        $legalPages = $this->appSettings->getRawCached('legal_pages');

        return Inertia::render('Admin/Settings/Index', [
            'systemStats' => $systemStats,
            'settings' => [
                'footer' => $footer,
                'legal_pages' => $legalPages,
            ],
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'footer' => 'nullable|string',
            'legal_pages' => 'nullable|string',
        ]);

        AppSetting::updateOrCreate(['key' => 'footer'], ['value' => $validated['footer'] ?: null]);
        AppSetting::updateOrCreate(['key' => 'legal_pages'], ['value' => $validated['legal_pages'] ?: null]);

        $this->appSettings->forgetCaches();

        return back()->with('success', 'Ayarlar güncellendi.');
    }
}
