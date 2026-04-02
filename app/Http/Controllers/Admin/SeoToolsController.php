<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class SeoToolsController extends Controller
{
    public function index(): Response
    {
        $base = rtrim((string) config('app.url'), '/');

        return Inertia::render('Admin/SeoTools', [
            'sitemapUrl' => $base.'/sitemap.xml',
            'sitemapChildUrls' => [
                $base.'/sitemap-genel.xml',
                $base.'/sitemap-etkinlikler.xml',
                $base.'/sitemap-mekanlar.xml',
                $base.'/sitemap-sanatcilar.xml',
            ],
            'robotsUrl' => $base.'/robots.txt',
            'searchConsoleUrl' => 'https://search.google.com/search-console',
            'richResultsTestUrl' => 'https://search.google.com/test/rich-results',
        ]);
    }
}
