<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ArtistClaimRequest;
use App\Services\SahnebulMail;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ArtistClaimController extends Controller
{
    public function index()
    {
        $claims = ArtistClaimRequest::query()
            ->with(['artist:id,name,slug,user_id', 'user:id,name,email'])
            ->latest()
            ->paginate(20);

        return Inertia::render('Admin/ArtistClaims/Index', ['claims' => $claims]);
    }

    public function approve(Request $request, ArtistClaimRequest $claim)
    {
        $claim->load('artist');
        $claim->artist->update(['user_id' => $claim->user_id]);
        $claim->update(['status' => 'approved', 'reviewed_at' => now(), 'reviewed_by' => $request->user()->id]);

        ArtistClaimRequest::where('artist_id', $claim->artist_id)
            ->where('id', '!=', $claim->id)
            ->where('status', 'pending')
            ->update(['status' => 'rejected', 'reviewed_at' => now(), 'reviewed_by' => $request->user()->id]);

        SahnebulMail::artistClaimResolved($claim->fresh(['artist', 'user']), true);

        return back()->with('success', 'Sanatçı profili sahiplenme talebi onaylandı.');
    }

    public function reject(Request $request, ArtistClaimRequest $claim)
    {
        $claim->update(['status' => 'rejected', 'reviewed_at' => now(), 'reviewed_by' => $request->user()->id]);

        SahnebulMail::artistClaimResolved($claim->fresh(['artist', 'user']), false);

        return back()->with('success', 'Sanatçı profili sahiplenme talebi reddedildi.');
    }
}
