<?php

namespace App\Console\Commands;

use App\Models\ExternalEvent;
use App\Support\SehirSecCityDistricts;
use App\Support\SehirSecMetaInference;
use Illuminate\Console\Command;

class EnrichSehirSecExternalEventsCommand extends Command
{
    protected $signature = 'marketplaces:enrich-sehir-sec';

    protected $description = 'Bubilet şehir-sec kayıtlarına ilçe ve gösteri türü meta alanlarını venue/başlıktan türetir';

    public function handle(): int
    {
        $q = ExternalEvent::query()->where('source', 'bubilet_sehir_sec');
        $total = $q->count();
        if ($total === 0) {
            $this->warn('Kayıt yok.');

            return self::SUCCESS;
        }

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $updated = 0;
        $q->orderBy('id')->chunkById(100, function ($chunk) use (&$updated, $bar) {
            foreach ($chunk as $row) {
                /** @var ExternalEvent $row */
                $meta = $row->meta;
                if (! is_array($meta)) {
                    $meta = [];
                }
                $citySlug = (string) ($meta['city_slug'] ?? '');
                if ($citySlug === '') {
                    $bar->advance();

                    continue;
                }

                $districtSlug = SehirSecCityDistricts::matchSlugFromVenueLine($row->venue_name, $citySlug);
                $artist = SehirSecMetaInference::artistTypeFromTitle((string) $row->title);

                $meta['district_slug'] = $districtSlug;
                $meta['district_label'] = $districtSlug !== null
                    ? SehirSecCityDistricts::labelForSlug($citySlug, $districtSlug)
                    : null;
                $meta['artist_type_slug'] = $artist['slug'];
                $meta['artist_type_label'] = $artist['label'];

                $row->update(['meta' => $meta]);
                $updated++;
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
        $this->info("Güncellenen kayıt: {$updated}");

        return self::SUCCESS;
    }
}
