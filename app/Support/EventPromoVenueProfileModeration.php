<?php

namespace App\Support;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

final class EventPromoVenueProfileModeration
{
    public const APPROVED = 'approved';

    public const PENDING_REVIEW = 'pending_review';

    /**
     * Admin rotaları: anında onaylı; sanatçı / mekân / organizasyon paneli: mekân profili için onay bekler.
     */
    public static function syncAfterPromoMutation(Request $request, Event $event): void
    {
        if (! Schema::hasColumn('events', 'promo_venue_profile_moderation')) {
            return;
        }

        $route = $request->route()?->getName() ?? '';
        $fromAdmin = str_starts_with($route, 'admin.');

        $event->forceFill([
            'promo_venue_profile_moderation' => $fromAdmin ? self::APPROVED : self::PENDING_REVIEW,
        ])->saveQuietly();
    }

    public static function syncAfterPromoMutationFromAdminFlag(Event $event, bool $fromAdmin): void
    {
        if (! Schema::hasColumn('events', 'promo_venue_profile_moderation')) {
            return;
        }

        $event->forceFill([
            'promo_venue_profile_moderation' => $fromAdmin ? self::APPROVED : self::PENDING_REVIEW,
        ])->saveQuietly();
    }
}
