<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\AdminCatalogExcelService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CatalogExcelController extends Controller
{
    public function exportVenues(): StreamedResponse
    {
        return AdminCatalogExcelService::exportVenues();
    }

    public function importVenues(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:51200'],
        ]);

        return AdminCatalogExcelService::importVenues($request->file('file'));
    }

    public function exportEvents(): StreamedResponse
    {
        return AdminCatalogExcelService::exportEvents();
    }

    public function importEvents(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:51200'],
        ]);

        return AdminCatalogExcelService::importEvents($request->file('file'));
    }

    public function exportArtists(): StreamedResponse
    {
        return AdminCatalogExcelService::exportArtists();
    }

    public function importArtists(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:51200'],
        ]);

        return AdminCatalogExcelService::importArtists($request->file('file'));
    }

    public function exportCategories(): StreamedResponse
    {
        return AdminCatalogExcelService::exportCategories();
    }

    public function importCategories(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:51200'],
        ]);

        return AdminCatalogExcelService::importCategories($request->file('file'));
    }

    public function exportMusicGenres(): StreamedResponse
    {
        return AdminCatalogExcelService::exportMusicGenres();
    }

    public function importMusicGenres(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:51200'],
        ]);

        return AdminCatalogExcelService::importMusicGenres($request->file('file'));
    }
}
