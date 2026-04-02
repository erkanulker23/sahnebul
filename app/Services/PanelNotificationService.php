<?php

namespace App\Services;

use App\Models\Artist;
use App\Models\ArtistEventProposal;
use App\Models\ArtistManagerAvailabilityRequest;
use App\Models\Event;
use App\Models\EventArtistReport;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Support\Facades\Schema;

/**
 * Müşteri ve sahne panelleri için bekleyen işlem özeti (admin bildirim rozetine benzer).
 */
final class PanelNotificationService
{
    /**
     * @return array{total: int, items: list<array{key: string, label: string, count: int, href: string}>}
     */
    public function forUser(User $user): array
    {
        if ($user->isAdmin()) {
            return ['total' => 0, 'items' => []];
        }

        $items = [];

        $pendingCustomerRes = Reservation::query()
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->count();
        if ($pendingCustomerRes > 0) {
            $items[] = [
                'key' => 'customer_pending_reservations',
                'label' => 'Onay bekleyen rezervasyonunuz',
                'count' => $pendingCustomerRes,
                'href' => route('reservations.index', absolute: false),
            ];
        }

        $unread = $user->unreadNotifications()->count();
        if ($unread > 0) {
            $items[] = [
                'key' => 'unread_notifications',
                'label' => 'Okunmamış bildirim',
                'count' => $unread,
                'href' => route('notifications.index', absolute: false),
            ];
        }

        if (! $user->canAccessStagePanel()) {
            return $this->pack($items);
        }

        $venueIds = $user->venues()->pluck('id');
        if ($venueIds->isNotEmpty()) {
            $venuePending = Reservation::query()
                ->whereIn('venue_id', $venueIds)
                ->where('status', 'pending')
                ->count();
            if ($venuePending > 0) {
                $items[] = [
                    'key' => 'venue_pending_reservations',
                    'label' => 'Mekânınızda bekleyen rezervasyon',
                    'count' => $venuePending,
                    'href' => route('artist.reservations.index', absolute: false),
                ];
            }
        }

        $pendingVenueRows = Venue::query()
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->count();
        if ($pendingVenueRows > 0) {
            $items[] = [
                'key' => 'pending_venue_approval',
                'label' => 'Onay bekleyen mekân kaydı',
                'count' => $pendingVenueRows,
                'href' => route('artist.venues.index', absolute: false),
            ];
        }

        if ($venueIds->isNotEmpty()) {
            $draftEvents = Event::query()
                ->whereIn('venue_id', $venueIds)
                ->where('status', 'draft')
                ->count();
            if ($draftEvents > 0) {
                $items[] = [
                    'key' => 'draft_events_venues',
                    'label' => 'Taslak etkinlik (mekânınızda)',
                    'count' => $draftEvents,
                    'href' => route('artist.events.index', ['filter' => 'draft'], absolute: false),
                ];
            }
        }

        $artistIds = Artist::query()->where('user_id', $user->id)->pluck('id');
        if ($artistIds->isNotEmpty() && Schema::hasTable('artist_manager_availability_requests')) {
            $incomingAv = ArtistManagerAvailabilityRequest::query()
                ->whereIn('artist_id', $artistIds)
                ->where('status', 'pending')
                ->count();
            if ($incomingAv > 0) {
                $items[] = [
                    'key' => 'incoming_availability_requests',
                    'label' => 'Müsaitlik talebi (yanıt bekleniyor)',
                    'count' => $incomingAv,
                    'href' => route('artist.availability.index', absolute: false),
                ];
            }
        }

        if ($artistIds->isNotEmpty() && Schema::hasTable('event_artist_reports')) {
            $pendingReports = EventArtistReport::query()
                ->whereIn('artist_id', $artistIds)
                ->where('status', EventArtistReport::STATUS_PENDING)
                ->count();
            if ($pendingReports > 0) {
                $items[] = [
                    'key' => 'pending_lineup_reports',
                    'label' => 'Kadro raporu (yönetim inceliyor)',
                    'count' => $pendingReports,
                    'href' => route('artist.events.index', absolute: false),
                ];
            }
        }

        if (Schema::hasTable('artist_event_proposals')) {
            $pendingProposals = ArtistEventProposal::query()
                ->where('user_id', $user->id)
                ->where('status', ArtistEventProposal::STATUS_PENDING)
                ->count();
            if ($pendingProposals > 0) {
                $items[] = [
                    'key' => 'pending_event_proposals',
                    'label' => 'Bekleyen etkinlik / mekân önerisi',
                    'count' => $pendingProposals,
                    'href' => route('artist.events.index', absolute: false),
                ];
            }
        }

        if ($user->isManagementAccount()) {
            $pendingRoster = Artist::query()
                ->where('managed_by_user_id', $user->id)
                ->where('status', 'pending')
                ->count();
            if ($pendingRoster > 0) {
                $items[] = [
                    'key' => 'org_pending_roster_artists',
                    'label' => 'Kadronuzda onay bekleyen sanatçı',
                    'count' => $pendingRoster,
                    'href' => route('artist.management.artists.index', absolute: false),
                ];
            }

            if (Schema::hasTable('artist_manager_availability_requests')) {
                $orgWaitingAv = ArtistManagerAvailabilityRequest::query()
                    ->where('manager_user_id', $user->id)
                    ->where('status', 'pending')
                    ->count();
                if ($orgWaitingAv > 0) {
                    $items[] = [
                        'key' => 'org_pending_availability_replies',
                        'label' => 'Müsaitlik talebiniz (sanatçı yanıtı bekleniyor)',
                        'count' => $orgWaitingAv,
                        'href' => route('artist.management.availability.index', absolute: false),
                    ];
                }
            }
        }

        return $this->pack($items);
    }

    /**
     * @param  list<array{key: string, label: string, count: int, href: string}>  $items
     * @return array{total: int, items: list<array{key: string, label: string, count: int, href: string}>}
     */
    private function pack(array $items): array
    {
        $total = 0;
        foreach ($items as $row) {
            $total += $row['count'];
        }

        return [
            'total' => $total,
            'items' => $items,
        ];
    }
}
