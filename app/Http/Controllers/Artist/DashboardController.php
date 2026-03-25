<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Reservation;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $venues = $request->user()->venues()->with('city', 'category')->get();
        $venueIds = $venues->pluck('id');

        $eventBase = Event::query()->whereIn('venue_id', $venueIds);
        $eventPerformance = [
            'total_views' => (int) (clone $eventBase)->sum('view_count'),
            'events_total' => (int) (clone $eventBase)->count(),
            'published_total' => (int) (clone $eventBase)->where('status', 'published')->count(),
            'top_events' => (clone $eventBase)
                ->with('venue:id,name')
                ->orderByDesc('view_count')
                ->limit(5)
                ->get(['id', 'title', 'slug', 'view_count', 'start_date', 'status', 'venue_id'])
                ->map(fn (Event $e) => [
                    'id' => $e->id,
                    'title' => $e->title,
                    'slug' => $e->slug,
                    'public_url_segment' => $e->status === 'published' ? $e->publicUrlSegment() : null,
                    'view_count' => (int) $e->view_count,
                    'start_date' => $e->start_date?->toIso8601String(),
                    'status' => $e->status,
                    'venue_name' => $e->venue?->name,
                ])
                ->values()
                ->all(),
        ];

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
            'eventPerformance' => $eventPerformance,
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
