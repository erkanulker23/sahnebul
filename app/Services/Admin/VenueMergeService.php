<?php

namespace App\Services\Admin;

use App\Models\Event;
use App\Models\Reservation;
use App\Models\Review;
use App\Models\Venue;
use App\Models\VenueClaimRequest;
use App\Models\VenueMedia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class VenueMergeService
{
    /**
     * $keepVenueId üzerinde kalır; $mergeVenueId ilişkileri oraya taşınır ve silinir.
     */
    public function merge(int $keepVenueId, int $mergeVenueId): void
    {
        if ($keepVenueId === $mergeVenueId) {
            throw new \InvalidArgumentException('Aynı mekan birleştirilemez.');
        }

        DB::transaction(function () use ($keepVenueId, $mergeVenueId): void {
            $primary = Venue::query()->lockForUpdate()->findOrFail($keepVenueId);
            $duplicate = Venue::query()->lockForUpdate()->findOrFail($mergeVenueId);

            $this->reassignEvents($primary->id, $duplicate->id);
            $this->reassignVenueMedia($primary->id, $duplicate->id);
            $this->reassignReviews($primary->id, $duplicate->id);
            Reservation::query()->where('venue_id', $duplicate->id)->update(['venue_id' => $primary->id]);
            $this->reassignVenueFollowers($primary->id, $duplicate->id);
            if (Schema::hasTable('venue_claim_requests')) {
                $this->reassignVenueClaimRequests($primary->id, $duplicate->id);
            }

            if (Schema::hasTable('favorites')) {
                $this->reassignFavorites($primary->id, $duplicate->id);
            }

            $primary->update([
                'view_count' => (int) $primary->view_count + (int) $duplicate->view_count,
            ]);

            $this->refreshVenueReviewAggregates($primary->fresh());

            $this->deleteVenueWithStoredAssets($duplicate->fresh());
        });
    }

    /** performVenueDelete ile aynı: ilişkiler taşındıktan sonra kalan mekan kaydını ve dosyalarını kaldırır. */
    private function deleteVenueWithStoredAssets(Venue $venue): void
    {
        $venue->loadMissing('events');
        foreach ($venue->events as $event) {
            if ($event->cover_image && ! Str::startsWith($event->cover_image, ['http://', 'https://'])) {
                Storage::disk('public')->delete($event->cover_image);
            }
        }

        $venue->loadMissing('media');
        foreach ($venue->media as $m) {
            if ($m->path) {
                Storage::disk('public')->delete($m->path);
            }
            if ($m->thumbnail) {
                Storage::disk('public')->delete($m->thumbnail);
            }
        }
        if ($venue->cover_image && ! Str::startsWith($venue->cover_image, ['http://', 'https://'])) {
            Storage::disk('public')->delete($venue->cover_image);
        }
        $venue->delete();
    }

    private function reassignEvents(int $primaryId, int $duplicateId): void
    {
        $events = Event::query()->where('venue_id', $duplicateId)->get();
        foreach ($events as $event) {
            $slug = $event->slug;
            while (Event::query()->where('venue_id', $primaryId)->where('slug', $slug)->exists()) {
                $slug = Str::slug($event->title).'-'.Str::lower(Str::random(4));
            }
            $event->update([
                'venue_id' => $primaryId,
                'slug' => $slug,
            ]);
        }
    }

    private function reassignVenueMedia(int $primaryId, int $duplicateId): void
    {
        $maxOrder = (int) VenueMedia::query()->where('venue_id', $primaryId)->max('order');
        $medias = VenueMedia::query()->where('venue_id', $duplicateId)->orderBy('id')->get();
        foreach ($medias as $media) {
            $maxOrder++;
            $media->update([
                'venue_id' => $primaryId,
                'order' => $maxOrder,
            ]);
        }
    }

    private function reassignReviews(int $primaryId, int $duplicateId): void
    {
        $primaryUserIds = Review::query()->where('venue_id', $primaryId)->pluck('user_id');
        Review::query()
            ->where('venue_id', $duplicateId)
            ->whereIn('user_id', $primaryUserIds)
            ->delete();
        Review::query()->where('venue_id', $duplicateId)->update(['venue_id' => $primaryId]);
    }

    private function reassignVenueFollowers(int $primaryId, int $duplicateId): void
    {
        if (! Schema::hasTable('venue_followers')) {
            return;
        }

        $primaryUserIds = DB::table('venue_followers')->where('venue_id', $primaryId)->pluck('user_id');
        DB::table('venue_followers')
            ->where('venue_id', $duplicateId)
            ->whereIn('user_id', $primaryUserIds)
            ->delete();
        DB::table('venue_followers')
            ->where('venue_id', $duplicateId)
            ->update(['venue_id' => $primaryId]);
    }

    private function reassignVenueClaimRequests(int $primaryId, int $duplicateId): void
    {
        $primaryUserIds = VenueClaimRequest::query()->where('venue_id', $primaryId)->pluck('user_id');
        VenueClaimRequest::query()
            ->where('venue_id', $duplicateId)
            ->whereIn('user_id', $primaryUserIds)
            ->delete();
        VenueClaimRequest::query()->where('venue_id', $duplicateId)->update(['venue_id' => $primaryId]);
    }

    private function reassignFavorites(int $primaryId, int $duplicateId): void
    {
        $primaryUserIds = DB::table('favorites')->where('venue_id', $primaryId)->pluck('user_id');
        DB::table('favorites')
            ->where('venue_id', $duplicateId)
            ->whereIn('user_id', $primaryUserIds)
            ->delete();
        DB::table('favorites')
            ->where('venue_id', $duplicateId)
            ->update(['venue_id' => $primaryId]);
    }

    private function refreshVenueReviewAggregates(Venue $venue): void
    {
        $approved = $venue->reviews()->where('is_approved', true);
        $venue->update([
            'review_count' => $approved->count(),
            'rating_avg' => (int) round($approved->avg('rating') ?? 0),
        ]);
    }
}
