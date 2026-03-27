<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FavoriteArtistController extends Controller
{
    public function toggle(Request $request, int $artist): RedirectResponse
    {
        abort_unless($request->user()->canUsePublicEngagementFeatures(), 403);

        $model = Artist::query()->where('status', 'approved')->findOrFail($artist);

        $user = $request->user();
        if ($user->favoriteArtists()->whereKey($model->id)->exists()) {
            $user->favoriteArtists()->detach($model->id);

            return back()->with('success', 'Favorilerden çıkarıldı.');
        }

        $user->favoriteArtists()->attach($model->id);

        return back()->with('success', 'Favorilere eklendi.');
    }
}
