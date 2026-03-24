<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $venues = $request->user()->venues()->with('city', 'category')->get();
        $venueIds = $venues->pluck('id');

        $stats = [
            'venues_count' => $venues->count(),
            'pending_reservations' => Reservation::whereIn('venue_id', $venueIds)->where('status', 'pending')->count(),
            'total_revenue' => Reservation::whereIn('venue_id', $venueIds)->whereIn('status', ['confirmed', 'completed'])->sum('total_amount'),
        ];

        $recentReservations = Reservation::whereIn('venue_id', $venueIds)
            ->with(['user', 'venue'])
            ->latest()
            ->limit(5)
            ->get();

        $sub = $request->user()->activeSubscription()?->load('plan');

        return Inertia::render('Artist/Dashboard', [
            'stats' => $stats,
            'venues' => $venues,
            'recentReservations' => $recentReservations,
            'activeSubscription' => $sub && $sub->plan
                ? [
                    'ends_at' => $sub->ends_at->toIso8601String(),
                    'starts_at' => $sub->starts_at->toIso8601String(),
                    'plan' => [
                        'name' => $sub->plan->name,
                        'slug' => $sub->plan->slug,
                        'membership_type' => $sub->plan->membership_type,
                        'interval' => $sub->plan->interval,
                        'features' => $sub->plan->features,
                    ],
                ]
                : null,
        ]);
    }
}
