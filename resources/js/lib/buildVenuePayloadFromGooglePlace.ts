import { googlePlaceFieldText } from '@/lib/googlePlaceFieldText';

/** Google Places’tan forma aktarılan ek alanlar (telefon, web, sosyal, açıklama). */

export type VenueGoogleSocialKey = 'instagram' | 'twitter' | 'youtube' | 'spotify' | 'tiktok' | 'facebook';

export type VenueGoogleLocationApplyPayload = {
    address: string;
    latitude: string;
    longitude: string;
    /** /api/locations ile eşlenen il (şehir) id — string, select value ile uyumlu */
    city_id?: string;
    district_id?: string;
    neighborhood_id?: string;
    placeName?: string;
    phone?: string;
    whatsapp?: string;
    website?: string;
    social_links?: Partial<Record<VenueGoogleSocialKey, string>>;
    /** Admin RichTextEditor (HTML) — açıklama boşsa doldurulur */
    descriptionHtmlFromGoogle?: string;
    /** Sanatçı textarea — açıklama boşsa doldurulur */
    descriptionPlainFromGoogle?: string;
    /** Places fotoğrafı (getUrl) — kapak görsel URL alanına yazılır */
    coverImageUrlFromGoogle?: string;
    /** En fazla 5 foto URL — kayıtta galeriye indirilir */
    galleryImageUrlsFromGoogle?: string[];
    /** Google Haritalar’da işletmenin resmi paylaşım / yer URI’si */
    googleMapsUrl?: string;
};

const SOCIAL_RULES: { re: RegExp; key: VenueGoogleSocialKey }[] = [
    { re: /instagram\.com/i, key: 'instagram' },
    { re: /facebook\.com|fb\.com|fb\.me/i, key: 'facebook' },
    { re: /(^|\.)twitter\.com|(^|\.)x\.com/i, key: 'twitter' },
    { re: /youtube\.com|youtu\.be/i, key: 'youtube' },
    { re: /tiktok\.com/i, key: 'tiktok' },
    { re: /open\.spotify\.com|spotify\.com/i, key: 'spotify' },
];

