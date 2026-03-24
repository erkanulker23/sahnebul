<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\Event;
use App\Models\Venue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Global hızlı arama (Inertia dışı JSON — SPA benzeri öneriler).
     */
    public function quick(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json([
                'artists' => [],
                'venues' => [],
                'events' => [],
            ]);
        }

        $like = '%'.$q.'%';

        $artists = Artist::query()
            ->approved()
            ->notIntlImport()
            ->where('name', 'like', $like)
            ->orderBy('name')
            ->limit(8)
            ->get(['id', 'name', 'slug', 'avatar', 'genre']);

        $venues = Venue::query()
            ->approved()
            ->where('name', 'like', $like)
            ->orderBy('name')
            ->limit(8)
            ->get(['id', 'name', 'slug', 'cover_image']);

        $events = Event::query()
            ->published()
            ->whereHas('venue', fn ($v) => $v->approved())
            ->where('title', 'like', $like)
            ->with(['venue:id,name,slug'])
            ->orderBy('start_date')
            ->limit(8)
            ->get(['id', 'slug', 'title', 'start_date', 'venue_id']);

        return response()->json([
            'artists' => $artists,
            'venues' => $venues,
            'events' => $events->map(fn (Event $e) => [
                'id' => $e->id,
                'slug' => $e->slug,
                'title' => $e->title,
                'start_date' => $e->start_date,
                'venue_name' => $e->venue?->name,
            ]),
        ]);
    }
}
