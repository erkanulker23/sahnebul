/** Önce kayıtlı Google Haritalar bağlantısı; yoksa koordinat veya adres araması. */
export function googleMapsOpenUrl(v: {
    google_maps_url?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    address: string;
}): string {
    const direct = v.google_maps_url?.trim();
    if (direct) {
        return direct;
    }
    const lat = v.latitude != null && v.latitude !== '' ? Number(v.latitude) : NaN;
    const lng = v.longitude != null && v.longitude !== '' ? Number(v.longitude) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return `https://www.google.com/maps?q=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`;
}
