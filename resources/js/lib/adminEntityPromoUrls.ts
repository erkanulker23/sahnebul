import type { AdminEntityPromoGalleryRoutes } from '@/Components/Admin/AdminEntityPromoGalleryPanel';

/**
 * Tanıtım galerisi POST uçları — Ziggy listesi eksik olsa bile çalışır (routes/web.php ile aynı path).
 */
export function adminVenuePromoGalleryRoutes(venueId: number): AdminEntityPromoGalleryRoutes {
    const base = `/admin/mekanlar/${venueId}`;

    return {
        importMedia: `${base}/adresten-tanitim-medya`,
        appendPromoFiles: `${base}/tanitim-dosya-yukle`,
        clearPromoMedia: `${base}/tanitim-medya-temizle`,
        removePromoItem: `${base}/tanitim-galeri-oge-sil`,
    };
}

export function adminArtistPromoGalleryRoutes(artistId: number): AdminEntityPromoGalleryRoutes {
    const base = `/admin/sanatcilar/${artistId}`;

    return {
        importMedia: `${base}/adresten-tanitim-medya`,
        appendPromoFiles: `${base}/tanitim-dosya-yukle`,
        clearPromoMedia: `${base}/tanitim-medya-temizle`,
        removePromoItem: `${base}/tanitim-galeri-oge-sil`,
    };
}
