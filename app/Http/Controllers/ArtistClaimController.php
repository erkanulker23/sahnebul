<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\ArtistClaimRequest;
use App\Services\SahnebulMail;
use App\Support\TurkishPhone;
use App\Support\UserContactValidation;
use Illuminate\Http\Request;

class ArtistClaimController extends Controller
{
    public function store(Request $request, Artist $artist)
    {
        if ($artist->user_id) {
            return back()->with('error', 'Bu sanatçı profili zaten bir kullanıcıya bağlı.');
        }

        if (! $request->user()->hasActiveMembership('artist')) {
            return redirect()->route('subscriptions.index', ['type' => 'artist'])
                ->with('error', 'Sanatçı profili sahiplenmek için aktif Sanatçı Üyeliği gerekir.');
        }

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'phone' => UserContactValidation::phoneRequired(),
            'email' => UserContactValidation::emailRequired(),
            'message' => 'nullable|string|max:1000',
        ]);
        $validated = TurkishPhone::mergeNormalizedInto($validated, ['phone']);

        $claim = ArtistClaimRequest::updateOrCreate(
            ['artist_id' => $artist->id, 'user_id' => $request->user()->id],
            [
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'phone' => $validated['phone'],
                'email' => $validated['email'],
                'message' => $validated['message'] ?? null,
                'status' => 'pending',
                'reviewed_at' => null,
                'reviewed_by' => null,
            ]
        );

        SahnebulMail::artistClaimSubmitted($artist, $request->user(), $claim);

        return back()->with('success', 'Sanatçı profili sahiplenme talebiniz alındı.');
    }
}
