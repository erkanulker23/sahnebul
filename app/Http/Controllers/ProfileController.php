<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\City;
use App\Models\Reservation;
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

        $activeTicketCount = Reservation::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['pending', 'confirmed', 'completed'])
            ->whereDate('reservation_date', '>=', now()->toDateString())
            ->count();

        $pastEventCount = Reservation::query()
            ->where('user_id', $user->id)
            ->whereDate('reservation_date', '<', now()->toDateString())
            ->count();

        $reservations = Reservation::query()
            ->with([
                'venue:id,name,slug',
                'event:id,title',
            ])
            ->where('user_id', $user->id)
            ->latest('reservation_date')
            ->latest('id')
            ->limit(6)
            ->get([
                'id',
                'venue_id',
                'event_id',
                'reservation_date',
                'reservation_time',
                'status',
            ]);

        $favoriteArtists = $user->favoriteArtists()
            ->select('artists.id', 'artists.name', 'artists.slug')
            ->latest('user_favorite_artists.created_at')
            ->limit(6)
            ->get();

        $reminderEvents = $user->remindedEvents()
            ->published()
            ->whereHas('venue', fn ($q) => $q->listedPublicly())
            ->whereNotNull('events.start_date')
            ->whereStillVisibleOnPublicListing()
            ->with(['venue:id,name,slug'])
            ->orderBy('start_date')
            ->limit(10)
            ->get(['events.id', 'events.slug', 'events.title', 'events.start_date', 'events.end_date', 'events.venue_id']);

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'cities' => $cities,
            'panelSummary' => [
                'activeTicketCount' => $activeTicketCount,
                'favoriteCount' => $user->favoriteArtists()->count() + $user->followedVenues()->count(),
                'pastEventCount' => $pastEventCount,
                'reviewCount' => $user->reviews()->count(),
            ],
            'reservations' => $reservations,
            'favoriteArtists' => $favoriteArtists,
            'reminderEvents' => $reminderEvents,
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

        $user->fill($request->safe()->except('avatar'));

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
