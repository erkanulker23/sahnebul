<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class EventPublicController extends Controller
{
    public function show(string $event, ExternalEventPublicController $externalEvents): Response|RedirectResponse
    {
        if (preg_match('/^dis(\d+)$/i', $event, $m)) {
            return $externalEvents->showForPublicSegment((int) $m[1], $event);
        }

        $model = $this->resolvePublicEventParameter($event);
        $canonical = $model->publicUrlSegment();

        if ($event !== $canonical) {
            return redirect()->route('events.show', ['event' => $canonical], 301);
        }

        return $this->renderPublishedEventShow($model);
    }

    private function resolvePublicEventParameter(string $segment): Event
    {
        if (ctype_digit($segment)) {
            return Event::query()
                ->published()
                ->whereHas('venue', fn ($q) => $q->where('status', 'approved'))
                ->whereKey((int) $segment)
                ->firstOrFail();
        }

        if (preg_match('/^(.+)-(\d+)$/u', $segment, $m)) {
            $id = (int) $m[2];

            return Event::query()
                ->published()
                ->whereHas('venue', fn ($q) => $q->where('status', 'approved'))
                ->whereKey($id)
                ->firstOrFail();
        }

        abort(404);
    }

    private function renderPublishedEventShow(Event $event): Response
    {
        if ($event->venue?->status !== 'approved') {
            abort(404);
        }

        if (Schema::hasColumn('events', 'view_count')) {
            $event->increment('view_count');
            $event->refresh();
        }

        $event->load([
            'venue:id,name,slug,address,city_id,category_id,phone,whatsapp,website,social_links',
            'venue.city:id,name',
            'venue.category:id,name',
            'artists' => fn ($q) => $q
                ->select('artists.id', 'artists.name', 'artists.slug', 'artists.avatar', 'artists.genre', 'artists.bio')
                ->orderByPivot('is_headliner', 'desc')
                ->orderByPivot('order')
                ->with(['media' => fn ($m) => $m->orderBy('order')->limit(1)]),
            'ticketTiers',
        ]);

        $event->artists->each(function ($artist): void {
            $fallback = $artist->media->first();
            $path = $artist->avatar ?? $fallback?->path ?? $fallback?->thumbnail;
            $artist->setAttribute('display_image', $path);
        });

        $relatedEvents = Event::query()
            ->published()
            ->where('venue_id', $event->venue_id)
            ->where('id', '!=', $event->id)
            ->where('start_date', '>=', now()->subDays(30))
            ->orderBy('start_date')
            ->limit(6)
            ->with('ticketTiers')
            ->get(['id', 'slug', 'title', 'start_date', 'ticket_price', 'venue_id', 'is_full', 'cover_image']);

        return Inertia::render('Events/Show', [
            'event' => $event,
            'relatedEvents' => $relatedEvents,
        ]);
    }
}
