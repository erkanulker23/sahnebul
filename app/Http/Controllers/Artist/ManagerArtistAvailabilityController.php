<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\ArtistAvailabilityDay;
use App\Models\ArtistManagerAvailabilityRequest;
use App\Services\SahnebulMail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ManagerArtistAvailabilityController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        if (! $request->user()->isManagerOrganization()) {
            abort(403, 'Bu sayfa yalnızca organizasyon firması hesapları içindir.');
        }

        $search = trim((string) $request->input('search', ''));

        $query = Artist::query()
            ->approved()
            ->where('availability_visible_to_managers', true)
            ->whereHas('availabilityDays', fn ($q) => $q->where('date', '>=', now()->startOfDay()))
            ->withCount([
                'availabilityDays as upcoming_slots_count' => fn ($q) => $q->where('date', '>=', now()->startOfDay()),
            ])
            ->orderBy('name');

        if ($search !== '') {
            $escaped = addcslashes($search, '%_\\');
            $query->where('name', 'like', '%'.$escaped.'%');
        }

        $artists = $query->paginate(20)->withQueryString();

        return Inertia::render('Artist/ManagerAvailability/Index', [
            'artists' => $artists,
            'filters' => ['search' => $search],
        ]);
    }

    public function show(Request $request, Artist $artist): Response
    {
        if (! $request->user()->isManagerOrganization()) {
            abort(403);
        }

        if ($artist->status !== 'approved' || ! $artist->availability_visible_to_managers) {
            abort(404);
        }

        $days = $artist->availabilityDays()
            ->where('date', '>=', now()->startOfDay())
            ->orderBy('date')
            ->get();

        $myRequests = ArtistManagerAvailabilityRequest::query()
            ->where('manager_user_id', $request->user()->id)
            ->where('artist_id', $artist->id)
            ->with(['availabilityDay'])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        $myRequestsPayload = $myRequests->map(static function (ArtistManagerAvailabilityRequest $r): array {
            $day = $r->availabilityDay;

            return [
                'id' => $r->id,
                'message' => $r->message,
                'status' => $r->status,
                'requested_date' => $r->requested_date->format('Y-m-d'),
                'created_at' => $r->created_at?->toIso8601String(),
                'availability_day' => $day !== null
                    ? [
                        'id' => $day->id,
                        'date' => $day->date->format('Y-m-d'),
                        'note' => $day->note,
                    ]
                    : null,
            ];
        })->values()->all();

        return Inertia::render('Artist/ManagerAvailability/Show', [
            'artist' => [
                'id' => $artist->id,
                'name' => $artist->name,
                'slug' => $artist->slug,
            ],
            'days' => $days,
            'myRequests' => $myRequestsPayload,
        ]);
    }

    public function storeRequest(Request $request, Artist $artist)
    {
        if (! $request->user()->isManagerOrganization()) {
            abort(403);
        }

        if ($artist->status !== 'approved' || ! $artist->availability_visible_to_managers) {
            abort(404);
        }

        $validated = $request->validate([
            'artist_availability_day_id' => ['required', 'integer', 'exists:artist_availability_days,id'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $day = ArtistAvailabilityDay::query()
            ->whereKey((int) $validated['artist_availability_day_id'])
            ->where('artist_id', $artist->id)
            ->where('date', '>=', now()->startOfDay())
            ->firstOrFail();

        $dup = ArtistManagerAvailabilityRequest::query()
            ->where('manager_user_id', $request->user()->id)
            ->where('artist_availability_day_id', $day->id)
            ->where('status', 'pending')
            ->exists();

        if ($dup) {
            return back()->with('error', 'Bu tarih için zaten bekleyen bir talebiniz var.');
        }

        $row = ArtistManagerAvailabilityRequest::create([
            'manager_user_id' => $request->user()->id,
            'artist_id' => $artist->id,
            'artist_availability_day_id' => $day->id,
            'requested_date' => $day->date->format('Y-m-d'),
            'message' => $validated['message'],
            'status' => 'pending',
        ]);

        SahnebulMail::artistAvailabilityRequestToArtist($row->fresh(['artist.user', 'managerUser', 'availabilityDay']));

        return back()->with('success', 'Talep gönderildi. Sanatçı yanıtlayınca burada güncellenecek.');
    }
}