function normalizeUrl(raw: string): string {
    const t = raw.trim();
    if (!t) {
        return '';
    }
    if (/^https?:\/\//i.test(t)) {
        return t;
    }
    return `https://${t}`;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function classifyUrl(raw: string): { kind: 'whatsapp' | 'social' | 'web'; key?: VenueGoogleSocialKey; url: string } {
    const url = normalizeUrl(raw);
    try {
        const u = new URL(url);
        const h = u.hostname.toLowerCase();
        if (/wa\.me$|whatsapp\.com$|api\.whatsapp\.com$/i.test(h) || h.endsWith('.whatsapp.com')) {
            return { kind: 'whatsapp', url };
        }
        for (const { re, key } of SOCIAL_RULES) {
            if (re.test(h)) {
                return { kind: 'social', key, url };
            }
        }
        return { kind: 'web', url };
    } catch {
        return { kind: 'web', url: raw.trim() };
    }
}

function pickPhone(international?: string | null, national?: string | null): string | undefined {
    const i = international?.trim();
    const n = national?.trim();
    const p = i || n;
    return p || undefined;
}

function editorialToText(editorial: unknown): string {
    if (editorial == null) {
        return '';
    }
    if (typeof editorial === 'string') {
        return editorial.trim();
    }
    if (typeof editorial === 'object' && editorial !== null) {
        const t = (editorial as { text?: unknown }).text;
        if (typeof t === 'string' && t.trim() !== '') {
            return t.trim();
        }
        const overview = (editorial as { overview?: unknown }).overview;
        if (typeof overview === 'string' && overview.trim() !== '') {
            return overview.trim();
        }
        const fromLocalized = googlePlaceFieldText(editorial);
        if (fromLocalized.trim() !== '') {
            return fromLocalized.trim();
        }
    }
    return '';
}

function weekdayTextsFromOpeningHours(oh: unknown): string[] {
    if (oh == null || typeof oh !== 'object') {
        return [];
    }
    const o = oh as { weekdayDescriptions?: unknown; weekday_text?: unknown };
    const a = o.weekdayDescriptions ?? o.weekday_text;
    if (!Array.isArray(a)) {
        return [];
    }
    return a.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
}

function buildDescriptions(editorialText: string, weekdayTexts: string[]): {
    html?: string;
    plain?: string;
} {
    const plainParts: string[] = [];
    const htmlParts: string[] = [];

    if (editorialText) {
        plainParts.push(editorialText);
        htmlParts.push(`<p>${escapeHtml(editorialText).replace(/\n/g, '<br/>')}</p>`);
    }
    if (weekdayTexts.length > 0) {
        plainParts.push('Çalışma saatleri (Google):', ...weekdayTexts);
        htmlParts.push(
            `<p><strong>Çalışma saatleri (Google)</strong></p><ul>${weekdayTexts.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`,
        );
    }
    if (plainParts.length === 0) {
        return {};
    }
    return {
        plain: plainParts.join('\n'),
        html: htmlParts.join(''),
    };
}

function deriveWebsiteAndSocial(websiteRaw?: string | null, mapsUrl?: string | null): {
    website?: string;
    whatsapp?: string;
    social_links: Partial<Record<VenueGoogleSocialKey, string>>;
} {
    const social_links: Partial<Record<VenueGoogleSocialKey, string>> = {};
    let website: string | undefined;
    let whatsapp: string | undefined;

    const candidates = [websiteRaw, mapsUrl].filter((x): x is string => typeof x === 'string' && x.trim() !== '');

    for (const raw of candidates) {
        const c = classifyUrl(raw);
        if (c.kind === 'whatsapp') {
            whatsapp = whatsapp || c.url;
        } else if (c.kind === 'social' && c.key) {
            if (!social_links[c.key]) {
                social_links[c.key] = c.url;
            }
        } else if (c.kind === 'web') {
            website = website || c.url;
        }
    }

    if (!website && mapsUrl?.trim()) {
        const m = classifyUrl(mapsUrl);
        if (m.kind === 'web') {
            website = m.url;
        }
    }

    return {
        ...(website ? { website } : {}),
        ...(whatsapp ? { whatsapp } : {}),
        social_links,
    };
}

function formatCoord(n: number): string {
    return n.toFixed(8);
}

/** Boş veya yalnızca boş HTML etiketleri / &nbsp; */
export function isRichTextProbablyEmpty(html: string | null | undefined): boolean {
    if (html == null || !String(html).trim()) {
        return true;
    }
    const t = String(html)
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return t === '';
}

export function buildVenueGoogleLocationPayload(input: {
    address: string;
    latitude: number;
    longitude: number;
    placeName?: string;
    internationalPhone?: string | null;
    nationalPhone?: string | null;
    websiteUrl?: string | null;
    mapsUrl?: string | null;
    editorialSummary?: unknown;
    openingHours?: unknown;
    /** Google’dan çıkarılan foto URL’leri (en fazla 5) */
    galleryImageUrlsFromGoogle?: string[];
}): VenueGoogleLocationApplyPayload {
    const phone = pickPhone(input.internationalPhone, input.nationalPhone);
    const editorialText = editorialToText(input.editorialSummary);
    const weekdayTexts = weekdayTextsFromOpeningHours(input.openingHours);
    const { html, plain } = buildDescriptions(editorialText, weekdayTexts);
    const { website, whatsapp, social_links } = deriveWebsiteAndSocial(input.websiteUrl, null);

    const hasSocial = Object.keys(social_links).length > 0;
    const gMaps = input.mapsUrl?.trim() ?? '';

    const gallery = [...new Set((input.galleryImageUrlsFromGoogle ?? []).map((u) => u.trim()).filter((u) => /^https?:\/\//i.test(u)))].slice(
        0,
        5,
    );

    return {
        address: input.address.trim(),
        latitude: formatCoord(input.latitude),
        longitude: formatCoord(input.longitude),
        ...(input.placeName?.trim() ? { placeName: input.placeName.trim() } : {}),
        ...(phone ? { phone } : {}),
        ...(whatsapp ? { whatsapp } : {}),
        ...(website ? { website } : {}),
        ...(hasSocial ? { social_links } : {}),
        ...(html ? { descriptionHtmlFromGoogle: html } : {}),
        ...(plain ? { descriptionPlainFromGoogle: plain } : {}),
        ...(gMaps ? { googleMapsUrl: gMaps } : {}),
        ...(gallery.length > 0 ? { galleryImageUrlsFromGoogle: gallery, coverImageUrlFromGoogle: gallery[0] } : {}),
    };
}
