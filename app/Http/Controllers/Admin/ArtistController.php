<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\ArtistMedia;
use App\Models\MusicGenre;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\ArtistProfileInputs;
use App\Support\TurkishPhone;
use App\Support\UserContactValidation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ArtistController extends Controller
{
    public function create()
    {
        return Inertia::render('Admin/Artists/Create', [
            'musicGenreOptions' => MusicGenre::optionNamesOrdered(),
        ]);
    }

    public function index(Request $request)
    {
        $artists = Artist::query()
            ->withCount('events')
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
            'bio' => 'nullable|string',
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
        ]);

        unset($validated['avatar_upload'], $validated['banner_upload']);
        if ($request->hasFile('avatar_upload')) {
            $validated['avatar'] = $request->file('avatar_upload')->store('artist-avatars', 'public');
        }
        if ($request->hasFile('banner_upload')) {
            $validated['banner_image'] = $request->file('banner_upload')->store('artist-banners', 'public');
        }

        $validated = TurkishPhone::mergeNormalizedInto($validated, [
            'manager_info.phone',
            'public_contact.phone',
        ]);

        $mg = array_values(array_unique(array_filter($validated['music_genres'] ?? [])));
        $validated['music_genres'] = $mg === [] ? null : $mg;
        $validated['genre'] = $mg === [] ? null : implode(', ', $mg);

        self::applySpotifyFromAdminSocialLinks($validated);

        $normalizedName = mb_strtolower(trim($validated['name']));
        if ($normalizedName !== '' && Artist::query()->whereRaw('LOWER(TRIM(name)) = ?', [$normalizedName])->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Bu isimde bir sanatçı zaten kayıtlı.',
            ]);
        }

        $artist = Artist::create([
            ...$validated,
            'slug' => Str::slug($validated['name']).'-'.Str::lower(Str::random(4)),
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
        ]);

        $allowedTypes = MusicGenre::optionNamesOrdered();
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'music_genres' => 'nullable|array',
            'music_genres.*' => ['string', Rule::in($allowedTypes)],
            'bio' => 'nullable|string',
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
        } elseif ($artist->avatar && ! Str::startsWith($artist->avatar, ['http://', 'https://'])) {
            $newAvatar = $validated['avatar'] ?? null;
            if ($newAvatar === null || $newAvatar === '' || $newAvatar !== $artist->avatar) {
                Storage::disk('public')->delete($artist->avatar);
            }
        }

        if ($request->hasFile('banner_upload')) {
            if ($artist->banner_image && ! Str::startsWith($artist->banner_image, ['http://', 'https://'])) {
                Storage::disk('public')->delete($artist->banner_image);
            }
            $validated['banner_image'] = $request->file('banner_upload')->store('artist-banners', 'public');
        } elseif ($artist->banner_image && ! Str::startsWith($artist->banner_image, ['http://', 'https://'])) {
            $newBanner = $validated['banner_image'] ?? null;
            if ($newBanner === null || $newBanner === '' || $newBanner !== $artist->banner_image) {
                Storage::disk('public')->delete($artist->banner_image);
            }
        }

        if ($artist->name !== $validated['name']) {
            $validated['slug'] = Str::slug($validated['name']).'-'.Str::lower(Str::random(4));
        }

        $mg = array_values(array_unique(array_filter($validated['music_genres'] ?? [])));
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
