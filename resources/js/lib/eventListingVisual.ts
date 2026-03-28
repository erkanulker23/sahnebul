import { pickEventListingThumbPath } from '@/lib/eventPublicImage';

/**
 * Kart / liste: listing_image veya cover_image tam görünsün (kırpma yok).
 * Instagram vb. sahte önizleme URL’leri elenir. Yedeklerde avatar vb. kullanılabilir.
 */
export function resolveEventCardVisual(options: {
    listing_image?: string | null;
    cover_image?: string | null;
    imageSrc: (path: string | null | undefined) => string | null;
    fallbacks?: Array<string | null | undefined>;
}): { src: string | null; objectFit: 'contain' | 'cover' } {
    const { listing_image, cover_image, imageSrc, fallbacks = [] } = options;
    const thumb = pickEventListingThumbPath(listing_image, cover_image);
    if (thumb) {
        return { src: imageSrc(thumb), objectFit: 'contain' };
    }
    for (const f of fallbacks) {
        const t = typeof f === 'string' ? f.trim() : '';
        if (t) {
            const s = imageSrc(t);
            if (s) {
                return { src: s, objectFit: 'cover' };
            }
        }
    }
    return { src: null, objectFit: 'cover' };
}
