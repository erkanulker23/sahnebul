/**
 * Google Haritalar paylaşım / yer bağlantılarından enlem-boylam çıkarır.
 * Koordinat yoksa (yalnızca place id vb.) null döner.
 */
export function extractLatLngFromGoogleMapsUrl(raw: string): { lat: number; lng: number } | null {
    const s = raw.trim();
    if (!s) {
        return null;
    }

    // @41.0082,28.9784 veya @41.0082,28.9784,17z
    const at = s.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,|(?![\d.]))/);
    if (at) {
        const lat = Number(at[1]);
        const lng = Number(at[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng };
        }
    }

    // !3d41.02!4d28.97 (bazı kısa linkler)
    const bang = s.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (bang) {
        const lat = Number(bang[1]);
        const lng = Number(bang[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng };
        }
    }

    const qParam = s.match(/[?&]q=([^&]+)/);
    if (qParam) {
        const decoded = decodeURIComponent(qParam[1].replace(/\+/g, ' '));
        const coordLike = decoded.match(/^(-?\d+\.?\d*)\s*[,;]\s*(-?\d+\.?\d*)$/);
        if (coordLike) {
            const lat = Number(coordLike[1]);
            const lng = Number(coordLike[2]);
            if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                return { lat, lng };
            }
        }
    }

    const ll = s.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (ll) {
        const lat = Number(ll[1]);
        const lng = Number(ll[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng };
        }
    }

    return null;
}
