<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\ArtistMedia;
use App\Models\MusicGenre;
use App\Services\AppSettingsService;
use App\Support\ArtistProfileInputs;
use App\Support\TurkishPhone;
use App\Support\UserContactValidation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PublicArtistProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        $artist = Artist::query()
            ->where('user_id', $request->user()->id)
            ->first();

        $profileAnalytics = null;
        $gallery = [];
        if ($artist !== null) {
            $favoritesCount = $artist->favoritedByUsers()->count();
            $publishedOnListings = $artist->events()->where('events.status', 'published')->count();

            $profileAnalytics = [
                'profile_views' => (int) $artist->view_count,
                'favorites_count' => $favoritesCount,
                'published_events_listed' => $publishedOnListings,
            ];

            $artist->load(['media' => fn ($q) => $q->orderBy('order')]);
            foreach ($artist->media as $m) {
                $gallery[] = [
                    'id' => $m->id,
                    'url' => Storage::disk('public')->url($m->path),
                    'moderation_status' => $m->moderation_status ?? ArtistMedia::MODERATION_APPROVED,
                    'moderation_note' => $m->moderation_note,
                ];
            }
        }

        return Inertia::render('Artist/PublicProfile/Edit', [
            'artist' => $artist,
            'profileAnalytics' => $profileAnalytics,
            'musicGenreOptions' => MusicGenre::optionNamesOrdered(),
            'gallery' => $gallery,
            'artistProfileApproved' => $artist !== null && $artist->status === 'approved',
        ]);
    }

    public function update(Request $request)
    {
        $artist = Artist::query()
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $artist) {
            return redirect()->route('artist.public-profile')->with('error', 'Bağlı sanatçı profili bulunamadı.');
        }

        $request->merge([
            'bio' => $request->input('bio') ?: null,
            'website' => $request->input('website') ?: null,
            'music_genres' => $request->input('music_genres') ?: [],
            'social_links' => ArtistProfileInputs::normalizeSocialLinks($request->input('social_links')),
            'manager_info' => ArtistProfileInputs::normalizeStringMap($request->input('manager_info'), ['name', 'company', 'phone', 'email']),
            'public_contact' => ArtistProfileInputs::normalizeStringMap($request->input('public_contact'), ['email', 'phone', 'note']),
        ]);

        $allowedTypes = MusicGenre::optionNamesOrdered();
        $validated = $request->validate([
            'bio' => 'nullable|string',
            'website' => 'nullable|url|max:255',
            'music_genres' => 'nullable|array',
            'music_genres.*' => ['string', Rule::in($allowedTypes)],
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
            'banner_upload' => 'nullable|image|max:15360',
            'remove_banner' => 'sometimes|boolean',
        ]);

        $validated = TurkishPhone::mergeNormalizedInto($validated, [
            'manager_info.phone',
            'public_contact.phone',
        ]);

        unset($validated['banner_upload']);
        if ($request->boolean('remove_banner')) {
            if ($artist->banner_image && ! str_starts_with((string) $artist->banner_image, 'http://') && ! str_starts_with((string) $artist->banner_image, 'https://')) {
                Storage::disk('public')->delete($artist->banner_image);
            }
            $validated['banner_image'] = null;
        } elseif ($request->hasFile('banner_upload')) {
            if ($artist->banner_image && ! str_starts_with((string) $artist->banner_image, 'http://') && ! str_starts_with((string) $artist->banner_image, 'https://')) {
                Storage::disk('public')->delete($artist->banner_image);
            }
            $validated['banner_image'] = $request->file('banner_upload')->store('artist-banners', 'public');
        }
        unset($validated['remove_banner']);

        $mg = array_values(array_unique(array_filter($validated['music_genres'] ?? [])));
        $validated['music_genres'] = $mg === [] ? null : $mg;
        $validated['genre'] = $mg === [] ? null : implode(', ', $mg);

        $artist->update($validated);

        return redirect()->route('artist.public-profile')->with('success', 'Sanatçı sayfanız güncellendi.');
    }

    public function storeGallery(Request $request)
    {
        $artist = Artist::query()
            ->where('user_id', $request->user()->id)
            ->first();

        if ($artist === null) {
            return redirect()->route('artist.public-profile')->with('error', 'Bağlı sanatçı profili bulunamadı.');
        }

        $request->validate([
            'photos' => ['required', 'array', 'min:1', 'max:20'],
            'photos.*' => ['image', 'max:10240'],
        ]);

        $mod = $artist->status === 'approved'
            ? ArtistMedia::MODERATION_APPROVED
            : ArtistMedia::MODERATION_PENDING;

        $maxOrder = (int) $artist->media()->max('order');

        foreach ($request->file('photos', []) as $file) {
            if (! $file->isValid()) {
                continue;
            }
            $path = $file->store('artist-media', 'public');
            $maxOrder++;
            ArtistMedia::create([
                'artist_id' => $artist->id,
                'type' => 'photo',
                'path' => $path,
                'order' => $maxOrder,
                'moderation_status' => $mod,
            ]);
        }

        if ($mod === ArtistMedia::MODERATION_PENDING) {
            app(AppSettingsService::class)->forgetCaches();
        }

        return back()->with(
            'success',
            $mod === ArtistMedia::MODERATION_PENDING
                ? 'Fotoğraflar yüklendi. Onaylı olmayan profillerde görseller yönetici onayından sonra yayınlanır.'
                : 'Fotoğraflar galerinize eklendi.'
        );
    }

    public function destroyGallery(Request $request, ArtistMedia $media)
    {
        $artist = Artist::query()
            ->where('user_id', $request->user()->id)
            ->first();

        if ($artist === null || (int) $media->artist_id !== (int) $artist->id) {
            abort(403);
        }

        $wasPending = $media->moderation_status === ArtistMedia::MODERATION_PENDING;

        if ($media->path) {
            Storage::disk('public')->delete($media->path);
        }
        if ($media->thumbnail) {
            Storage::disk('public')->delete($media->thumbnail);
        }

        $media->delete();

        if ($wasPending) {
            app(AppSettingsService::class)->forgetCaches();
        }

        return back()->with('success', 'Görsel kaldırıldı.');
    }
}
