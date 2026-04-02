<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\BlogPost;
use App\Models\City;
use App\Models\Event;
use App\Models\User;
use App\Models\Venue;
use App\Support\EventListingTypes;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    /**
     * Sitemap index (https://www.sitemaps.org/protocol.html#index).
     * Search Console’a yalnızca bu URL verilir; alt haritalar otomatik keşfedilir.
     */
    public function index(): Response
    {
        $base = rtrim((string) config('app.url'), '/');

        $generalLm = $this->maxCarbonToAtom($this->generalSectionMaxAt());
        $eventsLm = $this->maxCarbonToAtom($this->eventsSectionMaxAt());
        $venuesLm = $this->maxCarbonToAtom($this->venuesSectionMaxAt());
        $artistsLm = $this->maxCarbonToAtom($this->artistsSectionMaxAt());

        $sitemaps = [
            ['loc' => $base.'/sitemap-genel.xml', 'lastmod' => $generalLm],
            ['loc' => $base.'/sitemap-etkinlikler.xml', 'lastmod' => $eventsLm],
            ['loc' => $base.'/sitemap-mekanlar.xml', 'lastmod' => $venuesLm],
            ['loc' => $base.'/sitemap-sanatcilar.xml', 'lastmod' => $artistsLm],
        ];

        return $this->sitemapIndexResponse($sitemaps);
    }

    public function general(): Response
    {
        $base = rtrim((string) config('app.url'), '/');
        $urls = [];
        $push = $this->makePush($base, $urls);

        $eventsMaxAt = Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->listedPublicly())
            ->max('updated_at');
        $venuesMaxAt = Venue::query()->listedPublicly()->max('updated_at');
        $artistsMaxAt = Artist::query()->approved()->notIntlImport()->max('updated_at');
        $blogMaxAt = BlogPost::query()->published()->whereNotNull('published_at')->max('updated_at');
        $orgsMaxAt = User::query()->publicManagementDirectory()->max('updated_at');

        $toCarbon = static fn (?string $v): ?Carbon => $v !== null && $v !== '' ? Carbon::parse($v) : null;
        $catalogHubLm = $this->catalogHubLastMod($eventsMaxAt, $venuesMaxAt, $artistsMaxAt);
        $blogLm = $toCarbon($blogMaxAt);
        $orgsLm = $toCarbon($orgsMaxAt);

        $push('/', $catalogHubLm, 'hourly', '1.0');
        $push('/management', $orgsLm, 'weekly', '0.85');
        $push('/blog', $blogLm, 'hourly', '0.7');
        $push('/iletisim', null, 'monthly', '0.4');

        foreach (['hakkimizda', 'gizlilik-politikasi', 'cerez-politikasi', 'kvkk', 'ticari-elektronik-ileti', 'sss'] as $slug) {
            $push('/sayfalar/'.$slug, null, 'yearly', '0.3');
        }

        User::query()
            ->publicManagementDirectory()
            ->select(['id', 'organization_public_slug', 'updated_at'])
            ->orderBy('id')
            ->chunkById(500, function ($users) use (&$push): void {
                foreach ($users as $u) {
                    /** @var User $u */
                    $slug = trim((string) ($u->organization_public_slug ?? ''));
                    if ($slug === '') {
                        continue;
                    }
                    $push('/management/'.$slug, $u->updated_at, 'weekly', '0.78');
                }
            });

        BlogPost::query()
            ->published()
            ->whereNotNull('published_at')
            ->select(['id', 'slug', 'updated_at', 'published_at'])
            ->orderBy('id')
            ->chunkById(500, function ($posts) use (&$push): void {
                foreach ($posts as $p) {
                    $lm = $p->updated_at ?? $p->published_at;
                    $push('/blog/'.$p->slug, $lm, 'monthly', '0.65');
                }
            });

        return $this->urlsetResponse($urls);
    }

    public function events(): Response
    {
        $base = rtrim((string) config('app.url'), '/');
        $urls = [];
        $push = $this->makePush($base, $urls);

        $eventsMaxAt = Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->listedPublicly())
            ->max('updated_at');
        $toCarbon = static fn (?string $v): ?Carbon => $v !== null && $v !== '' ? Carbon::parse($v) : null;
        $eventsLm = $toCarbon($eventsMaxAt);

        $push('/kesfet/bu-aksam', $eventsLm, 'hourly', '0.85');
        $push('/etkinlikler', $eventsLm, 'hourly', '0.95');

        foreach (EventListingTypes::slugs() as $typeSlug) {
            $push('/etkinlik/'.$typeSlug, $eventsLm, 'weekly', '0.78');
        }

        $citySlugsForHub = City::query()
            ->turkiyeProvinces()
            ->whereHas('venues', function ($vq) {
                $vq->listedPublicly()
                    ->whereHas('events', function ($eq) {
                        $eq->published()->whereStillVisibleOnPublicListing();
                    });
            })
            ->orderBy('name')
            ->pluck('slug');
        foreach ($citySlugsForHub as $cSlug) {
            $cs = strtolower(trim((string) $cSlug));
            if ($cs === '') {
                continue;
            }
            foreach (EventListingTypes::slugs() as $typeSlug) {
                $push('/etkinlik/'.$cs.'/'.$typeSlug, $eventsLm, 'weekly', '0.72');
            }
        }

        $push('/sehir-sec', $eventsLm, 'hourly', '0.6');

        foreach (['istanbul', 'ankara', 'izmir', 'antalya', 'bursa', 'eskisehir'] as $city) {
            $push('/sehir-sec/'.$city, $eventsLm, 'hourly', '0.65');
        }

        Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->listedPublicly())
            ->select(['id', 'slug', 'updated_at'])
            ->orderBy('id')
            ->chunkById(500, function ($events) use (&$push): void {
                foreach ($events as $e) {
                    /** @var Event $e */
                    $push('/etkinlikler/'.$e->publicUrlSegment(), $e->updated_at, 'daily', '0.9');
                }
            });

        return $this->urlsetResponse($urls);
    }

    public function venues(): Response
    {
        $base = rtrim((string) config('app.url'), '/');
        $urls = [];
        $push = $this->makePush($base, $urls);

        $venuesMaxAt = Venue::query()->listedPublicly()->max('updated_at');
        $venuesLm = $venuesMaxAt !== null && $venuesMaxAt !== '' ? Carbon::parse($venuesMaxAt) : null;

        $push('/mekanlar', $venuesLm, 'hourly', '0.95');

        Venue::query()
            ->listedPublicly()
            ->select(['id', 'slug', 'updated_at'])
            ->orderBy('id')
            ->chunkById(500, function ($venues) use (&$push): void {
                foreach ($venues as $v) {
                    $push('/mekanlar/'.$v->slug, $v->updated_at, 'daily', '0.82');
                }
            });

        return $this->urlsetResponse($urls);
    }

    public function artists(): Response
    {
        $base = rtrim((string) config('app.url'), '/');
        $urls = [];
        $push = $this->makePush($base, $urls);

        $artistsMaxAt = Artist::query()->approved()->notIntlImport()->max('updated_at');
        $artistsLm = $artistsMaxAt !== null && $artistsMaxAt !== '' ? Carbon::parse($artistsMaxAt) : null;

        $push('/sanatcilar', $artistsLm, 'hourly', '0.95');

        Artist::query()
            ->approved()
            ->notIntlImport()
            ->select(['id', 'slug', 'updated_at'])
            ->orderBy('id')
            ->chunkById(500, function ($artists) use (&$push): void {
                foreach ($artists as $a) {
                    $push('/sanatcilar/'.$a->slug, $a->updated_at, 'daily', '0.82');
                }
            });

        return $this->urlsetResponse($urls);
    }

    /**
     * @param  array<int, array{loc: string, lastmod?: string|null}>  $sitemaps
     */
    private function sitemapIndexResponse(array $sitemaps): Response
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $xml .= '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";
        foreach ($sitemaps as $s) {
            $xml .= '  <sitemap>'."\n";
            $xml .= '    <loc>'.self::xmlEscape($s['loc']).'</loc>'."\n";
            if (! empty($s['lastmod'])) {
                $xml .= '    <lastmod>'.self::xmlEscape((string) $s['lastmod']).'</lastmod>'."\n";
            }
            $xml .= '  </sitemap>'."\n";
        }
        $xml .= '</sitemapindex>';

        $newest = null;
        foreach ($sitemaps as $s) {
            if (empty($s['lastmod'])) {
                continue;
            }
            $c = Carbon::parse($s['lastmod']);
            if ($newest === null || $c->gt($newest)) {
                $newest = $c;
            }
        }

        $response = response($xml, 200)
            ->header('Content-Type', 'application/xml; charset=UTF-8')
            ->header('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600');

        if ($newest !== null) {
            $response->header('Last-Modified', $newest->clone()->utc()->format('D, d M Y H:i:s').' GMT');
        }

        return $response;
    }

    /**
     * @param  array<int, array{loc: string, changefreq: string, priority: string, lastmod?: string}>  $urls
     */
    private function urlsetResponse(array $urls): Response
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";
        foreach ($urls as $u) {
            $xml .= '  <url>'."\n";
            $xml .= '    <loc>'.self::xmlEscape($u['loc']).'</loc>'."\n";
            if (isset($u['lastmod'])) {
                $xml .= '    <lastmod>'.self::xmlEscape($u['lastmod']).'</lastmod>'."\n";
            }
            $xml .= '    <changefreq>'.self::xmlEscape($u['changefreq']).'</changefreq>'."\n";
            $xml .= '    <priority>'.self::xmlEscape($u['priority']).'</priority>'."\n";
            $xml .= '  </url>'."\n";
        }
        $xml .= '</urlset>';

        $newest = null;
        foreach ($urls as $u) {
            if (! isset($u['lastmod'])) {
                continue;
            }
            $c = Carbon::parse($u['lastmod']);
            if ($newest === null || $c->gt($newest)) {
                $newest = $c;
            }
        }

        $response = response($xml, 200)
            ->header('Content-Type', 'application/xml; charset=UTF-8')
            ->header('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600');

        if ($newest !== null) {
            $response->header('Last-Modified', $newest->clone()->utc()->format('D, d M Y H:i:s').' GMT');
        }

        return $response;
    }

    /**
     * @param  array<int, array<string, mixed>>  $urls  Mutated by reference via closure
     * @return \Closure(string, ?CarbonInterface, string, string): void
     */
    private function makePush(string $base, array &$urls): \Closure
    {
        return function (string $path, ?CarbonInterface $lastmod = null, string $changefreq = 'weekly', string $priority = '0.8') use (&$urls, $base): void {
            $loc = $base.($path === '' || $path[0] === '/' ? $path : '/'.$path);
            $row = [
                'loc' => $loc,
                'changefreq' => $changefreq,
                'priority' => $priority,
            ];
            if ($lastmod !== null) {
                $row['lastmod'] = $lastmod->toAtomString();
            }
            $urls[] = $row;
        };
    }

    private function catalogHubLastMod(?string $eventsMaxAt, ?string $venuesMaxAt, ?string $artistsMaxAt): ?Carbon
    {
        $catalogTouchStrings = array_filter([$eventsMaxAt, $venuesMaxAt, $artistsMaxAt]);
        if (count($catalogTouchStrings) === 0) {
            return null;
        }

        return Carbon::parse(max($catalogTouchStrings));
    }

    private function generalSectionMaxAt(): ?string
    {
        $eventsMaxAt = Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->listedPublicly())
            ->max('updated_at');
        $venuesMaxAt = Venue::query()->listedPublicly()->max('updated_at');
        $artistsMaxAt = Artist::query()->approved()->notIntlImport()->max('updated_at');
        $blogMaxAt = BlogPost::query()->published()->whereNotNull('published_at')->max('updated_at');
        $orgsMaxAt = User::query()->publicManagementDirectory()->max('updated_at');

        $candidates = array_filter([$eventsMaxAt, $venuesMaxAt, $artistsMaxAt, $blogMaxAt, $orgsMaxAt]);

        return count($candidates) > 0 ? max($candidates) : null;
    }

    private function eventsSectionMaxAt(): ?string
    {
        return Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->listedPublicly())
            ->max('updated_at');
    }

    private function venuesSectionMaxAt(): ?string
    {
        return Venue::query()->listedPublicly()->max('updated_at');
    }

    private function artistsSectionMaxAt(): ?string
    {
        return Artist::query()->approved()->notIntlImport()->max('updated_at');
    }

    private function maxCarbonToAtom(?string $maxAt): ?string
    {
        if ($maxAt === null || $maxAt === '') {
            return null;
        }

        return Carbon::parse($maxAt)->toAtomString();
    }

    private static function xmlEscape(string $s): string
    {
        return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
