<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\AppSettingsService;
use App\Support\AdPlacementCatalog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdPlacementController extends Controller
{
    public function __construct(
        private readonly AppSettingsService $appSettings,
    ) {}

    public function index(): Response
    {
        $normalized = $this->appSettings->getNormalizedAdsConfig();

        return Inertia::render('Admin/AdSlots/Index', [
            'placements' => AdPlacementCatalog::definitions(),
            'slots' => $normalized['slots'],
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'slots' => 'required|array',
        ]);

        $keys = AdPlacementCatalog::slotKeys();
        $incoming = $request->input('slots');
        if (! is_array($incoming)) {
            $incoming = [];
        }

        $outSlots = [];
        foreach ($keys as $key) {
            $row = $incoming[$key] ?? null;
            $outSlots[$key] = AdPlacementCatalog::mergeSlot(is_array($row) ? $row : []);
        }

        try {
            $encoded = json_encode(['slots' => $outSlots], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return back()->with('error', 'Kayıt sırasında hata oluştu.');
        }

        AppSetting::updateOrCreate(
            ['key' => 'ads'],
            ['value' => $encoded]
        );

        $this->appSettings->forgetCaches();

        return back()->with('success', 'Reklam alanları güncellendi.');
    }
}
