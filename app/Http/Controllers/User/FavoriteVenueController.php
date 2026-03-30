<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FavoriteVenueController extends Controller
{
    public function toggle(Request $request, int $venue): RedirectResponse
    {
        abort_unless($request->user()->canFollowVenues(), 403);

        $model = Venue::query()->listedPublicly()->findOrFail($venue);

        $user = $request->user();
        if ($user->followedVenues()->whereKey($model->id)->exists()) {
            $user->followedVenues()->detach($model->id);

            return back()->with('success', 'Mekân takibinden çıkarıldı.');
        }

        $user->followedVenues()->attach($model->id);

        return back()->with('success', 'Mekân takip ediliyor.');
    }
}
