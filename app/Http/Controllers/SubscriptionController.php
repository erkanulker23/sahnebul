<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use App\Models\UserSubscription;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubscriptionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            return redirect()->route('admin.dashboard')
                ->with('error', 'Süper yöneticiler üyelik paketi satın alamaz.');
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
                || $user->isManagerOrganization()
                || $user->venues_count > 0,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:subscription_plans,id',
        ]);

        $plan = SubscriptionPlan::findOrFail($validated['plan_id']);
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            abort(403, 'Süper yöneticiler üyelik paketi satın alamaz.');
        }

        if ($plan->membership_type === 'artist' && ! $user->isArtist()) {
            return redirect()->route('subscriptions.index', ['type' => 'artist'])
                ->with('error', 'Sanatçı üyeliği yalnızca sanatçı hesapları satın alabilir.');
        }

        if ($plan->membership_type === 'venue' && ! $user->venues()->exists()) {
            return redirect()->route('subscriptions.index', ['type' => 'venue'])
                ->with('error', 'Mekan üyeliği yalnızca size bağlı en az bir mekan varken satın alınabilir.');
        }

        if ($plan->membership_type === 'manager' && ! $user->isManagerOrganization()) {
            return redirect()->route('subscriptions.index', ['type' => 'manager'])
                ->with('error', 'Organizasyon üyeliği yalnızca organizasyon firması hesapları satın alabilir.');
        }

        $current = $user->activeSubscription();
        if ($current) {
            $current->update(['status' => 'cancelled']);
        }

        $startsAt = now();
        $trialDays = (int) ($plan->trial_days ?? 0);
        $afterTrial = $startsAt->copy()->addDays($trialDays);
        $endsAt = $plan->interval === 'yearly'
            ? $afterTrial->copy()->addYear()
            : $afterTrial->copy()->addMonth();

        UserSubscription::create([
            'user_id' => $user->id,
            'subscription_plan_id' => $plan->id,
            'status' => 'active',
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
        ]);

        return redirect()->route('artist.dashboard')
            ->with('success', 'Gold üyelik aktif edildi. Artık mekan ve etkinlik yönetebilirsiniz.');
    }
}
