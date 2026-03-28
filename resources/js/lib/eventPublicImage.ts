/**
 * Instagram / Facebook CDN’den gelen “önizleme” URL’leri çoğu zaman afiş değil (logo vb.).
 * Liste, arama ve kartlarda bunları kullanmayız.
 */
const REMOTE_THUMB_JUNK_SUFFIXES = ['instagram.com', 'cdninstagram.com', 'facebook.com', 'fbcdn.net'] as const;

function hostIsRemoteSocialOgJunk(host: string): boolean {
    const h = host.toLowerCase();
    return REMOTE_THUMB_JUNK_SUFFIXES.some((suffix) => h === suffix || h.endsWith(`.${suffix}`));
}

export function isRemoteSocialOgJunkUrl(url: string): boolean {
    const u = url.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
        return false;
    }
    try {
        return hostIsRemoteSocialOgJunk(new URL(u).hostname);
    } catch {
        return false;
    }
}

/** Ham DB yolu veya tam URL; kullanılamazsa null */
export function pickEventListingThumbPath(
    listingImage?: string | null,
    coverImage?: string | null,
): string | null {
    for (const raw of [listingImage, coverImage]) {
        const t = raw?.trim() ?? '';
        if (t === '') {
            continue;
        }
        if (isRemoteSocialOgJunkUrl(t)) {
            continue;
        }
        return t;
    }
    return null;
}

export function resolveEventListingThumbUrl(
    listingImage?: string | null,
    coverImage?: string | null,
): string | null {
    const p = pickEventListingThumbPath(listingImage, coverImage);
    if (!p) {
        return null;
    }
    return p.startsWith('http://') || p.startsWith('https://') ? p : `/storage/${p}`;
}
