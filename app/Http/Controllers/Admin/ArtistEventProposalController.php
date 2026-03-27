<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ArtistEventProposal;
use App\Services\Admin\ArtistEventProposalApprovalService;
use App\Services\AppSettingsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ArtistEventProposalController extends Controller
{
    public function index(): Response
    {
        $proposals = ArtistEventProposal::query()
            ->with(['user:id,name,email', 'artist:id,name,slug'])
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('Admin/ArtistEventProposals/Index', [
            'proposals' => $proposals,
        ]);
    }

    public function show(ArtistEventProposal $proposal): Response
    {
        $proposal->load([
            'user:id,name,email',
            'artist:id,name,slug',
            'reviewedBy:id,name',
            'createdVenue:id,name,slug,status',
            'createdEvent:id,title,status,slug',
        ]);

        return Inertia::render('Admin/ArtistEventProposals/Show', [
            'proposal' => $proposal,
        ]);
    }

    public function approve(Request $request, ArtistEventProposal $proposal, ArtistEventProposalApprovalService $approval)
    {
        $approval->approve($proposal, $request->user());

        return redirect()
            ->route('admin.artist-event-proposals.show', $proposal)
            ->with('success', 'Öneri onaylandı; mekân onaylı olarak ve etkinlik taslak olarak oluşturuldu.');
    }

    public function reject(Request $request, ArtistEventProposal $proposal)
    {
        if ($proposal->status !== ArtistEventProposal::STATUS_PENDING) {
            return back()->with('error', 'Bu öneri zaten işlenmiş.');
        }

        $validated = $request->validate([
            'message' => 'nullable|string|max:2000',
        ]);

        $proposal->update([
            'status' => ArtistEventProposal::STATUS_REJECTED,
            'admin_message' => $validated['message'] ?? null,
            'reviewed_by_user_id' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        app(AppSettingsService::class)->forgetCaches();

        return redirect()
            ->route('admin.artist-event-proposals.index')
            ->with('success', 'Öneri reddedildi.');
    }
}
