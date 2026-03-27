<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventReview;
use App\Services\SahnebulMail;
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

        $user = $request->user();
        if (! $user->canUsePublicEngagementFeatures()) {
            return back()->with('error', 'Etkinlik değerlendirmesi için doğrulanmış e-posta ve uygun hesap türü gerekir.');
        }

        if (! $user->canSubmitEventReviewForEvent((int) $event->id)) {
            return back()->with(
                'error',
                'Etkinlik değerlendirmesi yalnızca bu etkinlik için onaylanmış veya tamamlanmış rezervasyonu olan kullanıcılar yapabilir.'
            );
        }

        $existing = EventReview::where('event_id', $event->id)->where('user_id', $user->id)->first();
        if ($existing) {
            return back()->with('error', 'Bu etkinlik için zaten değerlendirme yaptınız.');
        }

        $review = EventReview::create([
            'event_id' => $event->id,
            'user_id' => $user->id,
            'rating' => $request->integer('rating'),
            'comment' => $request->input('comment'),
            'is_approved' => true,
        ]);

        $venue = $event->venue;
        if ($venue) {
            $venue->loadMissing('user');
            if ($venue->user) {
                SahnebulMail::newEventReviewForVenueOwner($venue->user, $review, $event, $venue);
            }
        }

        return back()->with('success', 'Etkinlik değerlendirmeniz kaydedildi.');
    }
}
