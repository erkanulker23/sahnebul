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
     * Galeri veya tanıtım dosyası değişince (yükleyen admin değilse) her iki profil onayı sıfırlanır.
     */
    public static function syncAfterPromoMutation(Request $request, Event $event): void
    {
        $fromAdmin = str_starts_with($request->route()?->getName() ?? '', 'admin.');
        self::syncAfterPromoMutationFromAdminFlag($event->fresh(), $fromAdmin);
    }

    public static function syncAfterPromoMutationFromAdminFlag(Event $event, bool $fromAdmin): void
    {
        $status = $fromAdmin ? self::APPROVED : self::PENDING_REVIEW;
        $fill = [];
        if (Schema::hasColumn('events', 'promo_venue_profile_moderation')) {
            $fill['promo_venue_profile_moderation'] = $status;
        }
        if (Schema::hasColumn('events', 'promo_artist_profile_moderation')) {
            $fill['promo_artist_profile_moderation'] = $status;
        }
        if ($fill !== []) {
            $event->forceFill($fill)->saveQuietly();
        }
    }

    /** Mekân sahibi panelinden yalnızca mekân tik’leri kaydedildiğinde. */
    public static function syncVenueTogglesNonAdmin(Event $event): void
    {
        if (! Schema::hasColumn('events', 'promo_venue_profile_moderation')) {
            return;
        }
        $event->forceFill([
            'promo_venue_profile_moderation' => self::PENDING_REVIEW,
        ])->saveQuietly();
    }

    /** Sanatçı (kadro) panelinden yalnızca sanatçı tik’leri kaydedildiğinde. */
    public static function syncArtistTogglesNonAdmin(Event $event): void
    {
        if (! Schema::hasColumn('events', 'promo_artist_profile_moderation')) {
            return;
        }
        $event->forceFill([
            'promo_artist_profile_moderation' => self::PENDING_REVIEW,
        ])->saveQuietly();
    }
}
