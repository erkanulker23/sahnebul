<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Services\TurkeyProvincesSync;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class CityController extends Controller
{
    public function index(TurkeyProvincesSync $sync)
    {
        $sync->sync();

        $cities = City::query()
            ->turkiyeProvinces()
            ->withCount('venues')
            ->get();

        return Inertia::render('Admin/Cities/Index', [
            'cities' => $cities,
            'turkiyeApiDocsUrl' => config('services.turkiye_api.docs_url', 'https://docs.turkiyeapi.dev/'),
            'syncFailed' => (bool) Cache::get('turkey_api_provinces_failed'),
        ]);
    }

    /**
     * [Türkiye API](https://docs.turkiyeapi.dev/) üzerinden 81 ili yeniden çeker (ad + koordinat).
     */
    public function syncFromApi(TurkeyProvincesSync $sync)
    {
        $sync->sync(true);

        if (Cache::get('turkey_api_provinces_failed')) {
            return back()->with('error', 'Türkiye API ile senkronizasyon tamamlanamadı. Ağ bağlantısını veya API durumunu kontrol edin.');
        }

        $count = City::query()->whereNotNull('external_id')->count();

        return back()->with('success', "İller güncellendi ({$count} kayıt).");
    }
}
