<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\Event;
use App\Models\Venue;
use App\Support\EventPublicListingImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class SearchController extends Controller
{
    /**
     * Üst arama kutusu: yaklaşan etkinlikler arasından görüntülenmeye göre öne çıkanlar.
     */
    public function trending(Request $request): JsonResponse
    {
        if (! Schema::hasTable('events')) {
            return response()->json(['events' => []]);
        }

        $limit = min(15, max(4, (int) $request->query('limit', 10)));

        $query = Event::query()
            ->published()
            ->whereHas('venue', fn ($v) => $v->listedPublicly())
            ->whereNotNull('start_date')
            ->whereStillVisibleOnPublicListing()
            ->with(['venue:id,name'])
            ->orderByDesc('view_count')
            ->orderBy('start_date');

        $events = $query
            ->limit($limit)
            ->get(['id', 'slug', 'title', 'start_date', 'end_date', 'listing_image', 'cover_image', 'venue_id', 'view_count']);

        return response()->json([
            'events' => $events->map(fn (Event $e) => [
                'id' => $e->id,
                'slug' => $e->slug,
                'title' => $e->title,
                'start_date' => $e->start_date?->toIso8601String(),
                'end_date' => $e->end_date?->toIso8601String(),
                'venue_name' => $e->venue?->name,
                'image' => EventPublicListingImage::pickListingThumb($e->listing_image, $e->cover_image),
            ]),
        ]);
    }

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
            ->get(['id', 'name', 'slug', 'avatar', 'genre', 'created_at', 'status']);

        $venues = Venue::query()
            ->listedPublicly()
            ->where('name', 'like', $like)
            ->orderBy('name')
            ->limit(8)
            ->get(['id', 'name', 'slug', 'cover_image', 'created_at', 'status', 'is_active']);

        $events = Event::query()
            ->published()
            ->whereHas('venue', fn ($v) => $v->listedPublicly())
            ->whereNotNull('start_date')
            ->whereStillVisibleOnPublicListing()
            ->where('title', 'like', $like)
            ->with(['venue:id,name,slug'])
            ->orderBy('start_date')
            ->limit(8)
            ->get(['id', 'slug', 'title', 'start_date', 'end_date', 'venue_id', 'listing_image', 'cover_image']);

        return response()->json([
            'artists' => $artists,
            'venues' => $venues,
            'events' => $events->map(fn (Event $e) => [
                'id' => $e->id,
                'slug' => $e->slug,
                'title' => $e->title,
                'start_date' => $e->start_date,
                'end_date' => $e->end_date?->toIso8601String(),
                'venue_name' => $e->venue?->name,
                'image' => EventPublicListingImage::pickListingThumb($e->listing_image, $e->cover_image),
            ]),
        ]);
    }
}
