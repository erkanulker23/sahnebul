<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\City;
use App\Support\ArtistProfileInputs;
use App\Support\TurkishPhone;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        if ($user->isAdmin()) {
            return redirect()->route('admin.profile');
        }
        if ($user->isArtist() || $user->isManagementAccount() || $user->isVenueOwner()) {
            return redirect()->route('artist.profile');
        }

        $cities = City::query()->turkiyeProvinces()->get(['id', 'name', 'slug']);

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'cities' => $cities,
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $user->avatar = $request->file('avatar')->store('avatars', 'public');
        }

        if ($request->hasFile('organization_cover') && $user->isManagementAccount()) {
            if (is_string($user->organization_cover_image) && $user->organization_cover_image !== '') {
                Storage::disk('public')->delete($user->organization_cover_image);
            }
            $user->organization_cover_image = $request->file('organization_cover')->store('organization-covers', 'public');
        }

        $attributes = $request->safe()->except(['avatar', 'organization_cover']);
        if (array_key_exists('phone', $attributes)) {
            $raw = trim((string) $attributes['phone']);
            $attributes['phone'] = $raw === '' ? null : TurkishPhone::normalize($raw);
        }
        $user->fill($attributes);

        if ($user->isManagementAccount()) {
            $social = ArtistProfileInputs::normalizeSocialLinks($request->input('organization_social_links'));
            $user->organization_social_links = $social;
            $slug = trim((string) $user->organization_public_slug);
            $user->organization_public_slug = $slug !== '' ? $slug : null;
        }

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        $redirect = match (true) {
            $user->isAdmin() => 'admin.profile',
            $user->isArtist(), $user->isManagementAccount(), $user->isVenueOwner() => 'artist.profile',
            default => 'profile.edit',
        };

        return Redirect::route($redirect)->with('status', 'Profil güncellendi.');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
