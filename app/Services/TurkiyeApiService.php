<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class TurkiyeApiService
{
    public function baseUrl(): string
    {
        return config('services.turkiye_api.base_url', 'https://api.turkiyeapi.dev/v1');
    }

    /**
     * @return array<int, array{id: int, name: string, coordinates?: array{latitude: float, longitude: float}}>
     */
    public function getProvinces(): array
    {
        $response = Http::timeout(60)
            ->acceptJson()
            ->get($this->baseUrl().'/provinces', [
                'limit' => 100,
                'fields' => 'id,name,coordinates',
            ]);

        if (! $response->successful()) {
            return [];
        }

        $data = $response->json();

        return $data['data'] ?? [];
    }

    /**
     * @return array<int, array{id: int, name: string}>
     */
    public function getDistricts(int $provinceId): array
    {
        $response = Http::timeout(90)
            ->acceptJson()
            ->get($this->baseUrl().'/districts', [
                'provinceId' => $provinceId,
                'limit' => 1000,
            ]);

        if (! $response->successful()) {
            return [];
        }

        $data = $response->json();

        return $data['data'] ?? [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getNeighborhoods(int $districtId): array
    {
        $response = Http::timeout(30)
            ->acceptJson()
            ->get($this->baseUrl().'/neighborhoods', [
                'districtId' => $districtId,
                'limit' => 1000,
            ]);

        if (! $response->successful()) {
            return [];
        }

        $data = $response->json();

        return $data['data'] ?? [];
    }
}
