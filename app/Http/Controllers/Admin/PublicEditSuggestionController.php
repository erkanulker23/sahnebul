<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\PublicEditSuggestion;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PublicEditSuggestionController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->query('status', 'pending');
        if (! in_array($status, ['pending', 'reviewed', 'all'], true)) {
            $status = 'pending';
        }

        $q = PublicEditSuggestion::query()
            ->with(['user:id,name,email', 'suggestable'])
            ->orderByDesc('created_at');

        if ($status === 'pending') {
            $q->where('status', 'pending');
        } elseif ($status === 'reviewed') {
            $q->where('status', 'reviewed');
        }

        $rows = $q->paginate(30)->withQueryString();

        $rows->getCollection()->transform(function (PublicEditSuggestion $s) {
            $entity = $s->suggestable;
            $type = $entity instanceof Artist ? 'artist' : 'venue';
            $name = $entity?->name ?? '—';
            $slug = $entity?->slug ?? '';

            return [
                'id' => $s->id,
                'status' => $s->status,
                'message' => $s->message,
                'proposed_changes' => $s->proposed_changes,
                'submitter' => $s->submitterLabel(),
                'created_at' => $s->created_at?->toIso8601String(),
                'entity_type' => $type,
                'entity_name' => $name,
                'entity_slug' => $slug,
                'entity_id' => $entity?->getKey(),
                'public_url' => $type === 'artist'
                    ? route('artists.show', $slug, absolute: true)
                    : route('venues.show', $slug, absolute: true),
            ];
        });

        return Inertia::render('Admin/PublicEditSuggestions/Index', [
            'suggestions' => $rows,
            'filters' => ['status' => $status],
        ]);
    }

    public function markReviewed(Request $request, PublicEditSuggestion $suggestion)
    {
        $suggestion->update(['status' => 'reviewed']);

        return back()->with('success', 'Öneri incelendi olarak işaretlendi.');
    }
}
