/**
 * Kart / liste: listing_image veya cover_image tam görünsün (kırpma yok).
 * Avatar, mekan vb. yedek görsellerde alanı doldurmak için cover kullanılır.
 */
export function resolveEventCardVisual(options: {
    listing_image?: string | null;
    cover_image?: string | null;
    imageSrc: (path: string | null | undefined) => string | null;
    fallbacks?: Array<string | null | undefined>;
}): { src: string | null; objectFit: 'contain' | 'cover' } {
    const { listing_image, cover_image, imageSrc, fallbacks = [] } = options;
    const list = listing_image?.trim();
    if (list) {
        return { src: imageSrc(list), objectFit: 'contain' };
    }
    const cov = cover_image?.trim();
    if (cov) {
        return { src: imageSrc(cov), objectFit: 'contain' };
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
