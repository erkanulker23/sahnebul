<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use App\Services\Subscriptions\SubscriptionPurchaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use InvalidArgumentException;

class SubscriptionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return redirect()->route('admin.dashboard')
                ->with('error', 'Yönetici hesapları üyelik paketi satın alamaz.');
        }

        $user->loadCount('venues');

        $plans = SubscriptionPlan::query()
            ->where('is_active', true)
            ->where('show_in_public_catalog', true)
            ->when($request->filled('type'), fn ($q) => $q->where('membership_type', $request->string('type')->toString()))
            ->orderBy('price')
            ->get();

        return Inertia::render('Subscriptions/Index', [
            'plans' => $plans,
            'activeSubscription' => $user->activeSubscription()?->load('plan'),
            'selectedType' => $request->input('type', 'venue'), // venue | artist | manager
            'useArtistPanel' => $user->canAccessStagePanel(),
            'canPurchase' => $user->isArtist()
                || $user->isVenueOwner()
                || $user->isManagementAccount()
                || $user->venues_count > 0,
        ]);
    }

    public function store(Request $request, SubscriptionPurchaseService $purchaseService)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:subscription_plans,id',
        ]);

        $plan = SubscriptionPlan::findOrFail($validated['plan_id']);
        $user = $request->user();

        if ($user->isAdmin()) {
            abort(403, 'Yönetici hesapları üyelik paketi satın alamaz.');
        }

        try {
            $purchaseService->purchase($user, $plan);
        } catch (InvalidArgumentException $e) {
            Log::channel('security')->notice('subscription.purchase_rejected', [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'reason' => $e->getMessage(),
            ]);

            return redirect()
                ->route('subscriptions.index', ['type' => $plan->membership_type])
                ->with('error', $e->getMessage());
        }

        return redirect()->route('artist.dashboard')
            ->with('success', 'Gold üyelik aktif edildi. Artık mekan ve etkinlik yönetebilirsiniz.');
    }
}
