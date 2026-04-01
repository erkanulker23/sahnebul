<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\PromoGalleryImportActions;
use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\ArtistMedia;
use App\Models\MusicGenre;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\EventMediaImportFromUrlService;
use App\Services\VenueRemoteCoverImporter;
use App\Support\ArtistProfileInputs;
use App\Support\ArtistPublicUsername;
use App\Support\TurkishPhone;
use App\Support\UpcomingSevenDayEventWindow;
use App\Support\UserContactValidation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ArtistController extends Controller
{
    use PromoGalleryImportActions;

    public function __construct(
        private readonly VenueRemoteCoverImporter $remoteImageImporter,
    ) {}

    public function checkUsernameAvailability(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'max:120'],
            'ignore' => ['nullable', 'integer', 'exists:artists,id'],
        ]);
        $ignore = isset($validated['ignore']) ? (int) $validated['ignore'] : null;
        $assess = ArtistPublicUsername::assessAvailability($validated['q'], $ignore);

        return response()->json($assess);
    }

    public function suggestUsername(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'ignore' => ['nullable', 'integer', 'exists:artists,id'],
        ]);
        $ignore = isset($validated['ignore']) ? (int) $validated['ignore'] : null;
        $base = ArtistPublicUsername::fromDisplayName($validated['name']);
        if ($base === '' || strlen($base) < ArtistPublicUsername::MIN_LENGTH) {
            $base = ArtistPublicUsername::fallbackBase();
        }
        $suggested = ArtistPublicUsername::makeUnique($base, $ignore);

        return response()->json(['suggested' => $suggested]);
    }

    public function create()
    {
        return Inertia::render('Admin/Artists/Create', [
            'musicGenreOptions' => MusicGenre::optionNamesOrdered(),
        ]);
    }

    public function index(Request $request)
    {
        $artists = Artist::query()
            ->withCount([
                'events',
                'events as weekly_events_count' => fn ($q) => UpcomingSevenDayEventWindow::applyToEloquent(
                    $q->whereNotNull('start_date')
                ),
            ])
            ->with(['managedBy:id,name,organization_display_name'])
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Admin/Artists/Index', [
            'artists' => $artists,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function edit(Artist $artist)
    {
        $artist->load(['media', 'user:id,name,email']);
        $artist->loadCount('events');

        $managerUsers = User::query()
            ->where('role', 'manager_organization')
            ->orderBy('name')
            ->get(['id', 'name', 'organization_display_name', 'email']);

        $owner = $artist->user;
        $artistSubscriptionPlans = SubscriptionPlan::query()
            ->adminAssignableFor('artist')
            ->get(['id', 'name', 'slug', 'interval', 'price', 'membership_type']);

        $artistOwnerSubscription = null;
        if ($owner !== null) {
            $sub = $owner->activeSubscription()?->load('plan');
            if ($sub !== null) {
                $artistOwnerSubscription = [
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

        return Inertia::render('Admin/Artists/Edit', [
            'artist' => $artist,
            'managerUsers' => $managerUsers,
            'musicGenreOptions' => MusicGenre::optionNamesOrdered(),
            'artistOwner' => $owner !== null
                ? ['id' => $owner->id, 'name' => $owner->name, 'email' => $owner->email]
                : null,
            'artistSubscriptionPlans' => $artistSubscriptionPlans,
            'artistOwnerSubscription' => $artistOwnerSubscription,
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'bio' => $request->input('bio') ?: null,
            'avatar' => $request->input('avatar') ?: null,
            'banner_image' => $request->input('banner_image') ?: null,
            'website' => $request->input('website') ?: null,
            'social_links' => ArtistProfileInputs::normalizeSocialLinks($request->input('social_links')),
            'manager_info' => ArtistProfileInputs::normalizeStringMap($request->input('manager_info'), ['name', 'company', 'phone', 'email']),
            'public_contact' => ArtistProfileInputs::normalizeStringMap($request->input('public_contact'), ['email', 'phone', 'note']),
            'managed_by_user_id' => $request->filled('managed_by_user_id') ? (int) $request->input('managed_by_user_id') : null,
            'spotify_auto_link_disabled' => $request->boolean('spotify_auto_link_disabled'),
        ]);

        $allowedTypes = MusicGenre::optionNamesOrdered();
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'music_genres' => 'nullable|array',
            'music_genres.*' => ['string', Rule::in($allowedTypes)],
            'bio' => 'nullable|string|max:500000',
            'avatar' => 'nullable|string|max:2048',
            'banner_image' => 'nullable|string|max:2048',
            'website' => 'nullable|url|max:255',
            'status' => 'required|in:pending,approved,rejected',
            'social_links' => 'nullable|array',
            'social_links.*' => 'nullable|string|max:500',
            'manager_info' => 'nullable|array',
            'manager_info.name' => 'nullable|string|max:255',
            'manager_info.company' => 'nullable|string|max:255',
            'manager_info.phone' => UserContactValidation::phoneNullable(),
            'manager_info.email' => UserContactValidation::emailNullable(),
            'public_contact' => 'nullable|array',
            'public_contact.email' => UserContactValidation::emailNullable(),
            'public_contact.phone' => UserContactValidation::phoneNullable(),
            'public_contact.note' => 'nullable|string|max:2000',
            'avatar_upload' => 'nullable|image|max:10240',
            'banner_upload' => 'nullable|image|max:15360',
            'managed_by_user_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($q) => $q->where('role', 'manager_organization')),
            ],
            'spotify_auto_link_disabled' => 'boolean',
            'slug' => 'nullable|string|max:120',
        ]);

        unset($validated['avatar_upload'], $validated['banner_upload']);
        if ($request->hasFile('avatar_upload')) {
            $validated['avatar'] = $request->file('avatar_upload')->store('artist-avatars', 'public');
        } elseif (! empty($validated['avatar']) && is_string($validated['avatar'])) {
            $avatarUrl = trim($validated['avatar']);
            if ($avatarUrl !== '' && Str::startsWith($avatarUrl, ['http://', 'https://'])) {
                $validated['avatar'] = $this->importArtistImageFromUrl($avatarUrl, 'artist-avatars', 'avatar');
            }
        }
        if ($request->hasFile('banner_upload')) {
            $validated['banner_image'] = $request->file('banner_upload')->store('artist-banners', 'public');
        } elseif (! empty($validated['banner_image']) && is_string($validated['banner_image'])) {
            $bannerUrl = trim($validated['banner_image']);
            if ($bannerUrl !== '' && Str::startsWith($bannerUrl, ['http://', 'https://'])) {
                $validated['banner_image'] = $this->importArtistImageFromUrl($bannerUrl, 'artist-banners', 'banner_image');
            }
        }

        $validated = TurkishPhone::mergeNormalizedInto($validated, [
            'manager_info.phone',
            'public_contact.phone',
        ]);

        $rawGenres = $validated['music_genres'] ?? [];
        $mg = array_values(array_unique(array_filter(is_array($rawGenres) ? $rawGenres : [])));
        $validated['music_genres'] = $mg === [] ? null : $mg;
        $validated['genre'] = $mg === [] ? null : implode(', ', $mg);

        self::applySpotifyFromAdminSocialLinks($validated);

        $normalizedName = mb_strtolower(trim($validated['name']));
        if ($normalizedName !== '' && Artist::query()->whereRaw('LOWER(TRIM(name)) = ?', [$normalizedName])->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Bu isimde bir sanatçı zaten kayıtlı.',
            ]);
        }

        $slugInput = $request->input('slug');
        if (is_string($slugInput) && trim($slugInput) !== '') {
            $assess = ArtistPublicUsername::assessAvailability($slugInput, null);
            if (! $assess['ok']) {
                throw ValidationException::withMessages([
                    'slug' => $assess['message'] ?? 'Geçersiz kullanıcı adı.',
                ]);
            }
            $slug = $assess['normalized'];
        } else {
            $slug = ArtistPublicUsername::makeUnique(
                ArtistPublicUsername::fromDisplayName($validated['name']),
                null,
            );
        }
        unset($validated['slug']);

        $artist = Artist::create([
            ...$validated,
            'slug' => $slug,
        ]);

        return redirect()->route('admin.artists.edit', $artist)->with('success', 'Sanatçı eklendi. Detayları düzenleyebilirsiniz.');
    }

    public function update(Request $request, Artist $artist)
    {
        $request->merge([
            'bio' => $request->input('bio') ?: null,
            'avatar' => $request->input('avatar') ?: null,
            'banner_image' => $request->input('banner_image') ?: null,
            'website' => $request->input('website') ?: null,
            'social_links' => ArtistProfileInputs::normalizeSocialLinks($request->input('social_links')),
            'manager_info' => ArtistProfileInputs::normalizeStringMap($request->input('manager_info'), ['name', 'company', 'phone', 'email']),
            'public_contact' => ArtistProfileInputs::normalizeStringMap($request->input('public_contact'), ['email', 'phone', 'note']),
            'managed_by_user_id' => $request->filled('managed_by_user_id') ? (int) $request->input('managed_by_user_id') : null,
            'spotify_auto_link_disabled' => $request->boolean('spotify_auto_link_disabled'),
            'platform_verified' => $request->boolean('platform_verified'),
        ]);

        $allowedTypes = MusicGenre::optionNamesOrdered();
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'music_genres' => 'nullable|array',
            'music_genres.*' => ['string', Rule::in($allowedTypes)],
            'bio' => 'nullable|string|max:500000',
            'avatar' => 'nullable|string|max:2048',
            'banner_image' => 'nullable|string|max:2048',
            'website' => 'nullable|url|max:255',
            'status' => 'required|in:pending,approved,rejected',
            'social_links' => 'nullable|array',
            'social_links.*' => 'nullable|string|max:500',
            'manager_info' => 'nullable|array',
            'manager_info.name' => 'nullable|string|max:255',
            'manager_info.company' => 'nullable|string|max:255',
            'manager_info.phone' => UserContactValidation::phoneNullable(),
            'manager_info.email' => UserContactValidation::emailNullable(),
            'public_contact' => 'nullable|array',
            'public_contact.email' => UserContactValidation::emailNullable(),
            'public_contact.phone' => UserContactValidation::phoneNullable(),
            'public_contact.note' => 'nullable|string|max:2000',
            'avatar_upload' => 'nullable|image|max:10240',
            'banner_upload' => 'nullable|image|max:15360',
            'managed_by_user_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($q) => $q->where('role', 'manager_organization')),
            ],
            'spotify_auto_link_disabled' => 'boolean',
            'platform_verified' => 'boolean',
            'slug' => 'nullable|string|max:120',
        ]);

        $validated = TurkishPhone::mergeNormalizedInto($validated, [
            'manager_info.phone',
            'public_contact.phone',
        ]);

        unset($validated['avatar_upload'], $validated['banner_upload']);
        if ($request->hasFile('avatar_upload')) {
            if ($artist->avatar && ! Str::startsWith($artist->avatar, ['http://', 'https://'])) {
                Storage::disk('public')->delete($artist->avatar);
            }
            $validated['avatar'] = $request->file('avatar_upload')->store('artist-avatars', 'public');
        } else {
            $newAvatar = isset($validated['avatar']) ? trim((string) $validated['avatar']) : '';
            if ($newAvatar !== '' && Str::startsWith($newAvatar, ['http://', 'https://'])) {
                $path = $this->importArtistImageFromUrl($newAvatar, 'artist-avatars', 'avatar');
                if ($artist->avatar && ! Str::startsWith($artist->avatar, ['http://', 'https://'])) {
                    Storage::disk('public')->delete($artist->avatar);
                }
                $validated['avatar'] = $path;
            } elseif ($artist->avatar && ! Str::startsWith($artist->avatar, ['http://', 'https://'])) {
                $newAvatarForCompare = $validated['avatar'] ?? null;
                if ($newAvatarForCompare === null || $newAvatarForCompare === '' || $newAvatarForCompare !== $artist->avatar) {
                    Storage::disk('public')->delete($artist->avatar);
                }
            }
        }

        if ($request->hasFile('banner_upload')) {
            if ($artist->banner_image && ! Str::startsWith($artist->banner_image, ['http://', 'https://'])) {
                Storage::disk('public')->delete($artist->banner_image);
            }
            $validated['banner_image'] = $request->file('banner_upload')->store('artist-banners', 'public');
        } else {
            $newBanner = isset($validated['banner_image']) ? trim((string) $validated['banner_image']) : '';
            if ($newBanner !== '' && Str::startsWith($newBanner, ['http://', 'https://'])) {
                $path = $this->importArtistImageFromUrl($newBanner, 'artist-banners', 'banner_image');
                if ($artist->banner_image && ! Str::startsWith($artist->banner_image, ['http://', 'https://'])) {
                    Storage::disk('public')->delete($artist->banner_image);
                }
                $validated['banner_image'] = $path;
            } elseif ($artist->banner_image && ! Str::startsWith($artist->banner_image, ['http://', 'https://'])) {
                $newBannerForCompare = $validated['banner_image'] ?? null;
                if ($newBannerForCompare === null || $newBannerForCompare === '' || $newBannerForCompare !== $artist->banner_image) {
                    Storage::disk('public')->delete($artist->banner_image);
                }
            }
        }

        $slugInput = $request->input('slug');
        if (is_string($slugInput) && trim($slugInput) !== '') {
            $assess = ArtistPublicUsername::assessAvailability($slugInput, $artist->id);
            if (! $assess['ok']) {
                throw ValidationException::withMessages([
                    'slug' => $assess['message'] ?? 'Geçersiz kullanıcı adı.',
                ]);
            }
            $validated['slug'] = $assess['normalized'];
        } else {
            unset($validated['slug']);
        }

        $rawGenresUp = $validated['music_genres'] ?? [];
        $mg = array_values(array_unique(array_filter(is_array($rawGenresUp) ? $rawGenresUp : [])));
        $validated['music_genres'] = $mg === [] ? null : $mg;
        $validated['genre'] = $mg === [] ? null : implode(', ', $mg);

        self::applySpotifyFromAdminSocialLinks($validated);

        $normalizedName = mb_strtolower(trim($validated['name']));
        if ($normalizedName !== '' && Artist::query()
            ->where('id', '!=', $artist->id)
            ->whereRaw('LOWER(TRIM(name)) = ?', [$normalizedName])
            ->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Bu isimde başka bir sanatçı zaten kayıtlı.',
            ]);
        }

        $platformVerified = (bool) ($validated['platform_verified'] ?? false);
        unset($validated['platform_verified']);
        $validated['verified_at'] = $platformVerified
            ? ($artist->verified_at ?? now())
            : null;

        $artist->update($validated);

        return redirect()->route('admin.artists.edit', $artist)->with('success', 'Sanatçı güncellendi.');
    }

    public function storeMedia(Request $request, Artist $artist)
    {
        $request->validate([
            'photo' => 'required|image|max:10240',
        ]);
        $path = $request->file('photo')->store('artist-media', 'public');
        $order = (int) ($artist->media()->max('order') ?? 0);

        ArtistMedia::create([
            'artist_id' => $artist->id,
            'type' => 'photo',
            'path' => $path,
            'order' => $order + 1,
            'moderation_status' => ArtistMedia::MODERATION_APPROVED,
        ]);

        return back()->with('success', 'Galeriye fotoğraf eklendi.');
    }

    public function destroyMedia(Request $request, Artist $artist, ArtistMedia $media)
    {
        if ($media->artist_id !== $artist->id) {
            abort(404);
        }
        if ($media->path) {
            Storage::disk('public')->delete($media->path);
        }
        if ($media->thumbnail) {
            Storage::disk('public')->delete($media->thumbnail);
        }
        $media->delete();

        return back()->with('success', 'Görsel silindi.');
    }

    public function approve(Artist $artist)
    {
        $artist->update(['status' => 'approved']);

        return back()->with('success', 'Sanatçı onaylandı.');
    }

    public function reject(Artist $artist)
    {
        $artist->update(['status' => 'rejected']);

        return back()->with('success', 'Sanatçı reddedildi.');
    }

    public function importPromoMediaFromUrl(Request $request, Artist $artist, EventMediaImportFromUrlService $importer)
    {
        return $this->promoImportMediaFromUrlResponse($request, $artist, $importer, true);
    }

    public function appendPromoFiles(Request $request, Artist $artist, EventMediaImportFromUrlService $importer)
    {
        return $this->promoAppendFilesResponse($request, $artist, $importer);
    }

    public function clearPromoMedia(Artist $artist, EventMediaImportFromUrlService $importer)
    {
        return $this->promoClearResponse($artist, $importer);
    }

    public function removePromoGalleryItem(Request $request, Artist $artist, EventMediaImportFromUrlService $importer)
    {
        return $this->promoRemoveItemResponse($request, $artist, $importer);
    }

    public function destroy(Request $request, Artist $artist)
    {
        $this->performArtistDelete($artist, $request->boolean('delete_related_events'));

        return redirect()->route('admin.artists.index')->with('success', 'Sanatçı silindi.');
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:artists,id'],
            'delete_related_events' => ['sometimes', 'boolean'],
        ]);

        $deleteRelated = (bool) ($validated['delete_related_events'] ?? false);
        $ids = array_values(array_unique(array_map('intval', $validated['ids'])));

        $count = (int) DB::transaction(function () use ($ids, $deleteRelated): int {
            $n = 0;
            foreach ($ids as $id) {
                $artist = Artist::query()->find($id);
                if ($artist) {
                    $this->performArtistDelete($artist, $deleteRelated);
                    $n++;
                }
            }

            return $n;
        });

        return redirect()->route('admin.artists.index')->with('success', "{$count} sanatçı silindi.");
    }

    /**
     * Admin formundan Spotify: “yok” işaretliyse veya alan boşsa sütunları temizler; doluysa spotify_id/url senkronlar.
     * spotify_auto_link_disabled: spotify:import-artists isim eşleştirmesinin bu kaydı yeniden doldurmasını engeller.
     *
     * @param  array<string, mixed>  $validated
     */
    private function importArtistImageFromUrl(string $url, string $directory, string $errorKey): string
    {
        if (! $this->remoteImageImporter->isMirrorableUrl($url)) {
            throw ValidationException::withMessages([
                $errorKey => 'Bu görsel adresi güvenlik veya biçim nedeniyle kullanılamıyor.',
            ]);
        }
        $path = $this->remoteImageImporter->importToPublicDisk($url, $directory);
        if ($path === null) {
            throw ValidationException::withMessages([
                $errorKey => 'Görsel indirilemedi. Bağlantıyı kontrol edin veya dosya yükleyin.',
            ]);
        }

        return $path;
    }

    private static function applySpotifyFromAdminSocialLinks(array &$validated): void
    {
        $social = $validated['social_links'] ?? null;
        if (! is_array($social)) {
            $social = [];
        }

        $suppressAutoLink = ! empty($validated['spotify_auto_link_disabled']);

        $clearSpotifyColumns = static function () use (&$validated, &$social): void {
            $validated['spotify_id'] = null;
            $validated['spotify_url'] = null;
            $validated['spotify_genres'] = null;
            $validated['spotify_popularity'] = null;
            $validated['spotify_followers'] = null;
            $validated['spotify_albums'] = null;
            unset($social['spotify']);
            $validated['social_links'] = $social;
        };

        if ($suppressAutoLink) {
            $clearSpotifyColumns();
            $validated['spotify_auto_link_disabled'] = true;

            return;
        }

        $validated['spotify_auto_link_disabled'] = false;

        $raw = isset($social['spotify']) && is_string($social['spotify']) ? trim($social['spotify']) : '';
        if ($raw === '') {
            $clearSpotifyColumns();

            return;
        }

        $id = ArtistProfileInputs::extractSpotifyArtistId($raw);
        if ($id === null) {
            throw ValidationException::withMessages([
                'social_links.spotify' => 'Geçerli bir Spotify sanatçı bağlantısı girin (ör. open.spotify.com/artist/… veya 22 karakterlik sanatçı ID).',
            ]);
        }

        $validated['spotify_id'] = $id;
        $validated['spotify_url'] = str_starts_with($raw, 'http://') || str_starts_with($raw, 'https://')
            ? $raw
            : 'https://open.spotify.com/artist/'.$id;
    }

    private function performArtistDelete(Artist $artist, bool $deleteRelatedEvents): void
    {
        app(EventMediaImportFromUrlService::class)->purgePromoGallery($artist);
        $artist->refresh();

        if ($deleteRelatedEvents) {
            $artist->loadMissing('events');
            foreach ($artist->events as $event) {
                if ($event->cover_image && ! Str::startsWith($event->cover_image, ['http://', 'https://'])) {
                    Storage::disk('public')->delete($event->cover_image);
                }
                $event->delete();
            }
        }

        $artist->loadMissing('media');
        foreach ($artist->media as $m) {
            if ($m->path) {
                Storage::disk('public')->delete($m->path);
            }
            if ($m->thumbnail) {
                Storage::disk('public')->delete($m->thumbnail);
            }
        }
        if ($artist->avatar && ! Str::startsWith($artist->avatar, ['http://', 'https://'])) {
            Storage::disk('public')->delete($artist->avatar);
        }
        if ($artist->banner_image && ! Str::startsWith($artist->banner_image, ['http://', 'https://'])) {
            Storage::disk('public')->delete($artist->banner_image);
        }
        $artist->delete();
    }
}
