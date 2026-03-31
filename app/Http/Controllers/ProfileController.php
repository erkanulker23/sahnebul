<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\City;
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
        if ($user->isArtist() || $user->isManagerOrganization() || $user->isVenueOwner()) {
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

        $attributes = $request->safe()->except('avatar');
        if (array_key_exists('phone', $attributes)) {
            $raw = trim((string) $attributes['phone']);
            $attributes['phone'] = $raw === '' ? null : TurkishPhone::normalize($raw);
        }
        $user->fill($attributes);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        $redirect = match (true) {
            $user->isAdmin() => 'admin.profile',
            $user->isArtist(), $user->isManagerOrganization(), $user->isVenueOwner() => 'artist.profile',
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
