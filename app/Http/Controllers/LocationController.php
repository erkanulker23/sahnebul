<?php

namespace App\Http\Controllers;

use App\Models\City;
use App\Models\District;
use App\Models\Neighborhood;
use App\Services\TurkeyProvincesSync;
use App\Services\TurkiyeApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LocationController extends Controller
{
    /**
     * Tüm iller (Türkiye API ile senkron, ardından veritabanından).
     */
    public function provinces(): JsonResponse
    {
        $rows = app(TurkeyProvincesSync::class)->forSelect();

        return response()->json($rows);
    }

    /**
     * Seçilen ile ait ilçeler (önce DB; yoksa API’den çekilip kaydedilir).
     */
    public function districts(int $cityId): JsonResponse
    {
        $city = City::query()->find($cityId);
        if (! $city) {
            return response()->json([]);
        }

        $districts = District::query()
            ->where('city_id', $city->id)
            ->orderBy('name')
            ->get(['id', 'name', 'city_id']);

        if ($districts->isEmpty()) {
            $this->ensureCityHasProvinceExternalId($city);
            $city->refresh();
            $this->syncDistrictsForCity($city);
            $districts = District::query()
                ->where('city_id', $city->id)
                ->orderBy('name')
                ->get(['id', 'name', 'city_id']);
        }

        return response()->json($districts);
    }

    public function neighborhoods(int $districtId): JsonResponse
    {
        $neighborhoods = Neighborhood::query()
            ->where('district_id', $districtId)
            ->orderBy('name')
            ->get(['id', 'name', 'external_id', 'district_id']);

        return response()->json($neighborhoods);
    }

    /**
     * İl kaydında Turkiye API il id’si yoksa (eski seed), isimle eşleştirip kaydeder.
     */
    private function ensureCityHasProvinceExternalId(City $city): void
    {
        if ($city->external_id !== null) {
            return;
        }

        try {
            $api = app(TurkiyeApiService::class);
            $provinces = $api->getProvinces();
            $target = Str::lower(trim($city->name));
            foreach ($provinces as $p) {
                if (! isset($p['id'], $p['name'])) {
                    continue;
                }
                if (Str::lower(trim((string) $p['name'])) === $target) {
                    $city->forceFill(['external_id' => (int) $p['id']])->save();

                    return;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Could not resolve province external_id for city', [
                'city_id' => $city->id,
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function syncDistrictsForCity(City $city): void
    {
        $provinceId = $city->external_id;
        if (! $provinceId) {
            return;
        }

        try {
            $api = app(TurkiyeApiService::class);
            $rows = $api->getDistricts((int) $provinceId);
            if ($rows === []) {
                Log::warning('Turkey API districts empty for province', ['provinceId' => $provinceId, 'city_id' => $city->id]);

                return;
            }

            foreach ($rows as $d) {
                if (! isset($d['id'], $d['name'])) {
                    continue;
                }
                District::query()->updateOrCreate(
                    ['external_id' => (int) $d['id']],
                    [
                        'city_id' => $city->id,
                        'name' => $d['name'],
                    ]
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Turkey API districts sync failed', ['message' => $e->getMessage(), 'city_id' => $city->id]);
        }
    }
}
