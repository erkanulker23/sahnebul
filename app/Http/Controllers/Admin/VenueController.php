<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\PromoGalleryImportActions;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueMedia;
use App\Services\Admin\VenueMergeService;
use App\Services\AppSettingsService;
use App\Services\EventMediaImportFromUrlService;
use App\Services\SahnebulMail;
use App\Services\VenueRemoteCoverImporter;
use App\Support\ArtistProfileInputs;
use App\Support\TurkishPhone;
use App\Support\UpcomingSevenDayEventWindow;
use App\Support\UserContactValidation;
use App\Support\VenuePublicUsername;
use Illuminate\Http\JsonResponse;
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
    use PromoGalleryImportActions;

    public function __construct(
        private readonly VenueRemoteCoverImporter $remoteCoverImporter,
        private readonly VenueMergeService $venueMergeService,
    ) {}

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

        $venues = Venue::with(['city', 'category', 'user:id,name,email'])
            ->withCount([
                'events',
                'events as weekly_events_count' => fn ($q) => UpcomingSevenDayEventWindow::applyToEloquent(
                    $q->whereNotNull('start_date')
                ),
            ])
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
            ->paginate(50)
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
            'is_active' => true,
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
            'google_maps_url' => $request->input('google_maps_url') ?: null,
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
            'google_maps_url' => 'nullable|string|max:2048',
            'capacity' => 'nullable|integer|min:1',
            'phone' => UserContactValidation::phoneNullable(),
            'whatsapp' => UserContactValidation::whatsappNullable(),
            'website' => 'nullable|url|max:255',
            'social_links' => 'nullable|array',
            'social_links.*' => 'nullable|string|max:500',
            'cover_image' => 'nullable|string|max:4096',
            'status' => 'required|in:pending,approved,rejected',
            'cover_upload' => 'nullable|image|max:10240',
            'is_featured' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'google_gallery_photo_urls' => 'nullable|array|max:5',
            'google_gallery_photo_urls.*' => 'nullable|string|url|max:4096',
        ]);

        $validated = TurkishPhone::mergeNormalizedInto($validated, ['phone']);
        $validated = TurkishPhone::mergeNormalizedWhatsAppInto($validated, 'whatsapp');

        $galleryUrls = array_values(array_filter(array_map('trim', $validated['google_gallery_photo_urls'] ?? [])));
        $galleryUrls = array_slice($galleryUrls, 0, 5);
        unset($validated['google_gallery_photo_urls']);

        unset($validated['cover_upload']);
        $hadCoverUpload = $request->hasFile('cover_upload');
        if ($hadCoverUpload) {
            $validated['cover_image'] = $request->file('cover_upload')->store('venue-covers', 'public');
        } elseif ($galleryUrls !== []) {
            $validated['cover_image'] = null;
        } else {
            $validated['cover_image'] = $this->mirrorRemoteVenueCoverIfNeeded($validated['cover_image'] ?? null);
        }

        $validated['is_featured'] = $request->boolean('is_featured');
        $validated['is_active'] = $request->boolean('is_active', true);
        if (empty($validated['google_maps_url'])) {
            $validated['google_maps_url'] = null;
        }

        $normalizedName = mb_strtolower(trim($validated['name']));
        if ($normalizedName !== '' && Venue::query()
            ->where('city_id', $validated['city_id'])
            ->whereRaw('LOWER(TRIM(name)) = ?', [$normalizedName])
            ->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Bu şehirde aynı isimde bir mekan zaten kayıtlı.',
            ]);
        }

        $base = VenuePublicUsername::fromDisplayName($validated['name']);
        $validated['slug'] = VenuePublicUsername::makeUnique($base, null);

        $venue = Venue::create($validated);

        if ($galleryUrls !== []) {
            $this->remoteCoverImporter->importGoogleGalleryToVenue($venue, $galleryUrls, updateVenueCoverFromFirst: ! $hadCoverUpload);
        }

        return $venue;
    }

    public function edit(Venue $venue)
    {
        $venue->load(['city', 'category', 'media', 'user:id,name,email']);
        $venue->loadCount('events');

        $owner = $venue->user;
        $venueSubscriptionPlans = SubscriptionPlan::query()
            ->adminAssignableFor('venue')
            ->get(['id', 'name', 'slug', 'interval', 'price', 'membership_type']);

        $venueOwnerSubscription = null;
        if ($owner !== null) {
            $sub = $owner->activeSubscription()?->load('plan');
            if ($sub !== null) {
                $venueOwnerSubscription = [
                    'starts_at' => $sub->starts_at->toIso8601String(),
                    'ends_at' => $sub->ends_at->toIso8601String(),
                    'plan' => $sub->plan !== null
                        ? [
                            'id' => $sub->plan->id,
                            'name' => $sub->plan->name,
                            'slug' => $sub->plan->slug,
                            'membership_type' => $sub->plan->membership_type,
                        ]
                        : null,
                ];
            }
        }

        $venueOwnerCandidates = User::query()
            ->where(function ($outer) use ($venue) {
                $outer->where(function ($q) {
                    $q->where('role', 'venue_owner')->where('is_active', true);
                });
                if ($venue->user_id) {
                    $outer->orWhere('id', $venue->user_id);
                }
            })
            ->orderBy('name')
            ->limit(500)
            ->get(['id', 'name', 'email', 'role', 'is_active'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role_label' => $u->role === 'venue_owner' ? null : $u->role,
                'inactive' => ! $u->is_active,
            ])
            ->values()
            ->all();

        return Inertia::render('Admin/Venues/Edit', [
            'venue' => $venue,
            'categories' => Category::orderBy('order')->get(['id', 'name']),
            'googleMapsBrowserKey' => app(AppSettingsService::class)->getGoogleMapsBrowserKey(),
            'venueOwner' => $owner !== null
                ? ['id' => $owner->id, 'name' => $owner->name, 'email' => $owner->email]
                : null,
            'venueOwnerCandidates' => $venueOwnerCandidates,
            'venueSubscriptionPlans' => $venueSubscriptionPlans,
            'venueOwnerSubscription' => $venueOwnerSubscription,
        ]);
    }

    public function update(Request $request, Venue $venue)
    {
        $slugNormalized = VenuePublicUsername::normalize(trim((string) $request->input('slug', '')));
        $request->merge([
            'description' => $request->input('description') ?: null,
            'latitude' => $request->input('latitude') ?: null,
            'longitude' => $request->input('longitude') ?: null,
            'google_maps_url' => $request->input('google_maps_url') ?: null,
            'capacity' => $request->input('capacity') ?: null,
            'phone' => $request->input('phone') ?: null,
            'whatsapp' => $request->input('whatsapp') ?: null,
            'website' => $request->input('website') ?: null,
            'cover_image' => $request->input('cover_image') ?: null,
            'district_id' => $request->input('district_id') ?: null,
            'neighborhood_id' => $request->input('neighborhood_id') ?: null,
            'social_links' => ArtistProfileInputs::normalizeSocialLinks($request->input('social_links')),
            'user_id' => ($request->input('user_id') === '' || $request->input('user_id') === null)
                ? null
                : (int) $request->input('user_id'),
            'slug' => $slugNormalized,
            'platform_verified' => $request->boolean('platform_verified'),
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
            'address' => 'required|string|max:1000',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'google_maps_url' => 'nullable|string|max:2048',
            'capacity' => 'nullable|integer|min:1',
            'phone' => UserContactValidation::phoneNullable(),
            'whatsapp' => UserContactValidation::whatsappNullable(),
            'website' => 'nullable|url|max:255',
            'social_links' => 'nullable|array',
            'social_links.*' => 'nullable|string|max:500',
            'cover_image' => 'nullable|string|max:4096',
            'status' => 'required|in:pending,approved,rejected',
            'cover_upload' => 'nullable|image|max:10240',
            'is_featured' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'platform_verified' => 'boolean',
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ], [
            'slug.unique' => 'Bu kullanıcı adı kullanılmaktadır.',
        ]);

        $validated = TurkishPhone::mergeNormalizedInto($validated, ['phone']);
        $validated = TurkishPhone::mergeNormalizedWhatsAppInto($validated, 'whatsapp');

        unset($validated['cover_upload']);
        if ($request->hasFile('cover_upload')) {
            if ($venue->cover_image && ! Str::startsWith($venue->cover_image, ['http://', 'https://'])) {
                Storage::disk('public')->delete($venue->cover_image);
            }
            $validated['cover_image'] = $request->file('cover_upload')->store('venue-covers', 'public');
        } else {
            $incoming = $validated['cover_image'] ?? null;
            if ($incoming !== null && trim((string) $incoming) === '') {
                $incoming = null;
            }
            /** Kapak kaldırıldıysa yerel dosyayı diskten sil (mirror yalnızca dolu URL ile çalışır). */
            if ($incoming === null && $venue->cover_image && ! Str::startsWith($venue->cover_image, ['http://', 'https://'])) {
                Storage::disk('public')->delete($venue->cover_image);
            }
            $validated['cover_image'] = $this->mirrorRemoteVenueCoverIfNeeded(
                $incoming,
                $venue->cover_image,
            );
        }

        $validated['is_featured'] = $request->boolean('is_featured');
        $validated['is_active'] = $request->boolean('is_active');
        if (empty($validated['google_maps_url'])) {
            $validated['google_maps_url'] = null;
        }

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

        $newUserId = array_key_exists('user_id', $validated) ? $validated['user_id'] : $venue->user_id;
        $prevUserId = $venue->user_id;
        if ($newUserId !== null && (int) $newUserId !== (int) ($prevUserId ?? 0)) {
            $assignee = User::query()->find((int) $newUserId);
            if ($assignee === null || ! $assignee->is_active || ! $assignee->isVenueOwner()) {
                throw ValidationException::withMessages([
                    'user_id' => 'Yalnızca aktif «Mekân sahibi» rolündeki kullanıcılar atanabilir. Önce /admin/kullanicilar üzerinden rolü güncelleyin.',
                ]);
            }
        }

        $platformVerified = (bool) ($validated['platform_verified'] ?? false);
        unset($validated['platform_verified']);
        $validated['verified_at'] = $platformVerified
            ? ($venue->verified_at ?? now())
            : null;

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
                return response()->json(['message' => 'Bu görsel adresi kullanılamıyor (geçersiz veya güvenlik nedeniyle engelli).'], 422);
            }

            return back()->withErrors(['url' => 'Bu görsel adresi kullanılamıyor (geçersiz veya güvenlik nedeniyle engelli).']);
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
     * Google Places’tan gelen görsel URL’lerini (en fazla 5) galeriye indirir; mevcut kapak değiştirilmez.
     */
    public function importRemoteGoogleGallery(Request $request, Venue $venue)
    {
        $validated = $request->validate([
            'urls' => 'required|array|min:1|max:5',
            'urls.*' => 'required|string|url|max:4096',
            'set_cover_from_first' => 'nullable|boolean',
        ]);

        $urls = array_values(array_filter(array_map('trim', $validated['urls'])));
        $urls = array_slice($urls, 0, 5);

        $this->remoteCoverImporter->importGoogleGalleryToVenue(
            $venue,
            $urls,
            updateVenueCoverFromFirst: $request->boolean('set_cover_from_first'),
        );

        if ($request->expectsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'Google görselleri galeriye eklendi.');
    }

    /**
     * Harici (Google) kapak URL'sini venue-covers altına kopyalar; zaten yerel yol ise dokunmaz.
     *
     * @param  ?string  $previousCover  Güncellemede eski kapak (yerel dosya silmek için)
     */
    private function mirrorRemoteVenueCoverIfNeeded(?string $incoming, ?string $previousCover = null): ?string
    {
        if ($incoming === null || trim($incoming) === '') {
            return null;
        }

        $incoming = trim($incoming);

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
        $venue->update([
            'status' => 'approved',
            'is_active' => true,
        ]);

        return back()->with('success', 'Mekan onaylandı.');
    }

    public function reject(Venue $venue)
    {
        $venue->update(['status' => 'rejected']);

        return back()->with('success', 'Mekan reddedildi.');
    }

    public function importPromoMediaFromUrl(Request $request, Venue $venue, EventMediaImportFromUrlService $importer)
    {
        return $this->promoImportMediaFromUrlResponse($request, $venue, $importer, true);
    }

    public function appendPromoFiles(Request $request, Venue $venue, EventMediaImportFromUrlService $importer)
    {
        return $this->promoAppendFilesResponse($request, $venue, $importer);
    }

    public function clearPromoMedia(Venue $venue, EventMediaImportFromUrlService $importer)
    {
        return $this->promoClearResponse($venue, $importer);
    }

    public function removePromoGalleryItem(Request $request, Venue $venue, EventMediaImportFromUrlService $importer)
    {
        return $this->promoRemoveItemResponse($request, $venue, $importer);
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
        $venue->loadMissing('user');
        if ($venue->status === 'approved' && $venue->user) {
            SahnebulMail::venueDeletedNotifyOwner($venue->user, $venue->name);
        }

        app(EventMediaImportFromUrlService::class)->purgePromoGallery($venue);
        $venue->refresh();

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
