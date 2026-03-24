<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\User;
use App\Models\Venue;
use App\Support\SafeRedirect;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(Request $request): Response
    {
        $claimVenue = null;
        $venueSlug = SafeRedirect::slugParam($request->query('claim_venue'));
        if ($venueSlug !== null) {
            $venue = Venue::query()->where('slug', $venueSlug)->first(['slug', 'name']);
            if ($venue !== null) {
                $claimVenue = ['slug' => $venue->slug, 'name' => $venue->name];
            }
        }

        $claimArtist = null;
        $artistSlug = SafeRedirect::slugParam($request->query('claim_artist'));
        if ($artistSlug !== null) {
            $artist = Artist::query()->where('slug', $artistSlug)->first(['slug', 'name']);
            if ($artist !== null) {
                $claimArtist = ['slug' => $artist->slug, 'name' => $artist->name];
            }
        }

        return Inertia::render('Auth/Register', [
            'claimVenue' => $claimVenue,
            'claimArtist' => $claimArtist,
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'membership_type' => ['required', 'in:artist,venue'],
            'venue_name' => ['required_if:membership_type,venue', 'nullable', 'string', 'max:255'],
            'return_to' => ['nullable', 'string', 'max:2048'],
        ]);

        $role = $request->input('membership_type') === 'artist' ? 'artist' : 'customer';

        $user = User::create([
            'name' => $request->name,
            'pending_venue_name' => $request->input('membership_type') === 'venue' ? $request->input('venue_name') : null,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $role,
        ]);

        event(new Registered($user));

        Auth::login($user);

        $returnTo = SafeRedirect::relativePath($request->input('return_to'));
        if ($returnTo !== null) {
            return redirect($returnTo);
        }

        if ($user->isArtist()) {
            return redirect(route('dashboard', absolute: false));
        }

        return redirect(route('subscriptions.index', ['type' => 'venue'], false));
    }
}
