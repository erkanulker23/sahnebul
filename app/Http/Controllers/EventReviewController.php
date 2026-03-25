<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventReview;
use Illuminate\Http\Request;

class EventReviewController extends Controller
{
    public function store(Request $request, Event $event)
    {
        $event->loadMissing('venue');
        if ($event->status !== 'published' || ($event->venue?->status ?? '') !== 'approved') {
            abort(404);
        }

        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:2000',
        ]);

        $existing = EventReview::where('event_id', $event->id)->where('user_id', $request->user()->id)->first();
        if ($existing) {
            return back()->with('error', 'Bu etkinlik için zaten değerlendirme yaptınız.');
        }

        EventReview::create([
            'event_id' => $event->id,
            'user_id' => $request->user()->id,
            'rating' => $request->integer('rating'),
            'comment' => $request->input('comment'),
            'is_approved' => true,
        ]);

        return back()->with('success', 'Etkinlik değerlendirmeniz kaydedildi.');
    }
}
