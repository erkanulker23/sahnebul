<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\PublicEditSuggestion;
use App\Models\Venue;
use App\Services\SahnebulMail;
use App\Support\ArtistEditSuggestionPayload;
use App\Support\UserContactValidation;
use Illuminate\Http\Request;

class PublicEditSuggestionController extends Controller
{
    public function storeArtist(Request $request, Artist $artist)
    {
        abort_unless($artist->status === 'approved', 404);

        return $this->store($request, $artist);
    }

    public function storeVenue(Request $request, Venue $venue)
    {
        abort_unless($venue->status === 'approved', 404);

        return $this->store($request, $venue);
    }

    private function store(Request $request, Artist|Venue $entity)
    {
        if (! $request->user()) {
            $request->validate([
                'guest_name' => ['required', 'string', 'max:120'],
                'guest_email' => UserContactValidation::emailRequired(),
            ]);
        }

        if ($entity instanceof Artist) {
            $payload = ArtistEditSuggestionPayload::validateAndNormalize($request);
            $message = $payload['message'];
            $proposedChanges = $payload['proposed_changes'];
        } else {
            $validated = $request->validate([
                'message' => ['required', 'string', 'min:20', 'max:5000'],
            ]);
            $message = $validated['message'];
            $proposedChanges = null;
        }

        $row = PublicEditSuggestion::create([
            'suggestable_type' => $entity->getMorphClass(),
            'suggestable_id' => $entity->getKey(),
            'user_id' => $request->user()?->id,
            'guest_name' => $request->user() ? null : $request->string('guest_name')->toString(),
            'guest_email' => $request->user() ? null : $request->string('guest_email')->toString(),
            'message' => $message,
            'proposed_changes' => $proposedChanges,
            'status' => 'pending',
        ]);

        $row->load(['user', 'suggestable']);
        SahnebulMail::publicEditSuggestionSubmitted($row);

        return back()->with('success', 'Öneriniz alındı. İnceleyip değerlendireceğiz. Teşekkür ederiz.');
    }
}
