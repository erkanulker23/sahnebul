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

        $venueName = $external->venue_name ?: 'Çeşitli Mekanlar';
        $venue = Venue::firstOrCreate(
            ['slug' => Str::slug($venueName)],
            [
                'name' => $venueName,
                'category_id' => $category->id,
                'city_id' => $city->id,
                'address' => $venueName . ', ' . $city->name,
                'cover_image' => $external->image_url,
                /** Otomatik içe aktarılan mekanlar; anasayfa /etkinlikler yalnızca approved mekan + published etkinlik gösterir. */
                'status' => 'approved',
            ]
        );

        if ($venue->user_id === null && $venue->status !== 'approved') {
            $venue->update([
                'status' => 'approved',
                'cover_image' => $venue->cover_image ?: $external->image_url,
            ]);
        }

        $event = Event::updateOrCreate(
            [
                'venue_id' => $venue->id,
                'slug' => Str::slug($external->title) . '-' . substr($external->fingerprint, 0, 6),
            ],
            [
                'title' => $external->title,
                'description' => trim(($external->description ?? '') . "\n\nKaynak: " . ($external->external_url ?? $external->source)),
                'start_date' => $startDate,
                'status' => 'published',
                'cover_image' => $external->image_url,
            ]
        );

        $this->attachArtistsFromExternalMeta($event, $external);

        return $event;
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
            $trimmed = trim($name);
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
        $existing = Artist::query()
            ->whereRaw('lower(name) = lower(?)', [$name])
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
            $slug = $base . '-' . $n;
        }

        return Artist::create([
            'name' => $name,
            'slug' => $slug,
            /** Dış kaynak içe aktarımı; liste ve sanatçı sayfası approved bekler. */
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
            return $external->city_name;
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
