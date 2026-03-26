<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\Event;
use App\Models\EventReview;
use App\Support\DailyUniqueEntityView;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class EventPublicController extends Controller
{
    public function show(Request $request, string $event, ExternalEventPublicController $externalEvents): Response|RedirectResponse
    {
        if (preg_match('/^dis(\d+)$/i', $event, $m)) {
            return $externalEvents->showForPublicSegment((int) $m[1], $event);
        }

        $model = $this->resolvePublicEventParameter($event);
        $canonical = $model->publicUrlSegment();

        if ($event !== $canonical) {
            return redirect()->route('events.show', ['event' => $canonical], 301);
        }

        return $this->renderPublishedEventShow($request, $model);
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

    private function renderPublishedEventShow(Request $request, Event $event): Response
    {
        if ($event->venue?->status !== 'approved') {
            abort(404);
        }

        if (Schema::hasColumn('events', 'view_count')) {
            DailyUniqueEntityView::recordOncePerVisitorPerDay(
                $request,
                'event',
                (int) $event->id,
                fn () => $event->increment('view_count')
            );
            $event->refresh();
        }

        $event->load([
            'venue:id,name,slug,address,city_id,category_id,phone,whatsapp,website,social_links,cover_image',
            'venue.city:id,name',
            'venue.category:id,name',
            'artists' => fn ($q) => $q
                ->select('artists.id', 'artists.name', 'artists.slug', 'artists.avatar', 'artists.genre', 'artists.bio')
                ->orderByPivot('is_headliner', 'desc')
                ->orderByPivot('order')
                ->with(['media' => fn ($m) => $m->orderBy('order')->limit(1)]),
            'ticketTiers',
        ]);

        Artist::hydrateDisplayImages($event->artists);

        $eventReviews = EventReview::query()
            ->where('event_id', $event->id)
            ->where('is_approved', true)
            ->with('user:id,name,avatar')
            ->latest()
            ->limit(40)
            ->get();

        $artistIds = $event->artists->pluck('id')->all();

        $upcomingColumns = ['id', 'slug', 'title', 'start_date', 'ticket_price', 'venue_id', 'is_full', 'cover_image', 'listing_image'];

        $upcomingRelations = [
            'venue' => fn ($q) => $q
                ->select('id', 'name', 'slug', 'city_id', 'category_id', 'cover_image')
                ->with(['city:id,name', 'category:id,name']),
            'artists' => fn ($q) => $q
                ->select('artists.id', 'artists.name', 'artists.slug', 'artists.avatar')
                ->orderByPivot('is_headliner', 'desc')
                ->orderByPivot('order'),
        ];

        $venueUpcomingEvents = Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->where('status', 'approved'))
            ->where('venue_id', $event->venue_id)
            ->where('id', '!=', $event->id)
            ->whereNotNull('start_date')
            ->where('start_date', '>=', now())
            ->orderBy('start_date')
            ->limit(12)
            ->with($upcomingRelations)
            ->get($upcomingColumns);

        $artistUpcomingEvents = new EloquentCollection;
        if ($artistIds !== []) {
            $artistUpcomingEvents = Event::query()
                ->published()
                ->whereHas('venue', fn ($q) => $q->where('status', 'approved'))
                ->where('venue_id', '!=', $event->venue_id)
                ->where('id', '!=', $event->id)
                ->whereNotNull('start_date')
                ->where('start_date', '>=', now())
                ->whereHas('artists', fn ($q) => $q->whereIn('artists.id', $artistIds))
                ->orderBy('start_date')
                ->limit(8)
                ->with($upcomingRelations)
                ->get($upcomingColumns);
        }

        $u = $request->user();
        $hasEventReminder = $u !== null
            && $u->isCustomer()
            && $u->email_verified_at !== null
            && $u->remindedEvents()->whereKey($event->id)->exists();

        return Inertia::render('Events/Show', [
            'event' => $event,
            'venueUpcomingEvents' => $venueUpcomingEvents,
            'artistUpcomingEvents' => $artistUpcomingEvents,
            'eventReviews' => $eventReviews,
            'eventCustomerActions' => [
                'canToggle' => $u !== null && $u->isCustomer() && $u->email_verified_at !== null
                    && $event->start_date !== null
                    && $event->start_date->isFuture(),
                'hasReminder' => $hasEventReminder,
            ],
        ]);
    }
}
