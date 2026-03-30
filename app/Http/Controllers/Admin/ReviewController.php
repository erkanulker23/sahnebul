<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReviewController extends Controller
{
    public function index(Request $request)
    {
        $reviews = Review::with(['venue', 'user'])
            ->when($request->approved === 'pending', fn ($q) => $q->where('is_approved', false))
            ->when($request->approved === 'yes', fn ($q) => $q->where('is_approved', true))
            ->when($request->search, fn ($q) => $q->where('comment', 'like', "%{$request->search}%"))
            ->latest()
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Admin/Reviews/Index', [
            'reviews' => $reviews,
            'filters' => $request->only(['approved', 'search']),
        ]);
    }

    public function approve(Review $review)
    {
        $review->update(['is_approved' => true]);
        $review->venue->update([
            'review_count' => $review->venue->reviews()->where('is_approved', true)->count(),
            'rating_avg' => (int) round($review->venue->reviews()->where('is_approved', true)->avg('rating')),
        ]);
        return back()->with('success', 'Yorum onaylandı.');
    }

    public function destroy(Review $review)
    {
        $venue = $review->venue;
        $review->delete();
        $venue->update([
            'review_count' => $venue->reviews()->where('is_approved', true)->count(),
            'rating_avg' => (int) round($venue->reviews()->where('is_approved', true)->avg('rating')),
        ]);
        return back()->with('success', 'Yorum silindi.');
    }
}
