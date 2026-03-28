<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\AppSettingsService;
use App\Support\AdPlacementCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
            'event_detail_sidebar_upload' => 'nullable|file|max:8192|mimes:jpeg,jpg,png,webp,gif',
            'remove_event_detail_sidebar_image' => 'sometimes|boolean',
        ]);

        $keys = AdPlacementCatalog::slotKeys();
        $incoming = $request->input('slots');
        if (! is_array($incoming)) {
            $incoming = [];
        }

        $normalizedBefore = $this->appSettings->getNormalizedAdsConfig();
        $eventSlotBefore = $normalizedBefore['slots']['event_detail_sidebar'] ?? [];
        $eventImageBefore = isset($eventSlotBefore['image_url']) ? trim((string) $eventSlotBefore['image_url']) : '';

        if ($request->boolean('remove_event_detail_sidebar_image')) {
            $this->deletePublicAdAsset($eventImageBefore);
            $incoming['event_detail_sidebar'] = array_merge(
                is_array($incoming['event_detail_sidebar'] ?? null) ? $incoming['event_detail_sidebar'] : [],
                ['image_url' => '']
            );
        } elseif ($request->hasFile('event_detail_sidebar_upload')) {
            $this->deletePublicAdAsset($eventImageBefore);
            $stored = $request->file('event_detail_sidebar_upload')->store('ads/event-detail', 'public');
            $incoming['event_detail_sidebar'] = array_merge(
                is_array($incoming['event_detail_sidebar'] ?? null) ? $incoming['event_detail_sidebar'] : [],
                ['image_url' => $stored]
            );
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

    private function deletePublicAdAsset(string $path): void
    {
        if ($path === '' || ! str_starts_with($path, 'ads/')) {
            return;
        }
        Storage::disk('public')->delete($path);
    }
}
