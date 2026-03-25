<?php

namespace App\Services;

use App\Models\Artist;
use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\ExternalEvent;
use App\Models\Venue;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class ExternalEventDomainSyncService
{
    public function __construct(
        private readonly CrawlRemoteImageStorage $crawlRemoteImageStorage,
    ) {}

    public function syncToDomain(ExternalEvent $external): ?Event
    {
        $cityName = $this->resolveCityName($external);
        $startDate = $this->resolveStartDate($external);

        if (! $cityName || ! $startDate) {
            return null;
        }

        $city = City::firstOrCreate(
            ['slug' => Str::slug($cityName)],
            ['name' => $cityName]
        );

        $categoryName = $external->category_name ?: 'Konser Alanı';
        $category = Category::firstOrCreate(
            ['slug' => Str::slug($categoryName)],
            ['name' => $categoryName]
        );

        $venue = $this->resolveOrCreateVenueForExternal($external, $category, $city, $cityName);
        if ($venue === null) {
            return null;
        }

        $coverImage = $this->normalizedCrawlImage($external->image_url);

        $event = Event::updateOrCreate(
            [
                'venue_id' => $venue->id,
                'slug' => Str::slug($external->title).'-'.substr($external->fingerprint, 0, 6),
            ],
            [
                'title' => $external->title,
                'description' => trim(($external->description ?? '')."\n\nKaynak: ".($external->external_url ?? $external->source)),
                'start_date' => $startDate,
                'status' => 'draft',
                'cover_image' => $coverImage,
            ]
        );

        $event->artists()->detach();
        $this->attachArtistsFromExternalMeta($event, $external);

        return $event;
    }

    private function resolveOrCreateVenueForExternal(ExternalEvent $external, Category $category, City $city, string $cityName): ?Venue
    {
        $venueName = trim((string) ($external->venue_name ?? ''));
        if ($venueName === '') {
            $venueName = 'Çeşitli Mekanlar';
        }

        $venue = Venue::query()
            ->where('city_id', $city->id)
            ->whereRaw('lower(trim(name)) = lower(trim(?))', [$venueName])
            ->first();

        $street = (string) data_get($external->meta, 'raw.location.address.streetAddress', '');
        $lat = data_get($external->meta, 'raw.location.geo.latitude');
        $lng = data_get($external->meta, 'raw.location.geo.longitude');
        $latF = is_numeric($lat) ? (float) $lat : null;
        $lngF = is_numeric($lng) ? (float) $lng : null;

        if ($venue !== null) {
            $updates = [];
            // Dış kaynak görseli etkinlik afişidir; mevcut mekanın kapağını asla güncelleme.
            if ($street !== '' && ($venue->address === null || $venue->address === '' || $venue->address === $venue->name.', '.$cityName)) {
                $updates['address'] = $street;
            }
            if ($latF !== null && $lngF !== null && $latF !== 0.0 && $lngF !== 0.0) {
                if ($venue->latitude === null || $venue->longitude === null) {
                    $updates['latitude'] = $latF;
                    $updates['longitude'] = $lngF;
                }
            }
            if ($venue->status !== 'approved' && $venue->user_id === null) {
                $updates['status'] = 'approved';
            }
            if ($updates !== []) {
                $venue->update($updates);
            }

            return $venue;
        }

        $baseSlug = Str::slug($venueName.' '.$cityName);
        if ($baseSlug === '') {
            $baseSlug = 'mekan';
        }
        $slug = $baseSlug;
        $n = 0;
        while (Venue::query()->where('slug', $slug)->exists()) {
            $n++;
            $slug = $baseSlug.'-'.$n;
        }

        $address = $street !== '' ? $street : $venueName.', '.$city->name;

        return Venue::create([
            'name' => $venueName,
            'slug' => $slug,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'address' => $address,
            'latitude' => ($latF !== null && $lngF !== null && $latF !== 0.0 && $lngF !== 0.0) ? $latF : null,
            'longitude' => ($latF !== null && $lngF !== null && $latF !== 0.0 && $lngF !== 0.0) ? $lngF : null,
            // Crawl görseli etkinliğe yazılır; mekan kaydı için afişi kapak yapmıyoruz.
            'cover_image' => null,
            'status' => 'approved',
        ]);
    }

    private function normalizedCrawlImage(?string $url): ?string
    {
        if ($url === null || trim($url) === '') {
            return null;
        }

        $stored = $this->crawlRemoteImageStorage->persistPublicIfRemote($url, 'external-events');

        return $stored ?? $url;
    }

    private function attachArtistsFromExternalMeta(Event $event, ExternalEvent $external): void
    {
        $names = $this->performerNamesFromExternal($external);
        if ($names === []) {
            $names = $this->fallbackPerformerNamesFromTitle($external->title);
        }
        if ($names === []) {
            return;
        }

        foreach ($names as $name) {
            $trimmed = trim(preg_replace('/\s+/u', ' ', $name) ?? '');
            if ($trimmed === '') {
                continue;
            }

            $artist = $this->findOrCreateArtistByName($trimmed);

            if ($event->artists()->where('artists.id', $artist->id)->exists()) {
                continue;
            }

            $count = $event->artists()->count();
            $event->artists()->attach($artist->id, [
                'is_headliner' => $count === 0,
                'order' => $count,
            ]);
        }
    }

    private function findOrCreateArtistByName(string $name): Artist
    {
        $name = trim(preg_replace('/\s+/u', ' ', $name) ?? '');
        $existing = Artist::query()
            ->whereRaw('lower(trim(name)) = lower(trim(?))', [$name])
            ->first();
        if ($existing) {
            return $existing;
        }

        $base = Str::slug($name);
        if ($base === '') {
            $base = 'sanatci';
        }
        $slug = $base;
        $n = 0;
        while (Artist::query()->where('slug', $slug)->exists()) {
            $n++;
            $slug = $base.'-'.$n;
        }

        return Artist::create([
            'name' => $name,
            'slug' => $slug,
            'status' => 'approved',
        ]);
    }

    /**
     * JSON-LD'de performer yoksa başlıktan (virgülle çoklu isim) türetilir.
     *
     * @return list<string>
     */
    private function fallbackPerformerNamesFromTitle(string $title): array
    {
        $t = trim(preg_replace('/\s+Konseri?$/iu', '', trim($title)) ?? '');
        if ($t === '' || mb_strlen($t) > 240) {
            return [];
        }
        if (str_contains($t, ',')) {
            $parts = array_map('trim', explode(',', $t));

            return array_values(array_filter($parts, fn ($p) => $p !== '' && mb_strlen($p) < 120));
        }

        return [$t];
    }

    /**
     * @return list<string>
     */
    private function performerNamesFromExternal(ExternalEvent $external): array
    {
        $raw = data_get($external->meta, 'raw.performer');
        if ($raw === null || $raw === '') {
            return [];
        }

        $names = [];
        if (is_string($raw)) {
            $names[] = trim($raw);
        } elseif (is_array($raw)) {
            if (isset($raw['name'])) {
                $names[] = trim((string) $raw['name']);
            } else {
                foreach ($raw as $item) {
                    if (is_string($item)) {
                        $names[] = trim($item);
                    } elseif (is_array($item) && isset($item['name'])) {
                        $names[] = trim((string) $item['name']);
                    }
                }
            }
        }

        $names = array_values(array_unique(array_filter($names, fn ($n) => $n !== '')));

        return $names;
    }

    private function resolveCityName(ExternalEvent $external): ?string
    {
        if (! empty($external->city_name)) {
            return trim((string) $external->city_name);
        }

        $rawCity = data_get($external->meta, 'raw.location.address.addressLocality');
        if (is_string($rawCity) && trim($rawCity) !== '') {
            return trim($rawCity);
        }

        return data_get(config('crawler.sources'), "{$external->source}.city", 'İstanbul');
    }

    private function resolveStartDate(ExternalEvent $external): ?string
    {
        if (! empty($external->start_date)) {
            return Carbon::parse($external->start_date)->toDateTimeString();
        }

        $rawStart = data_get($external->meta, 'raw.startDate');
        if (! is_string($rawStart) || trim($rawStart) === '') {
            return null;
        }

        $normalized = str_replace('::', ':', trim($rawStart));

        try {
            return Carbon::parse($normalized)->toDateTimeString();
        } catch (\Throwable) {
            return null;
        }
    }
}
