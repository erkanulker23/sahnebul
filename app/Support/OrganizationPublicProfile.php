<?php

namespace App\Support;

use Illuminate\Validation\Rule;

final class OrganizationPublicProfile
{
    /**
     * @return list<string>
     */
    public static function reservedSlugs(): array
    {
        return [
            'organizasyonlar', 'mekanlar', 'etkinlikler', 'sanatcilar', 'blog', 'iletisim',
            'admin', 'sahne', 'giris', 'kayit', 'api', 'kesfet', 'sayfalar', 'sehir-sec',
            'search', 'hesabim', 'panel', 'login', 'register', 'logout', 'public', 'storage',
            'build', 'live-scene',
        ];
    }

    /**
     * @return array<int, \Illuminate\Contracts\Validation\Rule|string>
     */
    public static function slugValidationRules(?int $ignoreUserId): array
    {
        $unique = Rule::unique('users', 'organization_public_slug');
        if ($ignoreUserId !== null) {
            $unique = $unique->ignore($ignoreUserId);
        }

        return [
            'nullable',
            'string',
            'max:120',
            'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
            Rule::notIn(self::reservedSlugs()),
            $unique,
        ];
    }
}
