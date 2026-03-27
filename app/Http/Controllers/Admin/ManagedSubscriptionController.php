<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Venue;
use App\Services\Admin\AdminSubscriptionAssignmentService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ManagedSubscriptionController extends Controller
{
    public function __construct(
        private readonly AdminSubscriptionAssignmentService $assignmentService,
    ) {}

    public function updateForVenue(Request $request, Venue $venue)
    {
        $user = $venue->user;
        if ($user === null) {
            return back()->with('error', 'Bu mekâna bağlı kullanıcı yok; üyelik paketi atanamaz.');
        }

        $validated = $request->validate([
            'subscription_mode' => ['required', 'in:remove,plan,complimentary'],
            'subscription_plan_id' => ['nullable', 'integer', 'exists:subscription_plans,id'],
            'subscription_ends_at' => ['nullable', 'date', 'after:now'],
        ]);

        try {
            $mode = $validated['subscription_mode'];
            $planId = isset($validated['subscription_plan_id']) ? (int) $validated['subscription_plan_id'] : null;
            $endsAt = isset($validated['subscription_ends_at']) && $validated['subscription_ends_at'] !== ''
                ? Carbon::parse($validated['subscription_ends_at'], config('app.timezone'))
                : null;

            if ($mode === 'plan' && ($planId === null || $planId <= 0)) {
                return back()->withErrors(['subscription_plan_id' => 'Paket seçin.'])->withInput();
            }

            $serviceMode = match ($mode) {
                'remove' => 'remove',
                'complimentary' => 'complimentary',
                default => 'plan',
            };

            $this->assignmentService->assign(
                $user,
                $serviceMode,
                $mode === 'plan' ? $planId : null,
                $mode === 'plan' ? $endsAt : null,
                'venue',
            );
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', 'Üyelik güncellenemedi: '.$e->getMessage());
        }

        return back()->with('success', 'Mekân sahibi üyelik paketi güncellendi.');
    }

    public function updateForArtist(Request $request, Artist $artist)
    {
        $user = $artist->user;
        if ($user === null) {
            return back()->with('error', 'Bu sanatçıya bağlı kullanıcı yok; üyelik paketi atanamaz.');
        }

        $validated = $request->validate([
            'subscription_mode' => ['required', 'in:remove,plan,complimentary'],
            'subscription_plan_id' => ['nullable', 'integer', 'exists:subscription_plans,id'],
            'subscription_ends_at' => ['nullable', 'date', 'after:now'],
        ]);

        try {
            $mode = $validated['subscription_mode'];
            $planId = isset($validated['subscription_plan_id']) ? (int) $validated['subscription_plan_id'] : null;
            $endsAt = isset($validated['subscription_ends_at']) && $validated['subscription_ends_at'] !== ''
                ? Carbon::parse($validated['subscription_ends_at'], config('app.timezone'))
                : null;

            if ($mode === 'plan' && ($planId === null || $planId <= 0)) {
                return back()->withErrors(['subscription_plan_id' => 'Paket seçin.'])->withInput();
            }

            $serviceMode = match ($mode) {
                'remove' => 'remove',
                'complimentary' => 'complimentary',
                default => 'plan',
            };

            $this->assignmentService->assign(
                $user,
                $serviceMode,
                $mode === 'plan' ? $planId : null,
                $mode === 'plan' ? $endsAt : null,
                'artist',
            );
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', 'Üyelik güncellenemedi: '.$e->getMessage());
        }

        return back()->with('success', 'Sanatçı kullanıcı üyelik paketi güncellendi.');
    }
}
