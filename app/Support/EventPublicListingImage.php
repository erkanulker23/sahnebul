<?php

namespace App\Support;

/**
 * Etkinlik liste / arama görselleri: Instagram vb. OG “logo” URL’leri gerçek afiş değildir.
 */
final class EventPublicListingImage
{
    /** @var list<string> */
    private const REMOTE_THUMB_JUNK_SUFFIXES = [
        'instagram.com',
        'cdninstagram.com',
        'facebook.com',
        'fbcdn.net',
    ];

    public static function isRemoteSocialOgJunk(string $url): bool
    {
        $u = trim($url);
        if ($u === '' || (! str_starts_with($u, 'http://') && ! str_starts_with($u, 'https://'))) {
            return false;
        }

        $host = strtolower((string) parse_url($u, PHP_URL_HOST));
        if ($host === '') {
            return false;
        }

        foreach (self::REMOTE_THUMB_JUNK_SUFFIXES as $suffix) {
            if ($host === $suffix || str_ends_with($host, '.'.$suffix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return non-empty-string|null
     */
    public static function pickListingThumb(?string $listingImage, ?string $coverImage): ?string
    {
        foreach ([$listingImage, $coverImage] as $raw) {
            if (! is_string($raw)) {
                continue;
            }
            $t = trim($raw);
            if ($t === '') {
                continue;
            }
            if (self::isRemoteSocialOgJunk($t)) {
                continue;
            }

            return $t;
        }

        return null;
    }
}
