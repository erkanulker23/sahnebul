<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Concerns\PromoGalleryImportActions;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Venue;
use App\Models\VenueMedia;
use App\Services\AppSettingsService;
use App\Services\EventMediaImportFromUrlService;
use App\Services\VenueRemoteCoverImporter;
use App\Support\ArtistProfileInputs;
use App\Support\TurkishPhone;
use App\Support\UserContactValidation;
use App\Support\VenuePublicUsername;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class VenueController extends Controller
{
    use PromoGalleryImportActions;

    public function checkPublicProfileSlug(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'max:120'],
            'ignore' => ['nullable', 'integer', 'exists:venues,id'],
        ]);
        $ignore = isset($validated['ignore']) ? (int) $validated['ignore'] : null;
        $assess = VenuePublicUsername::assessAvailability($validated['q'], $ignore);

        return response()->json($assess);
    }

    public function suggestPublicProfileSlug(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'ignore' => ['nullable', 'integer', 'exists:venues,id'],
        ]);
        $ignore = isset($validated['ignore']) ? (int) $validated['ignore'] : null;
        $base = VenuePublicUsername::fromDisplayName($validated['name']);
        if ($base === '' || strlen($base) < VenuePublicUsername::MIN_LENGTH) {
            $base = VenuePublicUsername::fallbackBase();
        }
        $suggested = VenuePublicUsername::makeUnique($base, $ignore);

        return response()->json(['suggested' => $suggested]);
    }

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
            'phone' => UserContactValidation::phoneNullable(),
            'whatsapp' => UserContactValidation::whatsappNullable(),
            'website' => 'nullable|url|max:255',
            'social_links' => 'nullable|array',
            'social_links.*' => 'nullable|string|max:500',
            'google_maps_url' => 'nullable|string|max:2048',
            'google_gallery_photo_urls' => 'nullable|array|max:5',
            'google_gallery_photo_urls.*' => 'nullable|string|url|max:4096',
        ]);

        $validated = TurkishPhone::mergeNormalizedInto($validated, ['phone']);
        $validated = TurkishPhone::mergeNormalizedWhatsAppInto($validated, 'whatsapp');

        $galleryUrls = array_values(array_filter(array_map('trim', $validated['google_gallery_photo_urls'] ?? [])));
        $galleryUrls = array_slice($galleryUrls, 0, 5);
        unset($validated['google_gallery_photo_urls']);

        if (empty($validated['google_maps_url'])) {
            $validated['google_maps_url'] = null;
        }

        if ($galleryUrls !== []) {
            $validated['cover_image'] = null;
        }

        $validated['user_id'] = $request->user()->id;
        $base = VenuePublicUsername::fromDisplayName($validated['name']);
        $validated['slug'] = VenuePublicUsername::makeUnique($base, null);
        $validated['status'] = 'pending';

        $venue = Venue::create($validated);

        if ($galleryUrls !== []) {
            app(VenueRemoteCoverImporter::class)->importGoogleGalleryToVenue($venue, $galleryUrls, updateVenueCoverFromFirst: true);
        }

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
        $slugNormalized = VenuePublicUsername::normalize(trim((string) $request->input('slug', '')));
        $request->merge([
            'district_id' => $request->input('district_id') ?: null,
            'neighborhood_id' => $request->input('neighborhood_id') ?: null,
            'social_links' => ArtistProfileInputs::normalizeSocialLinks($request->input('social_links')),
            'slug' => $slugNormalized,
        ]);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => [
                'required',
                'string',
                'min:'.VenuePublicUsername::MIN_LENGTH,
                'max:'.VenuePublicUsername::MAX_LENGTH,
                'regex:/^[a-z0-9]+$/',
                Rule::unique('venues', 'slug')->ignore($venue->id),
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (is_string($value) && VenuePublicUsername::isReserved($value)) {
                        $fail('Bu kullanıcı adı kullanılamaz.');
                    }
                },
            ],
            'category_id' => 'required|exists:categories,id',
            'city_id' => 'required|exists:cities,id',
            'district_id' => 'nullable|exists:districts,id',
            'neighborhood_id' => 'nullable|exists:neighborhoods,id',
            'description' => 'nullable|string',
            'address' => 'required|string',
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'capacity' => 'nullable|integer|min:1',
            'phone' => UserContactValidation::phoneNullable(),
            'whatsapp' => UserContactValidation::whatsappNullable(),
            'website' => 'nullable|url|max:255',
            'social_links' => 'nullable|array',
            'social_links.*' => 'nullable|string|max:500',
            'google_maps_url' => 'nullable|string|max:2048',
        ], [
            'slug.unique' => 'Bu kullanıcı adı kullanılmaktadır.',
        ]);

        $validated = TurkishPhone::mergeNormalizedInto($validated, ['phone']);
        $validated = TurkishPhone::mergeNormalizedWhatsAppInto($validated, 'whatsapp');

        if (empty($validated['google_maps_url'])) {
            $validated['google_maps_url'] = null;
        }

        $venue->update($validated);

        return back()->with('success', 'Mekan güncellendi.');
    }

    /**
     * Google Places’tan gelen görsel URL’lerini (en fazla 5) galeriye indirir; isteğe bağlı ilk görsel kapak olur.
     */
    public function importRemoteGoogleGallery(Request $request, Venue $venue)
    {
        if ($venue->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'urls' => 'required|array|min:1|max:5',
            'urls.*' => 'required|string|url|max:4096',
            'set_cover_from_first' => 'nullable|boolean',
        ]);

        $urls = array_values(array_filter(array_map('trim', $validated['urls'])));
        $urls = array_slice($urls, 0, 5);

        app(VenueRemoteCoverImporter::class)->importGoogleGalleryToVenue(
            $venue,
            $urls,
            updateVenueCoverFromFirst: $request->boolean('set_cover_from_first'),
        );

        if ($request->expectsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'Google görselleri galeriye eklendi.');
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

    public function importPromoMediaFromUrl(Request $request, Venue $venue, EventMediaImportFromUrlService $importer)
    {
        if ($venue->user_id !== $request->user()->id) {
            abort(403);
        }

        return $this->promoImportMediaFromUrlResponse($request, $venue, $importer, true);
    }

    public function appendPromoFiles(Request $request, Venue $venue, EventMediaImportFromUrlService $importer)
    {
        if ($venue->user_id !== $request->user()->id) {
            abort(403);
        }

        return $this->promoAppendFilesResponse($request, $venue, $importer);
    }

    public function clearPromoMedia(Request $request, Venue $venue, EventMediaImportFromUrlService $importer)
    {
        if ($venue->user_id !== $request->user()->id) {
            abort(403);
        }

        return $this->promoClearResponse($venue, $importer);
    }

    public function removePromoGalleryItem(Request $request, Venue $venue, EventMediaImportFromUrlService $importer)
    {
        if ($venue->user_id !== $request->user()->id) {
            abort(403);
        }

        return $this->promoRemoveItemResponse($request, $venue, $importer);
    }
}
