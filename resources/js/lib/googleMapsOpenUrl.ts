import { extractLatLngFromGoogleMapsUrl } from '@/lib/extractGoogleMapsCoords';

/** Adres alanı yalnızca DMS veya ondalık koordinat gibi görünüyorsa (sokak adresi değil). */
export function addressLooksLikeCoordinateString(text: string): boolean {
    const t = text.trim();
    if (t.length < 6) {
        return false;
    }
    if (/^-?\d{1,3}\.\d+\s*[,;]\s*-?\d{1,3}\.\d+$/.test(t)) {
        return true;
    }
    if (/[°′'″"]/.test(t) && /\d/.test(t)) {
        return true;
    }
    if (/\b[NS]\b/i.test(t) && /\b[EW]\b/i.test(t) && /\d/.test(t)) {
        return true;
    }
    return false;
}

/**
 * Harita bağlantısında gösterilecek metin: koordinat satırı yerine mekân adı + şehir.
 */
export function venueMapAddressDisplay(params: {
    address: string;
    venueName: string;
    cityName?: string | null;
}): string {
    const a = params.address.trim();
    if (a && !addressLooksLikeCoordinateString(a)) {
        return a;
    }
    const city = params.cityName?.trim();
    const name = params.venueName.trim();
    if (name && city) {
        return `${name} — ${city}`;
    }
    if (name) {
        return name;
    }
    return 'Konumu Google Haritalar’da aç';
}

type MapVenueInput = {
    google_maps_url?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    address: string;
};

function parseLatLng(v: MapVenueInput): { lat: number; lng: number } | null {
    const lat = v.latitude != null && v.latitude !== '' ? Number(v.latitude) : NaN;
    const lng = v.longitude != null && v.longitude !== '' ? Number(v.longitude) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
    }
    const fromUrl = v.google_maps_url ? extractLatLngFromGoogleMapsUrl(v.google_maps_url) : null;
    return fromUrl;
}

/** Önce kayıtlı Google Haritalar bağlantısı; yoksa koordinat veya adres araması. */
export function googleMapsOpenUrl(v: MapVenueInput): string {
    const direct = v.google_maps_url?.trim();
    if (direct && /^https?:\/\//i.test(direct)) {
        return direct.startsWith('http://') ? `https://${direct.slice(7)}` : direct;
    }
    const ll = parseLatLng(v);
    if (ll) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ll.lat},${ll.lng}`)}`;
    }
    const q = v.address?.trim();
    if (q !== '') {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    }
    return 'https://www.google.com/maps/search/?api=1&query=T%C3%BCrkiye';
}

/**
 * Yol tarifi: varsa kayıtlı harita URL’sinden çıkan veya DB’deki ondalık koordinat;
 * aksi halde okunabilir adres veya mekân + şehir sorgusu.
 */
export function googleMapsDirectionsUrl(
    v: MapVenueInput & { placeQuery?: string; venueName?: string; cityName?: string | null },
): string {
    const fromStoredUrl = v.google_maps_url ? extractLatLngFromGoogleMapsUrl(v.google_maps_url) : null;
    if (fromStoredUrl) {
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${fromStoredUrl.lat},${fromStoredUrl.lng}`)}`;
    }
    const ll = parseLatLng(v);
    const addr = v.address?.trim() ?? '';
    if (addr && !addressLooksLikeCoordinateString(addr)) {
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
    }
    if (ll) {
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${ll.lat},${ll.lng}`)}`;
    }
    const pq = v.placeQuery?.trim();
    if (pq) {
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pq)}`;
    }
    const name = v.venueName?.trim() ?? '';
    const city = v.cityName?.trim() ?? '';
    if (name || city) {
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([name, city].filter(Boolean).join(' '))}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr || 'Türkiye')}`;
}
