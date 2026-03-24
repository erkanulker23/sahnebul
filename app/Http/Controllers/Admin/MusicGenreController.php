<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MusicGenre;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class MusicGenreController extends Controller
{
    public function index()
    {
        $musicGenres = MusicGenre::query()
            ->orderBy('order')
            ->orderBy('name')
            ->get()
            ->map(fn (MusicGenre $g) => [
                'id' => $g->id,
                'name' => $g->name,
                'slug' => $g->slug,
                'order' => $g->order,
                'artists_count' => MusicGenre::usageCount($g),
            ]);

        return Inertia::render('Admin/MusicGenres/Index', ['musicGenres' => $musicGenres]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'order' => 'nullable|integer',
        ]);
        MusicGenre::create([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'order' => $request->order ?? 0,
        ]);

        return back()->with('success', 'Müzik türü eklendi.');
    }

    public function update(Request $request, MusicGenre $musicGenre)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'order' => 'nullable|integer',
        ]);
        $musicGenre->update([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'order' => $request->order ?? $musicGenre->order,
        ]);

        return back()->with('success', 'Müzik türü güncellendi.');
    }

    public function destroy(MusicGenre $musicGenre)
    {
        if (MusicGenre::usageCount($musicGenre) > 0) {
            return back()->with('error', 'Bu müzik türü seçilmiş sanatçılar var; önce profillerden kaldırın.');
        }
        $musicGenre->delete();

        return back()->with('success', 'Müzik türü silindi.');
    }
}
