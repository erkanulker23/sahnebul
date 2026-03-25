<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Validation\ValidationException;

final class PortalAccess
{
    /**
     * @param  'kullanici'|'sanatci'|'mekan'|'yonetim'  $portal
     */
    public static function ensure(User $user, string $portal): void
    {
        $ok = match ($portal) {
            'yonetim' => $user->isAdmin(),
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
     * Mekan paneli: sanatçı hesapları /yonetim veya /giris/sanatci kullanır; burası yalnızca
     * mekan üyeliği veya (onaylı) mekanı olan standart kullanıcılar içindir.
     */
    private static function canAccessVenuePortal(User $user): bool
    {
        if ($user->isAdmin() || $user->isArtist()) {
            return false;
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
            'yonetim' => 'Bu giriş yalnızca yönetici hesapları içindir.',
            'sanatci' => 'Bu giriş yalnızca sanatçı hesapları içindir.',
            'mekan' => 'Bu giriş mekan üyeliği veya size bağlı mekan kaydı olan hesaplar içindir.',
            'kullanici' => 'Bu giriş yalnızca standart kullanıcı hesapları içindir. Sanatçı veya yönetici hesabınız varsa ilgili giriş sayfasını kullanın.',
            default => 'Bu hesap bu giriş kapısı için uygun değil.',
        };
    }
}
