/** Google Places (yeni JS API) alanları bazen string, bazen { text }, bazen URL nesnesi döner. */
export function googlePlaceFieldText(v: unknown): string {
    if (v == null || v === '') {
        return '';
    }
    if (typeof v === 'string') {
        return v.trim();
    }
    if (typeof v === 'number' && Number.isFinite(v)) {
        return String(v);
    }
    if (typeof v === 'object' && v !== null) {
        const o = v as Record<string, unknown>;
        if (typeof o.text === 'string') {
            return o.text.trim();
        }
        if (typeof o.href === 'string') {
            return o.href.trim();
        }
        if (typeof o.uri === 'string') {
            return o.uri.trim();
        }
        if (v instanceof URL) {
            return v.href;
        }
    }
    return '';
}
