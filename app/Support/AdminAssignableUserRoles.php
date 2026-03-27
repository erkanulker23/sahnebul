<?php

namespace App\Support;

use App\Models\User;

/**
 * Admin panelinden atanabilen roller — ayrıcalık yükseltmesini önlemek için merkezi kurallar.
 */
final class AdminAssignableUserRoles
{
    /**
     * @return list<string>
     */
    public static function forActor(User $actor): array
    {
        if ($actor->isSuperAdmin()) {
            return ['customer', 'artist', 'venue_owner', 'manager_organization', 'admin', 'super_admin'];
        }

        return ['customer', 'artist', 'venue_owner', 'manager_organization'];
    }

    public static function canManageAdminOrSuperAdminAccounts(User $actor): bool
    {
        return $actor->isSuperAdmin();
    }
}
