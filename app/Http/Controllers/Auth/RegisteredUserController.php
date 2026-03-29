<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\User;
use App\Models\Venue;
use App\Support\RegistrationWelcomeMessages;
use App\Support\SafeRedirect;
use App\Support\UserContactValidation;
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

        $membership = 'venue';
        if ($claimArtist !== null) {
            $membership = 'artist';
        } elseif ($claimVenue !== null) {
            $membership = 'venue';
        } else {
            $uyelik = $request->query('uyelik');
            if ($uyelik === 'sanatci') {
                $membership = 'artist';
            } elseif ($uyelik === 'mekan') {
                $membership = 'venue';
            } elseif ($uyelik === 'organizasyon') {
                $membership = 'organization';
            }
        }

        return Inertia::render('Auth/Register', [
            'claimVenue' => $claimVenue,
            'claimArtist' => $claimArtist,
            'initialMembership' => $membership,
        ]);
    }

    public function createKullanici(): Response
    {
        return Inertia::render('Auth/RegisterKullanici');
    }

    public function storeKullanici(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => array_merge(UserContactValidation::emailRequired(), ['unique:'.User::class]),
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'pending_venue_name' => null,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'customer',
        ]);

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false))
            ->with('success', RegistrationWelcomeMessages::CUSTOMER);
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
            'email' => array_merge(UserContactValidation::emailRequired(), ['unique:'.User::class]),
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'membership_type' => ['required', 'in:artist,venue,organization'],
            'venue_name' => ['required_if:membership_type,venue', 'nullable', 'string', 'max:255'],
            'organization_display_name' => ['required_if:membership_type,organization', 'nullable', 'string', 'max:255'],
            'return_to' => ['nullable', 'string', 'max:2048'],
        ]);

        $role = match ($request->input('membership_type')) {
            'artist' => 'artist',
            'venue' => 'venue_owner',
            'organization' => 'manager_organization',
            default => 'customer',
        };

        $user = User::create([
            'name' => $request->name,
            'pending_venue_name' => $request->input('membership_type') === 'venue' ? $request->input('venue_name') : null,
            'organization_display_name' => $request->input('membership_type') === 'organization'
                ? $request->input('organization_display_name')
                : null,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $role,
        ]);

        event(new Registered($user));

        Auth::login($user);

        $welcome = match ($request->input('membership_type')) {
            'artist' => RegistrationWelcomeMessages::STAGE_ARTIST,
            'venue' => RegistrationWelcomeMessages::STAGE_VENUE,
            'organization' => RegistrationWelcomeMessages::STAGE_ORGANIZATION,
            default => RegistrationWelcomeMessages::STAGE_ARTIST,
        };

        $returnTo = SafeRedirect::relativePath($request->input('return_to'));
        if ($returnTo !== null) {
            return redirect($returnTo)->with('success', $welcome);
        }

        if ($user->isArtist()) {
            return redirect(route('dashboard', absolute: false))->with('success', $welcome);
        }

        return redirect(route('artist.venues.create', absolute: false))->with('success', $welcome);
    }
}
