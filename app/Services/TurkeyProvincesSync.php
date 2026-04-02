<?php

namespace App\Services;

use App\Models\City;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Türkiye API (api.turkiyeapi.dev) ile il listesini senkronize eder.
 *
 * @see https://docs.turkiyeapi.dev/
 */
class TurkeyProvincesSync
{
    public function __construct(
        private readonly TurkiyeApiService $api,
    ) {}

    /**
     * İllerin tamamının DB'de external_id ile kayıtlı olmasını sağlar.
     *
     * @param  bool  $force  true ise 81 il olsa bile API'den ad ve koordinatları yeniler.
     */
    public function sync(bool $force = false): void
    {
        if (! $force) {
            $withExt = City::query()->whereNotNull('external_id')->count();
            if ($withExt >= 81) {
                return;
            }
        }

        Cache::forget('turkey_api_provinces_failed');

        try {
            $provinces = $this->api->getProvinces();
            if ($provinces === []) {
                Log::warning('Turkey API provinces empty response');
                Cache::put('turkey_api_provinces_failed', true, now()->addMinutes(2));

                return;
            }

            $allRows = [];
            foreach ($provinces as $p) {
                if (! isset($p['id'], $p['name'])) {
                    continue;
                }
                $allRows[] = $p;
                $lat = $p['coordinates']['latitude'] ?? null;
                $lng = $p['coordinates']['longitude'] ?? null;
                $externalId = (int) $p['id'];
                $attrs = [
                    'name' => $p['name'],
                    'slug' => Str::slug($p['name']),
                    'latitude' => $lat !== null ? (float) $lat : null,
                    'longitude' => $lng !== null ? (float) $lng : null,
                    'external_id' => $externalId,
                ];

                $city = City::query()->where('external_id', $externalId)->first()
                    ?? City::query()->where('name', $p['name'])->first();

                if ($city) {
                    $city->update($attrs);
                } else {
                    City::query()->create($attrs);
                }
            }

            foreach (City::query()->whereNull('external_id')->get() as $legacy) {
                $match = collect($allRows)->first(fn ($row) => ($row['name'] ?? '') === $legacy->name);
                if ($match && isset($match['id'])) {
                    $lat = $match['coordinates']['latitude'] ?? null;
                    $lng = $match['coordinates']['longitude'] ?? null;
                    $legacy->update([
                        'external_id' => (int) $match['id'],
                        'slug' => Str::slug($match['name']),
                        'latitude' => $lat !== null ? (float) $lat : $legacy->latitude,
                        'longitude' => $lng !== null ? (float) $lng : $legacy->longitude,
                    ]);
                }
            }

            City::query()
                ->whereNull('external_id')
                ->whereDoesntHave('venues')
                ->delete();
        } catch (\Throwable $e) {
            Log::warning('Turkey API provinces sync failed', ['message' => $e->getMessage()]);
            $ttl = City::query()->whereNotNull('external_id')->count() >= 81
                ? now()->addMinutes(10)
                : now()->addMinutes(2);
            Cache::put('turkey_api_provinces_failed', true, $ttl);
        }
    }

    /**
     * Arayüz select'leri için id + name + slug (senkron sonrası).
     *
     * @return array<int, array{id: int, name: string, slug: string}>
     */
    public function forSelect(): array
    {
        $this->sync();

        return City::query()
            ->turkiyeProvinces()
            ->get(['id', 'name', 'slug'])
            ->map(fn (City $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => strtolower(trim((string) $c->slug)),
            ])
            ->values()
            ->all();
    }
}
