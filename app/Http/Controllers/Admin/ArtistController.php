<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\ArtistMedia;
use App\Models\MusicGenre;
use App\Support\ArtistProfileInputs;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
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
        $artist->load('media');
        $artist->loadCount('events');

        return Inertia::render('Admin/Artists/Edit', [
            'artist' => $artist,
            'musicGenreOptions' => MusicGenre::optionNamesOrdered(),
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'bio' => $request->input('bio') ?: null,
            'avatar' => $request->input('avatar') ?: null,
            'website' => $request->input('website') ?: null,
            'social_links' => ArtistProfileInputs::normalizeSocialLinks($request->input('social_links')),
            'manager_info' => ArtistProfileInputs::normalizeStringMap($request->input('manager_info'), ['name', 'company', 'phone', 'email']),
            'public_contact' => ArtistProfileInputs::normalizeStringMap($request->input('public_contact'), ['email', 'phone', 'note']),
        ]);

        $allowedTypes = MusicGenre::optionNamesOrdered();
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'music_genres' => 'nullable|array',
            'music_genres.*' => ['string', Rule::in($allowedTypes)],
            'bio' => 'nullable|string',
            'avatar' => 'nullable|string|max:2048',
            'website' => 'nullable|url|max:255',
            'status' => 'required|in:pending,approved,rejected',
            'social_links' => 'nullable|array',
            'social_links.*' => 'nullable|string|max:500',
            'manager_info' => 'nullable|array',
            'manager_info.name' => 'nullable|string|max:255',
            'manager_info.company' => 'nullable|string|max:255',
            'manager_info.phone' => 'nullable|string|max:80',
            'manager_info.email' => 'nullable|email|max:255',
            'public_contact' => 'nullable|array',
            'public_contact.email' => 'nullable|email|max:255',
            'public_contact.phone' => 'nullable|string|max:80',
            'public_contact.note' => 'nullable|string|max:2000',
            'avatar_upload' => 'nullable|image|max:10240',
        ]);

        unset($validated['avatar_upload']);
        if ($request->hasFile('avatar_upload')) {
            $validated['avatar'] = $request->file('avatar_upload')->store('artist-avatars', 'public');
        }

        $mg = array_values(array_unique(array_filter($validated['music_genres'] ?? [])));
        $validated['music_genres'] = $mg === [] ? null : $mg;
        $validated['genre'] = $mg === [] ? null : implode(', ', $mg);

        self::syncSpotifyMetaFromSocialLinks($validated);

        $artist = Artist::create([
            ...$validated,
            'slug' => Str::slug($validated['name']) . '-' . Str::lower(Str::random(4)),
        ]);

        return redirect()->route('admin.artists.edit', $artist)->with('success', 'Sanatçı eklendi. Detayları düzenleyebilirsiniz.');
    }

    public function update(Request $request, Artist $artist)
    {
        $request->merge([
            'bio' => $request->input('bio') ?: null,
            'avatar' => $request->input('avatar') ?: null,
            'website' => $request->input('website') ?: null,
            'social_links' => ArtistProfileInputs::normalizeSocialLinks($request->input('social_links')),
            'manager_info' => ArtistProfileInputs::normalizeStringMap($request->input('manager_info'), ['name', 'company', 'phone', 'email']),
            'public_contact' => ArtistProfileInputs::normalizeStringMap($request->input('public_contact'), ['email', 'phone', 'note']),
        ]);

        $allowedTypes = MusicGenre::optionNamesOrdered();
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'music_genres' => 'nullable|array',
            'music_genres.*' => ['string', Rule::in($allowedTypes)],
            'bio' => 'nullable|string',
            'avatar' => 'nullable|string|max:2048',
            'website' => 'nullable|url|max:255',
            'status' => 'required|in:pending,approved,rejected',
            'social_links' => 'nullable|array',
            'social_links.*' => 'nullable|string|max:500',
            'manager_info' => 'nullable|array',
            'manager_info.name' => 'nullable|string|max:255',
            'manager_info.company' => 'nullable|string|max:255',
            'manager_info.phone' => 'nullable|string|max:80',
            'manager_info.email' => 'nullable|email|max:255',
            'public_contact' => 'nullable|array',
            'public_contact.email' => 'nullable|email|max:255',
            'public_contact.phone' => 'nullable|string|max:80',
            'public_contact.note' => 'nullable|string|max:2000',
            'avatar_upload' => 'nullable|image|max:10240',
        ]);

        unset($validated['avatar_upload']);
        if ($request->hasFile('avatar_upload')) {
            if ($artist->avatar && ! Str::startsWith($artist->avatar, ['http://', 'https://'])) {
                Storage::disk('public')->delete($artist->avatar);
            }
            $validated['avatar'] = $request->file('avatar_upload')->store('artist-avatars', 'public');
        }

        if ($artist->name !== $validated['name']) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . Str::lower(Str::random(4));
        }

        $mg = array_values(array_unique(array_filter($validated['music_genres'] ?? [])));
        $validated['music_genres'] = $mg === [] ? null : $mg;
        $validated['genre'] = $mg === [] ? null : implode(', ', $mg);

        self::syncSpotifyMetaFromSocialLinks($validated);

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
     * social_links.spotify doluysa spotify_id / spotify_url sütunlarını doldurur (gömülü çalar ve doğrudan bağlantı).
     *
     * @param  array<string, mixed>  $validated
     */
    private static function syncSpotifyMetaFromSocialLinks(array &$validated): void
    {
        $social = $validated['social_links'] ?? null;
        if (! is_array($social)) {
            return;
        }
        $raw = $social['spotify'] ?? '';
        if (! is_string($raw)) {
            return;
        }
        $raw = trim($raw);
        if ($raw === '') {
            return;
        }
        $id = ArtistProfileInputs::extractSpotifyArtistId($raw);
        if ($id === null) {
            return;
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
        $artist->delete();
    }
}
