<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Support\LiveTonightEventQuery;
use App\Support\TonightVibePresets;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class LiveSceneController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('LiveScene/Index', [
            'vibes' => TonightVibePresets::forFrontend(),
            'initialVibe' => $request->query('vibe', ''),
        ]);
    }

    public function mapData(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vibe' => ['nullable', 'string', 'max:64'],
        ]);
        $vibe = isset($validated['vibe']) ? trim((string) $validated['vibe']) : '';
        if ($vibe !== '' && TonightVibePresets::definitionById($vibe) === null) {
            $vibe = '';
        }

        $query = Event::query()
            ->published()
            ->whereNotNull('events.start_date')
            ->whereHas('venue', fn ($q) => $q->listedPublicly()
                ->whereNotNull('latitude')
                ->whereNotNull('longitude'))
            ->whereStillVisibleOnPublicListing();

        LiveTonightEventQuery::applySevenDayMapWindow($query);
        TonightVibePresets::applyToQuery($query, $vibe === '' ? null : $vibe);

        $query->orderBy('events.start_date');

        $events = $query->with([
            'venue' => fn ($q) => $q->select(
                'venues.id',
                'venues.name',
                'venues.slug',
                'venues.address',
                'venues.latitude',
                'venues.longitude',
                'venues.city_id',
                'venues.category_id',
            )->with(['city:id,name', 'category:id,name,slug']),
        ])->limit(450)->get();

        $grouped = $events->groupBy('venue_id');
        $maxCount = (int) $grouped->map(fn ($g) => $g->count())->max();
        if ($maxCount < 1) {
            $maxCount = 1;
        }

        $spots = [];
        foreach ($grouped as $venueId => $venueEvents) {
            /** @var Collection<int, Event> $venueEvents */
            $first = $venueEvents->first();
            $venue = $first?->venue;
            if ($venue === null || $venue->latitude === null || $venue->longitude === null) {
                continue;
            }
            $count = $venueEvents->count();
            $todayCount = $venueEvents->filter(fn (Event $e) => LiveTonightEventQuery::eventOverlapsLocalToday($e))->count();
            $intensity = round(min(1, $count / $maxCount), 4);

            $sorted = $venueEvents->sortBy(fn (Event $e) => $e->start_date?->timestamp ?? 0)->values();
            $todayFirst = $sorted->filter(fn (Event $e) => LiveTonightEventQuery::eventOverlapsLocalToday($e))->values();
            $rest = $sorted->reject(fn (Event $e) => LiveTonightEventQuery::eventOverlapsLocalToday($e))->values();
            $eventPayloads = $todayFirst
                ->concat($rest)
                ->take(8)
                ->map(fn (Event $e) => self::eventToSpotItem($e))
                ->values()
                ->all();

            $spots[] = [
                'venue_id' => (int) $venueId,
                'name' => $venue->name,
                'slug' => $venue->slug,
                'lat' => (float) $venue->latitude,
                'lng' => (float) $venue->longitude,
                'address' => $venue->address !== null && trim((string) $venue->address) !== ''
                    ? (string) $venue->address
                    : null,
                'city_name' => $venue->city?->name,
                'category_name' => $venue->category?->name,
                'event_count' => $count,
                'today_event_count' => $todayCount,
                'intensity' => $intensity,
                'events' => $eventPayloads,
            ];
        }

        usort($spots, function (array $a, array $b) {
            $ta = (int) ($a['today_event_count'] ?? 0);
            $tb = (int) ($b['today_event_count'] ?? 0);
            if ($ta !== $tb) {
                return $tb <=> $ta;
            }

            return $b['event_count'] <=> $a['event_count'];
        });

        $popular = array_slice($spots, 0, 14);

        return response()->json([
            'generated_at' => now()->toIso8601String(),
            'vibe' => $vibe === '' ? null : $vibe,
            'spots' => $spots,
            'popular' => $popular,
            'stats' => [
                'venue_count' => count($spots),
                'event_count' => $events->count(),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private static function eventToSpotItem(Event $event): array
    {
        $start = $event->start_date;
        $end = $event->end_date;

        return [
            'id' => $event->id,
            'title' => $event->title,
            'slug' => $event->slug,
            'event_type' => $event->event_type,
            'start_date' => $start instanceof Carbon ? $start->toIso8601String() : null,
            'end_date' => $end instanceof Carbon ? $end->toIso8601String() : null,
            'segment' => $event->publicUrlSegment(),
            'overlaps_today' => LiveTonightEventQuery::eventOverlapsLocalToday($event),
        ];
    }
}
