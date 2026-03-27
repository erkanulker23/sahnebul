<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Event;
use App\Models\Reservation;
use App\Models\Review;
use App\Models\User;
use App\Models\Venue;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'users_count' => User::count(),
            'venues_count' => Venue::count(),
            'pending_venues' => Venue::where('status', 'pending')->count(),
            'pending_artists' => Artist::where('status', 'pending')->count(),
            'draft_events' => Event::where('status', 'draft')->count(),
            'reservations_today' => Reservation::whereDate('reservation_date', Carbon::today())->count(),
            'reviews_pending' => Review::where('is_approved', false)->count(),
            'events_upcoming' => Event::where('start_date', '>=', now())->where('status', 'published')->count(),
            'total_revenue' => Reservation::whereIn('status', ['confirmed', 'completed'])->sum('total_amount'),
            'new_users_week' => User::where('created_at', '>=', Carbon::now()->subWeek())->count(),
        ];

        $recentVenues = Venue::with('city', 'category')
            ->latest()
            ->limit(8)
            ->get();

        $pendingArtists = Artist::query()
            ->where('status', 'pending')
            ->latest()
            ->limit(8)
            ->get(['id', 'name', 'slug', 'genre', 'created_at']);

        $upcomingEvents = Event::query()
            ->published()
            ->with(['venue:id,name,slug'])
            ->orderBy('start_date')
            ->limit(8)
            ->get(['id', 'venue_id', 'title', 'start_date', 'status']);

        $recentReservations = Reservation::with(['user', 'venue'])
            ->latest()
            ->limit(5)
            ->get();

        $popularVenues = Venue::approved()
            ->orderByDesc('review_count')
            ->limit(5)
            ->get(['id', 'name', 'slug', 'review_count', 'rating_avg']);

        $topViewedArtists = Artist::query()
            ->approved()
            ->orderByDesc('view_count')
            ->limit(5)
            ->get(['id', 'name', 'slug', 'view_count']);

        $topViewedEvents = Event::query()
            ->orderByDesc('view_count')
            ->limit(5)
            ->with(['venue:id,name,slug'])
            ->get(['id', 'venue_id', 'title', 'view_count']);

        $usersChart = User::query()
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->where('created_at', '>=', Carbon::now()->subDays(14))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
            'recentVenues' => $recentVenues,
            'recentReservations' => $recentReservations,
            'popularVenues' => $popularVenues,
            'topViewedArtists' => $topViewedArtists,
            'topViewedEvents' => $topViewedEvents,
            'usersChart' => $usersChart,
            'pendingArtists' => $pendingArtists,
            'upcomingEvents' => $upcomingEvents,
        ]);
    }
}
