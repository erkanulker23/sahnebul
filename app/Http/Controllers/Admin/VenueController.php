<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Venue;
use App\Models\VenueMedia;
use App\Services\Admin\VenueMergeService;
use App\Services\AppSettingsService;
use App\Services\VenueRemoteCoverImporter;
use App\Support\ArtistProfileInputs;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class VenueController extends Controller
{
    public function __construct(
        private readonly VenueRemoteCoverImporter $remoteCoverImporter,
        private readonly VenueMergeService $venueMergeService,
    ) {}

    public function create()
    {
        return Inertia::render('Admin/Venues/Create', [
            'categories' => Category::orderBy('order')->get(['id', 'name']),
            'googleMapsBrowserKey' => app(AppSettingsService::class)->getGoogleMapsBrowserKey(),
        ]);
    }

    public function index(Request $request)
    {
        $search = trim((string) $request->input('search', ''));

        $venues = Venue::with(['city', 'category'])
            ->withCount('events')
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($search !== '', function ($q) use ($search) {
                $escaped = addcslashes($search, '%_\\');
                $term = '%'.$escaped.'%';
                $q->where(function ($q) use ($term) {
                    $q->where('name', 'like', $term)
                        ->orWhere('slug', 'like', $term)
                        ->orWhere('address', 'like', $term)
                        ->orWhere('phone', 'like', $term)
                        ->orWhereHas('city', fn ($cq) => $cq->where('name', 'like', $term));
                });
            })
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Venues/Index', [
            'venues' => $venues,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $venue = $this->persistNewVenueFromRequest($request);

        return redirect()->route('admin.venues.edit', $venue)->with('success', 'Mekan eklendi. Detayları düzenleyebilirsiniz.');
    }

    /**
     * Etkinlik formu modalından mekan ekler; kayıt onaylı olur (etkinlik oluşturma kuralları ile uyumlu).
     */
    public function storeForEventPicker(Request $request)
    {
        $request->merge([
            'status' => 'approved',
            'is_featured' => false,
        ]);

        $venue = $this->persistNewVenueFromRequest($request);

        return response()->json([
            'venue' => [
                'id' => $venue->id,
                'name' => $venue->name,
            ],
        ], 201);
    }

    private function persistNewVenueFromRequest(Request $request): Venue
    {
        $request->merge([
            'description' => $request->input('description') ?: null,
            'latitude' => $request->input('latitude') ?: null,
            'longitude' => $request->input('longitude') ?: null,
            'capacity' => $request->input('capacity') ?: null,
            'phone' => $request->input('phone') ?: null,
            'whatsapp' => $request->input('whatsapp') ?: null,
            'website' => $request->input('website') ?: null,
            'cover_image' => $request->input('cover_image') ?: null,
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
            'address' => 'required|string|max:1000',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'capacity' => 'nullable|integer|min:1',
            'phone' => 'nullable|string|max:40',
            'whatsapp' => 'nullable|string|max:40',
            'website' => 'nullable|url|max:255',
            'social_links' => 'nullable|array',
            'social_links.*' => 'nullable|string|max:500',
            'cover_image' => 'nullable|string|max:4096',
            'status' => 'required|in:pending,approved,rejected',
            'cover_upload' => 'nullable|image|max:10240',
            'is_featured' => 'nullable|boolean',
        ]);

        unset($validated['cover_upload']);
        if ($request->hasFile('cover_upload')) {
            $validated['cover_image'] = $request->file('cover_upload')->store('venue-covers', 'public');
        } else {
            $validated['cover_image'] = $this->mirrorRemoteVenueCoverIfNeeded($validated['cover_image'] ?? null);
        }

        $validated['is_featured'] = $request->boolean('is_featured');

        $normalizedName = mb_strtolower(trim($validated['name']));
        if ($normalizedName !== '' && Venue::query()
            ->where('city_id', $validated['city_id'])
            ->whereRaw('LOWER(TRIM(name)) = ?', [$normalizedName])
            ->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Bu şehirde aynı isimde bir mekan zaten kayıtlı.',
            ]);
        }

        $slugBase = Str::slug($validated['name']);
        $validated['slug'] = $slugBase.'-'.Str::lower(Str::random(4));

        return Venue::create($validated);
    }

    public function edit(Venue $venue)
    {
        $venue->load(['city', 'category', 'media']);
        $venue->loadCount('events');

        return Inertia::render('Admin/Venues/Edit', [
            'venue' => $venue,
            'categories' => Category::orderBy('order')->get(['id', 'name']),
            'googleMapsBrowserKey' => app(AppSettingsService::class)->getGoogleMapsBrowserKey(),
        ]);
    }

    public function update(Request $request, Venue $venue)
    {
        $request->merge([
            'description' => $request->input('description') ?: null,
            'latitude' => $request->input('latitude') ?: null,
            'longitude' => $request->input('longitude') ?: null,
            'capacity' => $request->input('capacity') ?: null,
            'phone' => $request->input('phone') ?: null,
            'whatsapp' => $request->input('whatsapp') ?: null,
            'website' => $request->input('website') ?: null,
            'cover_image' => $request->input('cover_image') ?: null,
            'district_id' => $request->input('district_id') ?: null,
            'neighborhood_id' => $request->input('neighborhood_id') ?: null,
            'social_links' => ArtistProfileInputs::normalizeSocialLinks($request->input('social_links')),
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('venues', 'slug')->ignore($venue->id),
            ],
            'category_id' => 'required|exists:categories,id',
            'city_id' => 'required|exists:cities,id',
            'district_id' => 'nullable|exists:districts,id',
            'neighborhood_id' => 'nullable|exists:neighborhoods,id',
            'description' => 'nullable|string',
            'address' => 'required|string|max:1000',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'capacity' => 'nullable|integer|min:1',
            'phone' => 'nullable|string|max:40',
            'whatsapp' => 'nullable|string|max:40',
            'website' => 'nullable|url|max:255',
            'social_links' => 'nullable|array',
            'social_links.*' => 'nullable|string|max:500',
            'cover_image' => 'nullable|string|max:4096',
            'status' => 'required|in:pending,approved,rejected',
            'cover_upload' => 'nullable|image|max:10240',
            'is_featured' => 'nullable|boolean',
        ]);

        unset($validated['cover_upload']);
        if ($request->hasFile('cover_upload')) {
            if ($venue->cover_image && ! Str::startsWith($venue->cover_image, ['http://', 'https://'])) {
                Storage::disk('public')->delete($venue->cover_image);
            }
            $validated['cover_image'] = $request->file('cover_upload')->store('venue-covers', 'public');
        } else {
            $validated['cover_image'] = $this->mirrorRemoteVenueCoverIfNeeded(
                $validated['cover_image'] ?? null,
                $venue->cover_image,
            );
        }

        $validated['is_featured'] = $request->boolean('is_featured');
        $validated['slug'] = Str::slug($validated['slug']);

        $normalizedName = mb_strtolower(trim($validated['name']));
        if ($normalizedName !== '' && Venue::query()
            ->where('id', '!=', $venue->id)
            ->where('city_id', $validated['city_id'])
            ->whereRaw('LOWER(TRIM(name)) = ?', [$normalizedName])
            ->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Bu şehirde bu isimde başka bir mekan zaten kayıtlı.',
            ]);
        }

        $venue->update($validated);

        return back()->with('success', 'Mekan güncellendi.');
    }

    /**
     * Google Places vb. ile gelen kapak URL'sini hemen diske alır (form kaydı beklemeden).
     */
    public function importRemoteCover(Request $request, Venue $venue)
    {
        $validated = $request->validate([
            'url' => 'required|string|url|max:4096',
        ]);

        $url = $validated['url'];

        if (! $this->remoteCoverImporter->isMirrorableUrl($url)) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Bu kaynaktan otomatik kapak indirme desteklenmiyor.'], 422);
            }

            return back()->withErrors(['url' => 'Bu kaynaktan otomatik kapak indirme desteklenmiyor.']);
        }

        $path = $this->remoteCoverImporter->importToPublicDisk($url);

        if ($path === null) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Görsel indirilemedi. Lütfen tekrar deneyin.'], 422);
            }

            return back()->withErrors(['url' => 'Görsel indirilemedi. Lütfen tekrar deneyin.']);
        }

        if ($venue->cover_image && ! Str::startsWith($venue->cover_image, ['http://', 'https://'])) {
            Storage::disk('public')->delete($venue->cover_image);
        }

        $venue->update(['cover_image' => $path]);

        if ($request->expectsJson()) {
            return response()->json(['cover_image' => $path]);
        }

        return back()->with('success', 'Kapak görseli sunucuya kaydedildi.');
    }

    /**
     * Harici (Google) kapak URL'sini venue-covers altına kopyalar; zaten yerel yol ise dokunmaz.
     *
     * @param  ?string  $previousCover  Güncellemede eski kapak (yerel dosya silmek için)
     */
    private function mirrorRemoteVenueCoverIfNeeded(?string $incoming, ?string $previousCover = null): ?string
    {
        if ($incoming === null || $incoming === '') {
            return null;
        }

        if (! Str::startsWith($incoming, ['http://', 'https://'])) {
            return $incoming;
        }

        if (! $this->remoteCoverImporter->isMirrorableUrl($incoming)) {
            return $incoming;
        }

        $path = $this->remoteCoverImporter->importToPublicDisk($incoming);

        if ($path === null) {
            return $incoming;
        }

        if ($previousCover && ! Str::startsWith($previousCover, ['http://', 'https://'])) {
            Storage::disk('public')->delete($previousCover);
        }

        return $path;
    }

    public function storeMedia(Request $request, Venue $venue)
    {
        $request->validate([
            'photo' => 'nullable|image|max:10240',
            'photos' => 'nullable|array|max:50',
            'photos.*' => 'image|max:10240',
        ]);

        /** @var Collection<int, UploadedFile> $files */
        $files = collect();
        if ($request->hasFile('photo')) {
            $files->push($request->file('photo'));
        }
        if ($request->hasFile('photos')) {
            foreach (Arr::wrap($request->file('photos')) as $file) {
                if ($file) {
                    $files->push($file);
                }
            }
        }

        if ($files->isEmpty()) {
            return back()->withErrors(['photos' => 'En az bir görsel seçin.']);
        }

        $order = (int) ($venue->media()->max('order') ?? 0);

        foreach ($files as $file) {
            $order++;
            $path = $file->store('venue-media', 'public');
            VenueMedia::create([
                'venue_id' => $venue->id,
                'type' => 'photo',
                'path' => $path,
                'order' => $order,
            ]);
        }

        $n = $files->count();

        return back()->with('success', $n === 1 ? 'Fotoğraf galeriye eklendi.' : "{$n} fotoğraf galeriye eklendi.");
    }

    public function destroyMedia(Venue $venue, VenueMedia $media)
    {
        abort_if($media->venue_id !== $venue->id, 404);

        if ($media->path) {
            Storage::disk('public')->delete($media->path);
        }
        if ($media->thumbnail) {
            Storage::disk('public')->delete($media->thumbnail);
        }
        $media->delete();

        return back()->with('success', 'Görsel kaldırıldı.');
    }

    public function approve(Venue $venue)
    {
        $venue->update(['status' => 'approved']);

        return back()->with('success', 'Mekan onaylandı.');
    }

    public function reject(Venue $venue)
    {
        $venue->update(['status' => 'rejected']);

        return back()->with('success', 'Mekan reddedildi.');
    }

    public function destroy(Venue $venue)
    {
        $this->performVenueDelete($venue);

        return redirect()->route('admin.venues.index')->with('success', 'Mekan silindi.');
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:venues,id'],
        ]);

        $ids = array_values(array_unique(array_map('intval', $validated['ids'])));

        $count = (int) DB::transaction(function () use ($ids): int {
            $n = 0;
            foreach ($ids as $id) {
                $venue = Venue::query()->find($id);
                if ($venue) {
                    $this->performVenueDelete($venue);
                    $n++;
                }
            }

            return $n;
        });

        return redirect()->route('admin.venues.index')->with('success', "{$count} mekan silindi.");
    }

    public function merge(Request $request)
    {
        $data = $request->validate([
            'keep_venue_id' => ['required', 'integer', 'exists:venues,id'],
            'merge_venue_id' => ['required', 'integer', 'exists:venues,id', 'different:keep_venue_id'],
        ]);

        $this->venueMergeService->merge((int) $data['keep_venue_id'], (int) $data['merge_venue_id']);

        return redirect()
            ->route('admin.venues.index', $request->only(['search', 'status']))
            ->with('success', 'Mekanlar birleştirildi. Kalan kayıt seçtiğiniz ana mekan; diğeri silindi ve veriler taşındı.');
    }

    private function performVenueDelete(Venue $venue): void
    {
        $venue->loadMissing('events');
        foreach ($venue->events as $event) {
            if ($event->cover_image && ! Str::startsWith($event->cover_image, ['http://', 'https://'])) {
                Storage::disk('public')->delete($event->cover_image);
            }
        }

        $venue->loadMissing('media');
        foreach ($venue->media as $m) {
            if ($m->path) {
                Storage::disk('public')->delete($m->path);
            }
            if ($m->thumbnail) {
                Storage::disk('public')->delete($m->thumbnail);
            }
        }
        if ($venue->cover_image && ! Str::startsWith($venue->cover_image, ['http://', 'https://'])) {
            Storage::disk('public')->delete($venue->cover_image);
        }
        $venue->delete();
    }
}
