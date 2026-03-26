<?php

namespace App\Http\Controllers;

use App\Support\SehirSecCityDistricts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ReverseGeocodeController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'city' => 'required|string|in:'.implode(',', array_keys(SehirSecController::CITY_ORDER)),
        ]);

        $city = (string) $validated['city'];
        $lat = (float) $validated['lat'];
        $lng = (float) $validated['lng'];

        $ua = (string) config('services.nominatim.user_agent', 'SahneBul/1.0');
        if (trim($ua) === '') {
            $ua = 'SahneBul/1.0';
        }

        try {
            $response = Http::timeout(12)
                ->withHeaders(['User-Agent' => $ua])
                ->get('https://nominatim.openstreetmap.org/reverse', [
                    'lat' => $lat,
                    'lon' => $lng,
                    'format' => 'json',
                    'addressdetails' => 1,
                    'accept-language' => 'tr',
                ])
                ->throw()
                ->json();
        } catch (\Throwable) {
            return response()->json([
                'district_slug' => null,
                'district_label' => null,
                'map_label' => null,
                'error' => 'geocode_failed',
            ]);
        }

        $address = is_array($response['address'] ?? null) ? $response['address'] : [];
        $slug = SehirSecCityDistricts::matchSlugFromAddressParts($city, $address);
        $label = $slug !== null ? SehirSecCityDistricts::labelForSlug($city, $slug) : null;
        $mapLabel = isset($response['display_name']) && is_string($response['display_name'])
            ? Str::limit(trim($response['display_name']), 140)
            : null;

        return response()->json([
            'district_slug' => $slug,
            'district_label' => $label,
            'map_label' => $mapLabel,
        ]);
    }
}
