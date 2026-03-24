<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\MusicGenre;
use App\Support\ArtistProfileInputs;
use Illuminate\Http\Request;
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

        return Inertia::render('Artist/PublicProfile/Edit', [
            'artist' => $artist,
            'musicGenreOptions' => MusicGenre::optionNamesOrdered(),
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
            'manager_info.phone' => 'nullable|string|max:80',
            'manager_info.email' => 'nullable|email|max:255',
            'public_contact' => 'nullable|array',
            'public_contact.email' => 'nullable|email|max:255',
            'public_contact.phone' => 'nullable|string|max:80',
            'public_contact.note' => 'nullable|string|max:2000',
        ]);

        $mg = array_values(array_unique(array_filter($validated['music_genres'] ?? [])));
        $validated['music_genres'] = $mg === [] ? null : $mg;
        $validated['genre'] = $mg === [] ? null : implode(', ', $mg);

        $artist->update($validated);

        return redirect()->route('artist.public-profile')->with('success', 'Sanatçı sayfanız güncellendi.');
    }
}
