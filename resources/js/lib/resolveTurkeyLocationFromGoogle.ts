import axios from 'axios';

import { googlePlaceFieldText } from '@/lib/googlePlaceFieldText';

/** Google Places / Geocoder adres parçası (yeni ve eski API alan adları) */
export type GoogleAddressComponent = {
    longText?: string;
    long_name?: string;
    shortText?: string;
    short_name?: string;
    types?: string[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoogleMapsNs = any;

function compLong(c: GoogleAddressComponent): string {
    return String(c.longText || c.long_name || '').trim();
}

function compShort(c: GoogleAddressComponent): string {
    return String(c.shortText || c.short_name || '').trim();
}

/** types → birincil uzun metin (ülke için kısa kod tercih) */
export function addressComponentsToTypeMap(components: GoogleAddressComponent[] | null | undefined): Record<string, string> {
    const map: Record<string, string> = {};
    if (!components?.length) {
        return map;
    }
    for (const c of components) {
        for (const t of c.types || []) {
            if (map[t]) {
                continue;
            }
            if (t === 'country') {
                const s = compShort(c);
                map[t] = s || compLong(c);
            } else {
                map[t] = compLong(c);
            }
        }
    }
    return map;
}

function isTurkey(components: GoogleAddressComponent[]): boolean {
    const c = components.find((x) => x.types?.includes('country'));
    if (!c) {
        return true;
    }
    const short = compShort(c).toUpperCase();
    if (short === 'TR') {
        return true;
    }
    const long = compLong(c).toLocaleLowerCase('tr-TR');
    return long.includes('türkiye') || long === 'turkey';
}

function cleanAdminToken(s: string): string {
    return s.split('/')[0].split(',')[0].trim();
}

/**
 * Türkiye’de sık format: "… Kartal/İstanbul …" — bileşenlerde ilçe yoksa veya locality=il ise kullanılır.
 */
export function inferDistrictFromFormattedAddress(address: string, provinceName: string): string | null {
    const p = provinceName.trim();
    if (!p || !address.trim()) {
        return null;
    }
    const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`([\\p{L}0-9\\s\\-]+?)\\s*/\\s*${esc}\\b`, 'u');
    const m = address.match(re);
    if (!m) {
        return null;
    }
    let part = cleanAdminToken(m[1]).replace(/^\d{1,5}\s+/, '').trim();
    const pLow = p.toLocaleLowerCase('tr-TR');
    if (!part || part.toLocaleLowerCase('tr-TR') === pLow) {
        return null;
    }
    return part;
}

/** Yeni Places API addressComponents / karma nesneleri düzleştirir */
export function normalizeGoogleAddressComponents(raw: unknown): GoogleAddressComponent[] {
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw.map((item): GoogleAddressComponent => {
        const o = item as Record<string, unknown>;
        const typesRaw = o.types;
        const types: string[] = Array.isArray(typesRaw)
            ? typesRaw.map((t) => String(t))
            : typeof typesRaw === 'string'
              ? [typesRaw]
              : [];
        const longFrom = googlePlaceFieldText(o.longText) || googlePlaceFieldText(o.long_name);
        const shortFrom = googlePlaceFieldText(o.shortText) || googlePlaceFieldText(o.short_name);
        return {
            ...(longFrom ? { longText: longFrom } : {}),
            ...(shortFrom ? { shortText: shortFrom } : {}),
            long_name: typeof o.long_name === 'string' ? o.long_name : undefined,
            short_name: typeof o.short_name === 'string' ? o.short_name : undefined,
            types: types.length ? types : undefined,
        };
    });
}

/** İlçe adayı: il ile aynı olmayan ilk anlamlı bileşen */
function pickDistrictName(map: Record<string, string>, provinceName: string): string | null {
    const pNorm = provinceName.trim().toLocaleLowerCase('tr-TR');
    const candidates = [
        map['administrative_area_level_2'],
        map['locality'],
        map['administrative_area_level_3'],
        map['sublocality_level_2'],
    ].filter((x): x is string => Boolean(x && x.trim()));

    for (const raw of candidates) {
        const c = cleanAdminToken(raw);
        if (!c) {
            continue;
        }
        if (c.trim().toLocaleLowerCase('tr-TR') === pNorm) {
            continue;
        }
        if (/türkiye|turkey/i.test(c)) {
            continue;
        }
        return c;
    }
    return null;
}

function pickNeighborhoodName(map: Record<string, string>): string | null {
    const n =
        map['sublocality_level_1'] ||
        map['neighborhood'] ||
        map['sublocality'] ||
        map['administrative_area_level_4'] ||
        '';
    const t = cleanAdminToken(n);
    return t || null;
}

function matchCityId(provinces: { id: number; name: string }[], provinceLongName: string): string | undefined {
    const needle = cleanAdminToken(provinceLongName);
    if (!needle) {
        return undefined;
    }
    for (const p of provinces) {
        if (p.name.trim().localeCompare(needle, 'tr', { sensitivity: 'base' }) === 0) {
            return String(p.id);
        }
    }
    const nLow = needle.toLocaleLowerCase('tr-TR');
    for (const p of provinces) {
        const pl = p.name.toLocaleLowerCase('tr-TR');
        if (nLow.includes(pl) || pl.includes(nLow)) {
            return String(p.id);
        }
    }
    return undefined;
}

function matchDistrictId(districts: { id: number; name: string }[], districtName: string): string | undefined {
    const needle = cleanAdminToken(districtName);
    if (!needle) {
        return undefined;
    }
    for (const d of districts) {
        if (d.name.trim().localeCompare(needle, 'tr', { sensitivity: 'base' }) === 0) {
            return String(d.id);
        }
    }
    const nLow = needle.toLocaleLowerCase('tr-TR');
    for (const d of districts) {
        const dl = d.name.toLocaleLowerCase('tr-TR');
        if (nLow.includes(dl) || dl.includes(nLow)) {
            return String(d.id);
        }
    }
    return undefined;
}

function matchNeighborhoodId(
    neighborhoods: { id: number; name: string }[],
    neighborhoodName: string,
): string | undefined {
    const needle = cleanAdminToken(neighborhoodName);
    if (!needle) {
        return undefined;
    }
    for (const n of neighborhoods) {
        if (n.name.trim().localeCompare(needle, 'tr', { sensitivity: 'base' }) === 0) {
            return String(n.id);
        }
    }
    const nLow = needle.toLocaleLowerCase('tr-TR');
    for (const n of neighborhoods) {
        const nl = n.name.toLocaleLowerCase('tr-TR');
        if (nLow.includes(nl) || nl.includes(nLow)) {
            return String(n.id);
        }
    }
    return undefined;
}

function reverseGeocodeComponents(google: GoogleMapsNs, lat: number, lng: number): Promise<GoogleAddressComponent[]> {
    return new Promise((resolve) => {
        if (!google?.maps?.Geocoder) {
            resolve([]);
            return;
        }
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng }, language: 'tr', region: 'TR' }, (results: { address_components?: GoogleAddressComponent[] }[] | null, status: string) => {
            if (status !== 'OK' || !results?.[0]?.address_components) {
                resolve([]);
                return;
            }
            resolve(results[0].address_components || []);
        });
    });
}

