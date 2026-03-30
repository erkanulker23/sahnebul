/**
 * Sanatçı ve mekân genel profil adresi: `ArtistPublicUsername` / `VenuePublicUsername` ile uyumlu —
 * yalnız a-z ve 0-9 (boşluk, tire ve Türkçe harf yok).
 */
const TR_LOWER_TO_ASCII: Record<string, string> = {
    ı: 'i',
    ğ: 'g',
    ü: 'u',
    ş: 's',
    ö: 'o',
    ç: 'c',
    â: 'a',
    î: 'i',
    û: 'u',
};

export function normalizePublicProfileCompactSlug(raw: string): string {
    const t = raw.trim();
    if (t === '') {
        return '';
    }
    let s = t.toLocaleLowerCase('tr-TR');
    let out = '';
    for (const ch of s) {
        out += TR_LOWER_TO_ASCII[ch] ?? ch;
    }
    out = out.normalize('NFD').replace(/\p{M}/gu, '');

    return out.replace(/[^a-z0-9]/g, '');
}

export const PUBLIC_PROFILE_COMPACT_SLUG_MIN_LENGTH = 3;
