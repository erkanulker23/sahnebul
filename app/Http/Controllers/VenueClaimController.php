<?php

namespace App\Http\Controllers;

use App\Models\Venue;
use App\Models\VenueClaimRequest;
use Illuminate\Http\Request;

class VenueClaimController extends Controller
{
    public function store(Request $request, Venue $venue)
    {
        if (! $request->user()->hasActiveMembership('venue')) {
            return redirect()->route('subscriptions.index', ['type' => 'venue'])
                ->with('error', 'Mekan sahiplenme için aktif Mekan Üyeliği gerekir.');
        }

        if ($venue->user_id) {
            return back()->with('error', 'Bu mekan zaten bir işletme sahibine atanmış.');
        }

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'phone' => 'required|string|max:30',
            'email' => 'required|email|max:255',
            'message' => 'nullable|string|max:1000',
        ]);

        VenueClaimRequest::updateOrCreate(
            ['venue_id' => $venue->id, 'user_id' => $request->user()->id],
            [
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'phone' => $validated['phone'],
                'email' => $validated['email'],
                'message' => $validated['message'] ?? null,
                'status' => 'pending',
                'reviewed_at' => null,
                'reviewed_by' => null,
            ],
        );

        return back()->with('success', 'Sahiplenme talebiniz alındı. Admin onayından sonra mekan hesabınıza bağlanacaktır.');
    }
}
