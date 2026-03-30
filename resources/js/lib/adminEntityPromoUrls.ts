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

export function adminEventPromoGalleryRoutes(eventId: number): AdminEntityPromoGalleryRoutes {
    const base = `/admin/etkinlikler/${eventId}`;

    return {
        importMedia: `${base}/adresten-medya`,
        appendPromoFiles: `${base}/tanitim-dosya-yukle`,
        clearPromoMedia: `${base}/tanitim-medya-temizle`,
        removePromoItem: `${base}/tanitim-galeri-oge-sil`,
    };
}

/** Mekân sahibi — `/sahne/etkinlikler/{id}` tanıtım POST uçları */
export function artistPanelEventPromoGalleryRoutes(eventId: number): AdminEntityPromoGalleryRoutes {
    const base = `/sahne/etkinlikler/${eventId}`;

    return {
        importMedia: `${base}/adresten-medya`,
        appendPromoFiles: `${base}/tanitim-dosya-yukle`,
        clearPromoMedia: `${base}/tanitim-medya-temizle`,
        removePromoItem: `${base}/tanitim-galeri-oge-sil`,
    };
}
