<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\Event;
use App\Models\User;
use App\Support\DailyUniqueEntityView;
use App\Support\ManagementPageSeo;
use App\Support\PublicStructuredData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class ManagementDirectoryController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));

        $managementAccounts = User::query()
            ->publicManagementDirectory()
            ->withCount(['managedArtists as roster_count' => fn ($q) => $q->where('status', 'approved')])
            ->when($search !== '', function ($q) use ($search): void {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(function ($q2) use ($like): void {
                    $q2->where('organization_display_name', 'like', $like)
                        ->orWhere('name', 'like', $like);
                });
            })
            ->orderByRaw('COALESCE(NULLIF(TRIM(organization_display_name), ""), name)')
            ->paginate(24)
            ->withQueryString();

        $appUrl = rtrim((string) config('app.url'), '/');

        return Inertia::render('Management/Index', [
            'managementAccounts' => $managementAccounts,
            'filters' => ['search' => $search],
            'listingStructuredData' => PublicStructuredData::managementDirectoryIndexItemList($managementAccounts, $appUrl),
        ]);
    }

    public function show(Request $request, string $slug): Response
    {
        $org = User::query()
            ->where('role', 'manager_organization')
            ->where('organization_public_slug', $slug)
            ->where('organization_profile_published', true)
            ->where('is_active', true)
            ->firstOrFail();

        if (Schema::hasColumn('users', 'organization_profile_view_count')) {
            DailyUniqueEntityView::recordOncePerVisitorPerDay(
                $request,
                'organization_profile',
                (int) $org->id,
                fn () => User::query()->whereKey($org->id)->increment('organization_profile_view_count')
            );
            $org->refresh();
        }

        $managedIds = Artist::query()
            ->where('managed_by_user_id', $org->id)
            ->where('status', 'approved')
            ->pluck('id');

        $eventsBase = Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->listedPublicly())
            ->with([
                'venue:id,name,slug,city_id',
                'venue.city:id,name',
                'artists:id,name,slug,avatar',
            ])
            ->where(function ($q) use ($org, $managedIds): void {
                $q->where('created_by_user_id', $org->id);
                if ($managedIds->isNotEmpty()) {
                    $q->orWhereHas('artists', fn ($a) => $a->whereIn('artists.id', $managedIds));
                }
            })
            ->where('start_date', '>=', now()->subMonths(24));

        $upcomingEvents = (clone $eventsBase)
            ->where('start_date', '>=', now())
            ->orderBy('start_date')
            ->limit(80)
            ->get();

        $pastEvents = (clone $eventsBase)
            ->where('start_date', '<', now())
            ->orderByDesc('start_date')
            ->limit(24)
            ->get();

        $roster = Artist::query()
            ->where('managed_by_user_id', $org->id)
            ->where('status', 'approved')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'avatar', 'genre']);

        $appUrl = rtrim((string) config('app.url'), '/');
        $pageSeo = ManagementPageSeo::forPublicManagementAccount($org, $roster, $upcomingEvents, $appUrl);

        $mapEvent = function (Event $e): array {
            return [
                'id' => $e->id,
                'slug' => $e->publicUrlSegment(),
                'title' => $e->title,
                'start_date' => $e->start_date?->toIso8601String() ?? '',
                'end_date' => $e->end_date?->toIso8601String(),
                'cover_image' => $e->cover_image,
                'listing_image' => $e->listing_image,
                'status' => $e->status,
                'is_full' => (bool) $e->is_full,
                'ticket_acquisition_mode' => $e->ticket_acquisition_mode,
                'sahnebul_reservation_enabled' => (bool) $e->sahnebul_reservation_enabled,
                'venue' => $e->venue !== null ? [
                    'name' => $e->venue->name,
                    'slug' => $e->venue->slug,
                    'city' => $e->venue->relationLoaded('city') && $e->venue->city !== null
                        ? ['name' => $e->venue->city->name]
                        : null,
                ] : null,
                'artists' => $e->relationLoaded('artists')
                    ? $e->artists->map(fn (Artist $a) => [
                        'id' => $a->id,
                        'name' => $a->name,
                        'slug' => $a->slug,
                        'avatar' => $a->avatar,
                    ])->all()
                    : [],
            ];
        };

        return Inertia::render('Management/Show', [
            'managementProfile' => [
                'display_name' => $org->publicManagementDisplayName(),
                'slug' => $org->organization_public_slug,
                'about' => $org->organization_about,
                'cover_image' => $org->organization_cover_image,
                'website' => $org->organization_website,
                'social_links' => is_array($org->organization_social_links) ? $org->organization_social_links : [],
                'avatar' => $org->avatar,
                'view_count' => (int) ($org->organization_profile_view_count ?? 0),
            ],
            'managementPageSeo' => $pageSeo,
            'roster' => $roster,
            'upcomingEvents' => $upcomingEvents->map($mapEvent)->values()->all(),
            'pastEvents' => $pastEvents->map($mapEvent)->values()->all(),
            'stats' => [
                'roster_count' => $roster->count(),
                'upcoming_events_count' => $upcomingEvents->count(),
            ],
        ]);
    }
}
