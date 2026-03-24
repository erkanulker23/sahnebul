<?php

namespace App\Console\Commands;

use App\Models\City;
use App\Models\District;
use App\Models\Neighborhood;
use App\Services\TurkiyeApiService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class SyncTurkiyeDataCommand extends Command
{
    protected $signature = 'turkiye:sync';
    protected $description = 'Sync provinces, districts and neighborhoods from TurkiyeAPI';

    public function handle(TurkiyeApiService $api): int
    {
        $this->info('Fetching provinces from TurkiyeAPI...');
        $provinces = $api->getProvinces();

        if (empty($provinces)) {
            $this->error('Could not fetch provinces. Check API availability.');
            return 1;
        }

        $this->info('Syncing ' . count($provinces) . ' provinces (iller)...');
        foreach ($provinces as $p) {
            $attrs = [
                'name' => $p['name'],
                'slug' => Str::slug($p['name']),
                'external_id' => $p['id'],
                'latitude' => $p['coordinates']['latitude'] ?? null,
                'longitude' => $p['coordinates']['longitude'] ?? null,
            ];
            $city = City::where('external_id', $p['id'])->orWhere('name', $p['name'])->first();
            $city ? $city->update($attrs) : City::create($attrs);
        }
        $this->info('Provinces synced.');

        $cityByExternalId = City::whereNotNull('external_id')->pluck('id', 'external_id');

        $totalDistricts = 0;
        $totalNeighborhoods = 0;
        $bar = $this->output->createProgressBar(count($provinces));
        $bar->start();

        foreach ($provinces as $province) {
            $cityId = $cityByExternalId[$province['id']] ?? null;
            if (!$cityId) {
                $bar->advance();
                continue;
            }

            $districts = $api->getDistricts($province['id']);
            foreach ($districts as $d) {
                $district = District::updateOrCreate(
                    [
                        'city_id' => $cityId,
                        'external_id' => $d['id'],
                    ],
                    ['name' => $d['name']]
                );
                $totalDistricts++;

                $neighborhoods = $d['neighborhoods'] ?? [];
                foreach ($neighborhoods as $n) {
                    Neighborhood::updateOrCreate(
                        [
                            'district_id' => $district->id,
                            'external_id' => is_array($n) ? ($n['id'] ?? null) : null,
                        ],
                        ['name' => is_array($n) ? $n['name'] : $n]
                    );
                    $totalNeighborhoods++;
                }
            }
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();

        $this->info("Done. {$totalDistricts} districts, {$totalNeighborhoods} neighborhoods synced.");
        return 0;
    }
}
