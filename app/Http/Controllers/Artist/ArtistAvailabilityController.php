<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\ArtistAvailabilityDay;
use App\Models\ArtistManagerAvailabilityRequest;
use App\Services\SahnebulMail;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ArtistAvailabilityController extends Controller
{
    private function ownedArtist(Request $request): ?Artist
    {
        return Artist::query()->where('user_id', $request->user()->id)->first();
    }

    public function index(Request $request): Response|RedirectResponse
    {
        $artist = $this->ownedArtist($request);
        if ($artist === null) {
            return redirect()->route('artist.dashboard')
                ->with('error', 'Müsaitlik takvimi için hesabınıza bağlı bir sanatçı profili gerekir.');
        }

        $days = $artist->availabilityDays()
            ->where('date', '>=', now()->startOfDay())
            ->orderBy('date')
            ->limit(500)
            ->get();

        $incomingRequests = ArtistManagerAvailabilityRequest::query()
            ->where('artist_id', $artist->id)
            ->with(['managerUser:id,name,email,organization_display_name'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return Inertia::render('Artist/Availability/Index', [
            'artist' => [
                'id' => $artist->id,
                'name' => $artist->name,
                'availability_visible_to_managers' => (bool) $artist->availability_visible_to_managers,
            ],
            'days' => $days,
            'incomingRequests' => $incomingRequests,
        ]);
    }

    public function storeDay(Request $request)
    {
        $artist = $this->ownedArtist($request);
        if ($artist === null) {
            abort(403);
        }

        $validated = $request->validate([
            'date' => ['required', 'date', 'after_or_equal:today'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        ArtistAvailabilityDay::query()->updateOrCreate(
            [
                'artist_id' => $artist->id,
                'date' => $validated['date'],
            ],
            [
                'note' => $validated['note'] ?? null,
            ]
        );

        return back()->with('success', 'Müsait gün kaydedildi.');
    }

    /**
     * İki tarih arasındaki her gün için müsaitlik kaydı (üst sınır 366 gün).
     */
    public function storeDaysRange(Request $request)
    {
        $artist = $this->ownedArtist($request);
        if ($artist === null) {
            abort(403);
        }

        $validated = $request->validate([
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $start = Carbon::parse($validated['start_date'])->startOfDay();
        $end = Carbon::parse($validated['end_date'])->startOfDay();
        if ($start->diffInDays($end) > 365) {
            return back()->with('error', 'En fazla 366 günlük aralık seçebilirsiniz.');
        }

        $note = $validated['note'] ?? null;
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $dateStr = $cursor->toDateString();
            ArtistAvailabilityDay::query()->updateOrCreate(
                [
                    'artist_id' => $artist->id,
                    'date' => $dateStr,
                ],
                ['note' => $note],
            );
            $cursor->addDay();
        }

        return back()->with('success', 'Seçilen aralıktaki günler müsait olarak kaydedildi.');
    }

    public function destroyDay(Request $request, ArtistAvailabilityDay $day)
    {
        $artist = $this->ownedArtist($request);
        if ($artist === null || $day->artist_id !== $artist->id) {
            abort(403);
        }

        $day->delete();

        return back()->with('success', 'Gün kaldırıldı.');
    }

    public function updateVisibility(Request $request)
    {
        $artist = $this->ownedArtist($request);
        if ($artist === null) {
            abort(403);
        }

        $validated = $request->validate([
            'availability_visible_to_managers' => ['required', 'boolean'],
        ]);

        $artist->update([
            'availability_visible_to_managers' => $validated['availability_visible_to_managers'],
        ]);

        return back()->with('success', 'Görünürlük ayarı güncellendi.');
    }

    public function updateIncomingRequest(Request $request, ArtistManagerAvailabilityRequest $availabilityRequest)
    {
        $artist = $this->ownedArtist($request);
        if ($artist === null || $availabilityRequest->artist_id !== $artist->id) {
            abort(403);
        }

        if ($availabilityRequest->status !== 'pending') {
            return back()->with('error', 'Yalnızca bekleyen talepler yanıtlanabilir.');
        }

        $validated = $request->validate([
            'status' => ['required', 'in:accepted,declined'],
        ]);

        $availabilityRequest->update(['status' => $validated['status']]);

        SahnebulMail::artistAvailabilityResponseToManager(
            $availabilityRequest->fresh(['artist', 'managerUser', 'availabilityDay']),
            $validated['status'],
        );

        return back()->with('success', $validated['status'] === 'accepted' ? 'Talep onaylandı.' : 'Talep reddedildi.');
    }
}
