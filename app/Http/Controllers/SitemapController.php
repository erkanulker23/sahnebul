<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\BlogPost;
use App\Models\Event;
use App\Models\User;
use App\Models\Venue;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function index(): Response
    {
        $base = rtrim((string) config('app.url'), '/');
        $urls = [];

        $push = function (string $path, ?CarbonInterface $lastmod = null, string $changefreq = 'weekly', string $priority = '0.8') use (&$urls, $base): void {
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

        $eventsMaxAt = Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->listedPublicly())
            ->max('updated_at');
        $venuesMaxAt = Venue::query()->listedPublicly()->max('updated_at');
        $artistsMaxAt = Artist::query()->approved()->notIntlImport()->max('updated_at');
        $blogMaxAt = BlogPost::query()->published()->whereNotNull('published_at')->max('updated_at');

        $toCarbon = static fn (?string $v): ?Carbon => $v !== null && $v !== '' ? Carbon::parse($v) : null;
        $eventsLm = $toCarbon($eventsMaxAt);
        $venuesLm = $toCarbon($venuesMaxAt);
        $artistsLm = $toCarbon($artistsMaxAt);
        $blogLm = $toCarbon($blogMaxAt);

        $catalogTouchStrings = array_filter([$eventsMaxAt, $venuesMaxAt, $artistsMaxAt]);
        $catalogHubLm = count($catalogTouchStrings) > 0
            ? Carbon::parse(max($catalogTouchStrings))
            : null;

        $push('/', $catalogHubLm, 'hourly', '1.0');
        $push('/kesfet/bu-aksam', $eventsLm, 'hourly', '0.85');
        $push('/etkinlikler', $eventsLm, 'hourly', '0.95');
        $push('/sanatcilar', $artistsLm, 'hourly', '0.95');
        $push('/mekanlar', $venuesLm, 'hourly', '0.95');
        $orgsMaxAt = User::query()->publicOrganizationDirectory()->max('updated_at');
        $orgsLm = $toCarbon($orgsMaxAt);
        $push('/organizasyonlar', $orgsLm, 'weekly', '0.85');
        $push('/blog', $blogLm, 'hourly', '0.7');
        $push('/iletisim', null, 'monthly', '0.4');
        $push('/sehir-sec', $eventsLm, 'hourly', '0.6');

        foreach (['hakkimizda', 'gizlilik-politikasi', 'cerez-politikasi', 'kvkk', 'ticari-elektronik-ileti', 'sss'] as $slug) {
            $push('/sayfalar/'.$slug, null, 'yearly', '0.3');
        }

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

        Venue::query()
            ->listedPublicly()
            ->select(['id', 'slug', 'updated_at'])
            ->orderBy('id')
            ->chunkById(500, function ($venues) use (&$push): void {
                foreach ($venues as $v) {
                    $push('/mekanlar/'.$v->slug, $v->updated_at, 'daily', '0.82');
                }
            });

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

        User::query()
            ->publicOrganizationDirectory()
            ->select(['id', 'organization_public_slug', 'updated_at'])
            ->orderBy('id')
            ->chunkById(500, function ($users) use (&$push): void {
                foreach ($users as $u) {
                    /** @var User $u */
                    $slug = trim((string) ($u->organization_public_slug ?? ''));
                    if ($slug === '') {
                        continue;
                    }
                    $push('/organizasyonlar/'.$slug, $u->updated_at, 'weekly', '0.78');
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

    private static function xmlEscape(string $s): string
    {
        return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
