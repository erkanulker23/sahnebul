<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Venue;
use App\Models\VenueMedia;
use App\Services\AppSettingsService;
use App\Support\ArtistProfileInputs;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class VenueController extends Controller
{
    public function index(Request $request)
    {
        $venues = $request->user()
            ->venues()
            ->with(['city', 'category'])
            ->withCount([
                'reservations as reservations_count',
                'events as published_events_count' => fn ($q) => $q->where('status', 'published'),
            ])
            ->latest()
            ->paginate(10);

        $analyticsTotals = [
            'views' => (int) $request->user()->venues()->sum('view_count'),
        ];

        return Inertia::render('Artist/Venues/Index', [
            'venues' => $venues,
            'analyticsTotals' => $analyticsTotals,
        ]);
    }

    public function create()
    {
        $categories = Category::orderBy('order')->get();

        return Inertia::render('Artist/Venues/Create', [
            'categories' => $categories,
            'googleMapsBrowserKey' => app(AppSettingsService::class)->getGoogleMapsBrowserKey(),
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'district_id' => $request->input('district_id') ?: null,
            'neighborhood_id' => $request->input('neighborhood_id') ?: null,
            'social_links' => ArtistProfileInputs::normalizeSocialLinks($request->input('social_links')),
        ]);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'city_id' => 'required|exists:cities,id',
            'district_id' => 'nullable|exists:districts,id',
            'neighborhood_id' => 'nullable|exists:neighborhoods,id',
            'description' => 'nullable|string',
            'address' => 'required|string',
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'capacity' => 'nullable|integer|min:1',
            'phone' => 'nullable|string|max:40',
            'whatsapp' => 'nullable|string|max:40',
            'website' => 'nullable|url|max:255',
            'social_links' => 'nullable|array',
            'social_links.*' => 'nullable|string|max:500',
        ]);

        $validated['user_id'] = $request->user()->id;
        $validated['slug'] = Str::slug($validated['name']).'-'.Str::random(4);
        $validated['status'] = 'pending';

        Venue::create($validated);

        return redirect()->route('artist.venues.index')->with('success', 'Mekan eklendi. Admin onayı bekleniyor.');
    }

    public function edit(Request $request, Venue $venue)
    {
        if ($venue->user_id !== $request->user()->id) {
            abort(403);
        }
        $venue->load(['city', 'district', 'neighborhood', 'category', 'media']);
        $categories = Category::orderBy('order')->get();

        return Inertia::render('Artist/Venues/Edit', [
            'venue' => $venue,
            'categories' => $categories,
            'googleMapsBrowserKey' => app(AppSettingsService::class)->getGoogleMapsBrowserKey(),
        ]);
    }

    public function update(Request $request, Venue $venue)
    {
        if ($venue->user_id !== $request->user()->id) {
            abort(403);
        }
        $request->merge([
            'district_id' => $request->input('district_id') ?: null,
            'neighborhood_id' => $request->input('neighborhood_id') ?: null,
            'social_links' => ArtistProfileInputs::normalizeSocialLinks($request->input('social_links')),
        ]);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'city_id' => 'required|exists:cities,id',
            'district_id' => 'nullable|exists:districts,id',
            'neighborhood_id' => 'nullable|exists:neighborhoods,id',
            'description' => 'nullable|string',
            'address' => 'required|string',
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'capacity' => 'nullable|integer|min:1',
            'phone' => 'nullable|string|max:40',
            'whatsapp' => 'nullable|string|max:40',
            'website' => 'nullable|url|max:255',
            'social_links' => 'nullable|array',
            'social_links.*' => 'nullable|string|max:500',
        ]);

        $venue->update($validated);

        return back()->with('success', 'Mekan güncellendi.');
    }

    public function storeMedia(Request $request, Venue $venue)
    {
        if ($venue->user_id !== $request->user()->id) {
            abort(403);
        }
        $request->validate([
            'photo' => 'required|image|max:10240',
        ]);
        $path = $request->file('photo')->store('venue-media', 'public');
        $order = (int) ($venue->media()->max('order') ?? 0);

        VenueMedia::create([
            'venue_id' => $venue->id,
            'type' => 'photo',
            'path' => $path,
            'order' => $order + 1,
        ]);

        return back()->with('success', 'Fotoğraf galeriye eklendi.');
    }

    public function destroyMedia(Request $request, Venue $venue, VenueMedia $media)
    {
        if ($venue->user_id !== $request->user()->id || $media->venue_id !== $venue->id) {
            abort(403);
        }
        if ($media->path) {
            Storage::disk('public')->delete($media->path);
        }
        if ($media->thumbnail) {
            Storage::disk('public')->delete($media->thumbnail);
        }
        $media->delete();

        return back()->with('success', 'Görsel kaldırıldı.');
    }
}