/**
 * Koordinat ve/veya Google adres bileşenlerinden /api/locations ile city_id, district_id, neighborhood_id üretir.
 * @param formattedAddress — "Kartal/İstanbul" gibi ilçe/il formatını metinden çıkarmak için (opsiyonel)
 */
export async function resolveTurkeyLocationFromGoogle(
    google: GoogleMapsNs,
    lat: number,
    lng: number,
    componentsFromPlace?: GoogleAddressComponent[] | null,
    formattedAddress?: string | null,
): Promise<{ city_id?: string; district_id?: string; neighborhood_id?: string }> {
    let components = componentsFromPlace?.length ? componentsFromPlace : [];

    if (!components.length && google?.maps?.Geocoder) {
        components = await reverseGeocodeComponents(google, lat, lng);
    }

    if (!components.length || !isTurkey(components)) {
        return {};
    }

    const map = addressComponentsToTypeMap(components);
    const province = map['administrative_area_level_1']?.trim();
    if (!province) {
        return {};
    }

    let provinces: { id: number; name: string }[];
    try {
        const { data } = await axios.get<{ id: number; name: string }[]>('/api/locations/provinces');
        provinces = Array.isArray(data) ? data : [];
    } catch {
        return {};
    }

    const cityId = matchCityId(provinces, province);
    if (!cityId) {
        return {};
    }

    const out: { city_id?: string; district_id?: string; neighborhood_id?: string } = { city_id: cityId };

    const fromParts = pickDistrictName(map, province);
    const fromSlash =
        formattedAddress?.trim() && province ? inferDistrictFromFormattedAddress(formattedAddress, province) : null;
    const districtName = fromParts ?? fromSlash;
    const neighborhoodName = pickNeighborhoodName(map);

    if (districtName) {
        try {
            const { data: districts } = await axios.get<{ id: number; name: string }[]>(`/api/locations/districts/${cityId}`);
            const list = Array.isArray(districts) ? districts : [];
            const districtId = matchDistrictId(list, districtName);
            if (districtId) {
                out.district_id = districtId;
            }
        } catch {
            /* ilçe listesi alınamazsa yalnız il */
        }
    }

    if (out.district_id && neighborhoodName) {
        try {
            const { data: neighborhoods } = await axios.get<{ id: number; name: string }[]>(
                `/api/locations/neighborhoods/${out.district_id}`,
            );
            const list = Array.isArray(neighborhoods) ? neighborhoods : [];
            const neighborhoodId = matchNeighborhoodId(list, neighborhoodName);
            if (neighborhoodId) {
                out.neighborhood_id = neighborhoodId;
            }
        } catch {
            /* mahalle opsiyonel */
        }
    }

    return out;
}
