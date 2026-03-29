<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\SahnebulMail;
use Illuminate\Auth\Events\Registered;

/**
 * Sanatçı, mekân sahibi veya organizasyon hesabı self-servis kayıt olduğunda yöneticilere e-posta.
 */
final class NotifyAdminsOfNewStageUserRegistration
{
    public function handle(Registered $event): void
    {
        $user = $event->user;
        if (! $user instanceof User) {
            return;
        }

        if (! in_array($user->role, ['artist', 'venue_owner', 'manager_organization'], true)) {
            return;
        }

        SahnebulMail::newStageUserRegistered($user);
    }
}
