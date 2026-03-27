<?php

namespace App\Services\Admin;

use App\Models\ArtistEventProposal;
use App\Models\Event;
use App\Models\User;
use App\Models\Venue;
use App\Services\AppSettingsService;
use App\Services\VenueRemoteCoverImporter;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ArtistEventProposalApprovalService
{
    public function __construct(
        private readonly VenueRemoteCoverImporter $remoteCoverImporter,
    ) {}

    public function approve(ArtistEventProposal $proposal, User $admin): void
    {
        if ($proposal->status !== ArtistEventProposal::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'proposal' => 'Bu öneri zaten işlenmiş.',
            ]);
        }

        DB::transaction(function () use ($proposal, $admin): void {
            $vp = $proposal->venue_payload;
            $ep = $proposal->event_payload;

            $galleryUrls = array_values(array_filter(array_map('trim', $vp['google_gallery_photo_urls'] ?? [])));
            $galleryUrls = array_slice($galleryUrls, 0, 5);

            $venueAttrs = [
                'user_id' => (int) $proposal->user_id,
                'name' => (string) $vp['name'],
                'category_id' => (int) $vp['category_id'],
                'city_id' => (int) $vp['city_id'],
                'district_id' => isset($vp['district_id']) && $vp['district_id'] !== '' && $vp['district_id'] !== null
                    ? (int) $vp['district_id'] : null,
                'neighborhood_id' => isset($vp['neighborhood_id']) && $vp['neighborhood_id'] !== '' && $vp['neighborhood_id'] !== null
                    ? (int) $vp['neighborhood_id'] : null,
                'description' => isset($vp['description']) ? (string) $vp['description'] : null,
                'address' => (string) $vp['address'],
                'latitude' => isset($vp['latitude']) && $vp['latitude'] !== '' && $vp['latitude'] !== null
                    ? (float) $vp['latitude'] : null,
                'longitude' => isset($vp['longitude']) && $vp['longitude'] !== '' && $vp['longitude'] !== null
                    ? (float) $vp['longitude'] : null,
                'google_maps_url' => isset($vp['google_maps_url']) && trim((string) $vp['google_maps_url']) !== ''
                    ? trim((string) $vp['google_maps_url']) : null,
                'capacity' => isset($vp['capacity']) && $vp['capacity'] !== '' && $vp['capacity'] !== null
                    ? (int) $vp['capacity'] : null,
                'phone' => isset($vp['phone']) ? (string) $vp['phone'] : null,
                'whatsapp' => isset($vp['whatsapp']) ? (string) $vp['whatsapp'] : null,
                'website' => isset($vp['website']) ? (string) $vp['website'] : null,
                'social_links' => is_array($vp['social_links'] ?? null) ? $vp['social_links'] : [],
                'slug' => Str::slug((string) $vp['name']).'-'.Str::random(4),
                'status' => 'approved',
                'cover_image' => null,
            ];

            $venue = Venue::create($venueAttrs);

            if ($galleryUrls !== []) {
                $this->remoteCoverImporter->importGoogleGalleryToVenue($venue, $galleryUrls, updateVenueCoverFromFirst: true);
            }

            $ticketTiers = is_array($ep['ticket_tiers'] ?? null) ? $ep['ticket_tiers'] : [];
            $eventAttrs = [
                'venue_id' => $venue->id,
                'title' => (string) $ep['title'],
                'description' => isset($ep['description']) ? (string) $ep['description'] : null,
                'event_rules' => isset($ep['event_rules']) ? (string) $ep['event_rules'] : null,
                'entry_is_paid' => (bool) ($ep['entry_is_paid'] ?? true),
                'start_date' => isset($ep['start_date']) ? Carbon::parse((string) $ep['start_date']) : null,
                'end_date' => isset($ep['end_date']) && $ep['end_date'] !== '' && $ep['end_date'] !== null
                    ? Carbon::parse((string) $ep['end_date']) : null,
                'ticket_price' => isset($ep['ticket_price']) && $ep['ticket_price'] !== '' && $ep['ticket_price'] !== null
                    ? (float) $ep['ticket_price'] : null,
                'capacity' => isset($ep['capacity']) && $ep['capacity'] !== '' && $ep['capacity'] !== null
                    ? (int) $ep['capacity'] : null,
                'is_full' => (bool) ($ep['is_full'] ?? false),
                'slug' => Str::slug((string) $ep['title']).'-'.Str::random(4),
                'status' => 'draft',
                'ticket_purchase_note' => isset($ep['ticket_purchase_note']) && trim((string) $ep['ticket_purchase_note']) !== ''
                    ? trim((string) $ep['ticket_purchase_note']) : null,
                'ticket_acquisition_mode' => (string) ($ep['ticket_acquisition_mode'] ?? 'sahnebul'),
                'ticket_outlets' => is_array($ep['ticket_outlets'] ?? null) ? $ep['ticket_outlets'] : [],
            ];

            $eventAttrs = Event::applyTicketAcquisitionToValidatedArray($eventAttrs);

            $event = Event::create($eventAttrs);
            $event->syncTicketTiers($ticketTiers);

            $artistIds = is_array($ep['artist_ids'] ?? null) ? array_map('intval', $ep['artist_ids']) : [];
            $artistIds = array_values(array_unique(array_filter($artistIds, fn (int $id) => $id > 0)));

            $linkedArtistId = $proposal->artist_id;
            if ($linkedArtistId !== null) {
                $artistIds = array_values(array_diff($artistIds, [(int) $linkedArtistId]));
                array_unshift($artistIds, (int) $linkedArtistId);
            }

            $event->syncArtistsByIds($artistIds);

            $proposal->update([
                'status' => ArtistEventProposal::STATUS_APPROVED,
                'reviewed_by_user_id' => $admin->id,
                'reviewed_at' => now(),
                'created_venue_id' => $venue->id,
                'created_event_id' => $event->id,
            ]);
        });

        app(AppSettingsService::class)->forgetCaches();
    }
}
