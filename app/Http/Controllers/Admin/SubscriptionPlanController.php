<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SubscriptionPlanController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Subscriptions/Index', [
            'plans' => SubscriptionPlan::orderBy('price')->get(),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Subscriptions/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'membership_type' => 'required|in:artist,venue',
            'interval' => 'required|in:monthly,yearly',
            'trial_days' => 'required|integer|in:0,7,14',
            'price' => 'required|numeric|min:0',
            'features' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $trialDays = (int) $validated['trial_days'];
        $slugBase = Str::slug($validated['name'].'-'.$validated['membership_type'].'-'.$validated['interval']);
        $slug = $trialDays > 0 ? $slugBase.'-deneme-'.$trialDays.'g' : $slugBase;

        SubscriptionPlan::create([
            ...$validated,
            'trial_days' => $trialDays,
            'slug' => $slug,
            'is_active' => (bool) ($validated['is_active'] ?? true),
            'show_in_public_catalog' => true,
        ]);

        return redirect()->route('admin.subscriptions.index')->with('success', 'Paket eklendi.');
    }

    public function update(Request $request, SubscriptionPlan $plan)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'membership_type' => 'required|in:artist,venue',
            'interval' => 'required|in:monthly,yearly',
            'trial_days' => 'required|integer|in:0,7,14',
            'price' => 'required|numeric|min:0',
            'features' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $plan->update([
            ...$validated,
            'trial_days' => (int) $validated['trial_days'],
            'is_active' => (bool) ($validated['is_active'] ?? false),
        ]);

        return back()->with('success', 'Paket güncellendi.');
    }
}
