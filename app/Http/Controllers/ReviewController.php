<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\Venue;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReviewController extends Controller
{
    public function store(Request $request, Venue $venue)
    {
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:2000',
        ]);

        $existing = Review::where('venue_id', $venue->id)->where('user_id', $request->user()->id)->first();
        if ($existing) {
            return back()->with('error', 'Bu sahne için zaten değerlendirme yaptınız.');
        }

        $review = Review::create([
            'venue_id' => $venue->id,
            'user_id' => $request->user()->id,
            'rating' => $request->rating,
            'comment' => $request->comment,
            'is_approved' => true,
        ]);

        $venue->update([
            'review_count' => $venue->reviews()->where('is_approved', true)->count(),
            'rating_avg' => (int) round($venue->reviews()->where('is_approved', true)->avg('rating')),
        ]);

        return back()->with('success', 'Değerlendirmeniz kaydedildi.');
    }

    public function like(Review $review)
    {
        $user = auth()->user();
        $existing = $review->likes()->where('user_id', $user->id)->first();

        if ($existing) {
            $existing->delete();
            $liked = false;
        } else {
            $review->likes()->create(['user_id' => $user->id]);
            $liked = true;
        }

        return response()->json(['liked' => $liked, 'count' => $review->likes()->count()]);
    }
}
