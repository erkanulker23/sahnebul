<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\Category;
use App\Models\Event;
use App\Support\EventListingQuery;
use App\Support\RequestGeoQuery;
use App\Support\SehirSecCityDistricts;
use App\Support\SehirSecCityPromoStories;
use App\Support\SehirSecPlatformEvents;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SehirSecCityController extends Controller
{
    public function __invoke(Request $request, string $city): Response|RedirectResponse
    {
        $allowed = array_keys(SehirSecController::CITY_ORDER);
        if (! in_array($city, $allowed, true)) {
            abort(404);
        }

        if (! Schema::hasTable('events')) {
            return $this->emptyCityPage($request, $city);
        }

        $categories = Category::query()
            ->whereHas('venues', function ($vq) use ($city) {
                $vq->listedPublicly()
                    ->whereHas('city', fn ($c) => $c->where('slug', $city))
                    ->whereHas('events', function ($eq) {
                        $eq->published()->whereHas('venue', fn ($v) => $v->listedPublicly());
                    });
            })
            ->orderBy('name')
            ->get(['id', 'name', 'slug'])
            ->map(fn (Category $c) => ['name' => $c->name, 'slug' => $c->slug])
            ->values()
            ->all();

        $activeSlug = $request->query('kategori');
        $activeSlug = is_string($activeSlug) && $activeSlug !== '' ? $activeSlug : null;
        $activeCategorySlug = null;
        if ($activeSlug !== null) {
            foreach ($categories as $c) {
                if ($c['slug'] === $activeSlug) {
                    $activeCategorySlug = $activeSlug;
                    break;
                }
            }
        }

        $districts = SehirSecCityDistricts::optionsForCity($city);
        $districtSlugSet = collect($districts)->pluck('slug')->all();

        $genreRows = Artist::query()
            ->approved()
            ->notIntlImport()
            ->whereHas('events', function ($eq) use ($city) {
                $eq->published()
                    ->whereHas('venue', function ($vq) use ($city) {
                        $vq->listedPublicly()->whereHas('city', fn ($c) => $c->where('slug', $city));
                    });
            })
            ->whereNotNull('genre')
            ->where('genre', '!=', '')
            ->distinct()
            ->orderBy('genre')
            ->pluck('genre');

        $genreLabels = Artist::normalizeDistinctCatalogGenreLabels($genreRows);

        $genres = [];
        $usedGenreSlugs = [];
        foreach ($genreLabels as $g) {
            $slug = Str::slug($g);
            if ($slug === '') {
                continue;
            }
            $base = $slug;
            $n = 2;
            while (isset($usedGenreSlugs[$slug])) {
                $slug = $base.'-'.$n;
                $n++;
            }
            $usedGenreSlugs[$slug] = true;
            $genres[] = ['slug' => $slug, 'label' => $g];
        }

        $genreSlugSet = collect($genres)->pluck('slug')->all();

        $ilce = $request->query('ilce');
        $ilce = is_string($ilce) && $ilce !== '' ? $ilce : null;
        if ($ilce !== null && ! in_array($ilce, $districtSlugSet, true)) {
            $ilce = null;
        }

        $near = RequestGeoQuery::optionalNearLatLng($request);
        $nearLat = $near['lat'] ?? null;
        $nearLng = $near['lng'] ?? null;

        $sanatTuru = $request->query('sanat_turu');
        $sanatTuru = is_string($sanatTuru) && $sanatTuru !== '' ? $sanatTuru : null;
        if ($sanatTuru !== null && ! in_array($sanatTuru, $genreSlugSet, true)) {
            $sanatTuru = null;
        }

        $nearLatQueryOk = $nearLat !== null && $nearLng !== null;

        if (
            ($request->filled('kategori') && $activeCategorySlug === null)
            || ($request->filled('ilce') && $ilce === null)
            || ($request->filled('sanat_turu') && $sanatTuru === null)
            || ($request->filled('near_lat') && ! $nearLatQueryOk)
            || ($request->filled('near_lng') && ! $nearLatQueryOk)
        ) {
            $page = max(1, (int) $request->input('page', 1));

            return redirect()->route(
                'sehir-sec.city',
                array_merge(
                    ['city' => $city],
                    array_filter(
                        [
                            'kategori' => $activeCategorySlug,
                            'ilce' => $ilce,
                            'sanat_turu' => $sanatTuru,
                            'near_lat' => $nearLatQueryOk ? (string) $nearLat : null,
                            'near_lng' => $nearLatQueryOk ? (string) $nearLng : null,
                            'page' => $page > 1 ? (string) $page : null,
                        ],
                        fn ($v) => $v !== null && $v !== ''
                    )
                )
            );
        }

        $listQuery = EventListingQuery::base()->whereHas('venue.city', fn ($q) => $q->where('slug', $city));

        if ($activeCategorySlug !== null) {
            $listQuery->whereHas('venue.category', fn ($q) => $q->where('slug', $activeCategorySlug));
        }

        if ($ilce !== null) {
            $label = SehirSecCityDistricts::labelForSlug($city, $ilce);
            if ($label !== null) {
                $listQuery->whereHas('venue', function ($vq) use ($city, $label) {
                    $vq->whereHas('city', fn ($c) => $c->where('slug', $city))
                        ->whereHas('district', fn ($d) => $d->where('name', $label));
                });
            }
        }

        if ($sanatTuru !== null) {
            $genreLabel = null;
            foreach ($genres as $row) {
                if ($row['slug'] === $sanatTuru) {
                    $genreLabel = $row['label'];
                    break;
                }
            }
            if ($genreLabel !== null) {
                $listQuery->whereHas('artists', fn ($q) => $q->whereGenreLabelMatches($genreLabel));
            }
        }

        $listQuery->with([
            'venue:id,name,slug,city_id,district_id,category_id,cover_image',
            'venue.city:id,name',
            'venue.district:id,name',
            'venue.category:id,name,slug',
            'artists:id,name,slug,avatar,genre',
        ]);

        if ($nearLatQueryOk) {
            EventListingQuery::applyDateThenProximityOrder($listQuery, $nearLat, $nearLng);
        } else {
            EventListingQuery::applyDefaultOrder($listQuery);
        }

        /** @var LengthAwarePaginator<int, Event> $paginator */
        $paginator = $listQuery->paginate(24)->withQueryString();

        $paginator->through(function (Event $row) use ($nearLatQueryOk) {
            $payload = SehirSecPlatformEvents::toPublicTicketCardProps($row);
            if (
                $nearLatQueryOk
                && isset($row->proximity_km)
                && is_numeric($row->proximity_km)
                && (float) $row->proximity_km < 999999
            ) {
                $payload['distance_km'] = round((float) $row->proximity_km, 3);
            }

            return $payload;
        });

        return Inertia::render('SehirSec/CityEvents', [
            'citySlug' => $city,
            'cityName' => SehirSecController::CITY_ORDER[$city] ?? $city,
            'categories' => $categories,
            'activeCategorySlug' => $activeCategorySlug,
            'districts' => $districts,
            'activeDistrictSlug' => $ilce,
            'genres' => $genres,
            'activeGenreSlug' => $sanatTuru,
            'nearLat' => $nearLatQueryOk ? $nearLat : null,
            'nearLng' => $nearLatQueryOk ? $nearLng : null,
            'events' => $paginator,
            'promoStoryRings' => SehirSecCityPromoStories::ringsForCitySlug($city),
        ]);
    }

    private function emptyCityPage(Request $request, string $city): Response
    {
        $page = max(1, (int) $request->input('page', 1));
        $emptyPaginator = new LengthAwarePaginator([], 0, 24, $page, [
            'path' => $request->url(),
            'query' => $request->query(),
        ]);

        return Inertia::render('SehirSec/CityEvents', [
            'citySlug' => $city,
            'cityName' => SehirSecController::CITY_ORDER[$city] ?? $city,
            'categories' => [],
            'activeCategorySlug' => null,
            'districts' => [],
            'activeDistrictSlug' => null,
            'genres' => [],
            'activeGenreSlug' => null,
            'nearLat' => null,
            'nearLng' => null,
            'events' => $emptyPaginator,
            'promoStoryRings' => [],
        ]);
    }
}
