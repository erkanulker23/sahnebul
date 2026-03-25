<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EventArtistReport;
use App\Services\AppSettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EventArtistReportController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();
        $allowed = ['', 'pending', 'resolved', 'dismissed'];
        if (! in_array($status, $allowed, true)) {
            $status = '';
        }

        $reports = EventArtistReport::query()
            ->with([
                'event:id,title,slug,venue_id,status,start_date',
                'event.venue:id,name,slug,user_id',
                'artist:id,name,slug',
                'user:id,name,email',
            ])
            ->when($status !== '', fn ($q) => $q->where('status', $status))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Admin/EventArtistReports/Index', [
            'reports' => $reports,
            'filters' => ['status' => $status === '' ? null : $status],
        ]);
    }

    public function update(Request $request, EventArtistReport $report): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:resolved,dismissed'],
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $report->update([
            'status' => $validated['status'],
            'admin_note' => isset($validated['admin_note']) && trim($validated['admin_note']) !== ''
                ? trim($validated['admin_note'])
                : null,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ]);

        app(AppSettingsService::class)->forgetCaches();

        return back()->with('success', 'Rapor kaydı güncellendi.');
    }
}
