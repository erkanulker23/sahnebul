<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Validation\ValidationException;

final class PortalAccess
{
    /**
     * @param  'kullanici'|'sanatci'|'mekan'|'organizasyon'|'yonetim'  $portal
     */
    public static function ensure(User $user, string $portal): void
    {
        $ok = match ($portal) {
            'yonetim' => $user->isAdmin(),
            'organizasyon' => $user->isManagerOrganization(),
            'sanatci' => $user->isArtist(),
            'mekan' => self::canAccessVenuePortal($user),
            'kullanici' => $user->isCustomer(),
            default => false,
        };

        if (! $ok) {
            throw ValidationException::withMessages([
                'email' => self::messageFor($portal),
            ]);
        }
    }

    /**
     * Mekan girişi (/giris/mekan): sahne panelindeki mekân tarafı.
     *
     * - Mekân üyeliği kaydıyla açılan hesaplar (rol: venue_owner) buradan girer.
     * - Standart kullanıcı (customer) hesabına bağlı mekân satırı veya aktif mekân (Gold) üyeliği varsa buradan girebilir.
     * - Sanatçı ve yönetici bu kapıyı kullanmaz; sanatçı/yönetim girişleri ayrıdır.
     */
    private static function canAccessVenuePortal(User $user): bool
    {
        if ($user->isAdmin() || $user->isArtist()) {
            return false;
        }

        if ($user->isVenueOwner()) {
            return true;
        }

        if (! $user->isCustomer()) {
            return false;
        }

        return $user->hasActiveMembership('venue')
            || $user->venues()->exists();
    }

    private static function messageFor(string $portal): string
    {
        return match ($portal) {
            'yonetim' => 'Bu giriş yalnızca site yönetimi (süper yönetici / admin) hesapları içindir. Organizasyon firması hesabınız varsa «Organizasyon girişi» sayfasını kullanın.',
            'organizasyon' => 'Bu giriş yalnızca organizasyon firması hesapları içindir. Site yönetimi veya sanatçı / mekân paneli için ilgili giriş sayfasını kullanın.',
            'sanatci' => 'Bu giriş yalnızca sanatçı hesapları içindir.',
            'mekan' => 'Bu giriş mekân sahibi hesapları veya hesabınıza kayıtlı mekân / mekân üyeliği olan kullanıcı hesapları içindir. Sanatçı hesabınız varsa «Sanatçı paneli» girişini kullanın.',
            'kullanici' => 'Bu giriş yalnızca standart kullanıcı hesapları içindir. Sanatçı, mekân sahibi veya organizasyon firması hesabınız varsa ilgili giriş sayfasını kullanın.',
            default => 'Bu hesap bu giriş kapısı için uygun değil.',
        };
    }
}
