<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Support\SafeRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class PortalAuthenticatedSessionController extends Controller
{
    private function portalFromRoute(): string
    {
        return match (Route::currentRouteName()) {
            'login' => 'kullanici',
            'login.sanatci' => 'sanatci',
            'login.mekan' => 'mekan',
            'login.management' => 'management',
            'login.admin' => 'yonetim',
            default => abort(404),
        };
    }

    public function createStageLoginChooser(Request $request): Response
    {
        $redirect = SafeRedirect::relativePath($request->query('redirect'));
        if ($redirect !== null) {
            $request->session()->put('url.intended', $redirect);
        }

        return Inertia::render('Auth/StageLoginChooser', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    public function create(Request $request): Response
    {
        $portal = $this->portalFromRoute();

        $redirect = SafeRedirect::relativePath($request->query('redirect'));
        if ($redirect !== null) {
            $request->session()->put('url.intended', $redirect);
        }

        return Inertia::render('Auth/LoginPortal', [
            'portal' => $portal,
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
            'claimVenueSlug' => SafeRedirect::slugParam($request->query('claim_venue')),
            'claimArtistSlug' => SafeRedirect::slugParam($request->query('claim_artist')),
        ]);
    }

    public function store(LoginRequest $request, string $portal): RedirectResponse
    {
        $allowed = ['kullanici', 'sanatci', 'mekan', 'management', 'organizasyon', 'yonetim'];
        abort_unless(in_array($portal, $allowed, true), 404);

        $normalizedPortal = $portal === 'organizasyon' ? 'management' : $portal;

        $request->authenticateForPortal($normalizedPortal);

        $request->session()->regenerate();

        $default = match ($normalizedPortal) {
            'kullanici' => route('dashboard', absolute: false),
            'sanatci' => route('artist.dashboard', absolute: false),
            'mekan' => route('artist.venues.index', absolute: false),
            'management' => route('artist.dashboard', absolute: false),
            'yonetim' => route('admin.dashboard', absolute: false),
            default => route('dashboard', absolute: false),
        };

        return redirect()->intended($default);
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
