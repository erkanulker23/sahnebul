<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VenueClaimRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VenueClaimController extends Controller
{
    public function index()
    {
        $claims = VenueClaimRequest::query()
            ->with(['venue:id,name,slug,user_id', 'user:id,name,email'])
            ->latest()
            ->paginate(20);

        return Inertia::render('Admin/VenueClaims/Index', [
            'claims' => $claims,
        ]);
    }

    public function approve(Request $request, VenueClaimRequest $claim)
    {
        $claim->load('venue');
        $claim->venue->update(['user_id' => $claim->user_id]);
        $claim->update([
            'status' => 'approved',
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ]);

        VenueClaimRequest::where('venue_id', $claim->venue_id)
            ->where('id', '!=', $claim->id)
            ->where('status', 'pending')
            ->update(['status' => 'rejected', 'reviewed_at' => now(), 'reviewed_by' => $request->user()->id]);

        return back()->with('success', 'Sahiplenme talebi onaylandı.');
    }

    public function reject(Request $request, VenueClaimRequest $claim)
    {
        $claim->update([
            'status' => 'rejected',
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ]);
        return back()->with('success', 'Sahiplenme talebi reddedildi.');
    }
}
