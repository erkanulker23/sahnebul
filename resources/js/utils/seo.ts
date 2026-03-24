/** Tarayıcı sekmesi başlığı — app.tsx içindeki title şablonu ile uyumlu */
export function buildDocumentTitle(pageTitle: string, siteName: string): string {
    const t = pageTitle.trim();
    if (!t) return siteName;
    if (t.includes(siteName)) return t;
    return `${t} | ${siteName}`;
}

export function truncateMetaDescription(text: string, max = 160): string {
    const one = text.replace(/\s+/g, ' ').trim();
    if (one.length <= max) return one;
    return `${one.slice(0, max - 1).trim()}…`;
}

export function stripHtmlToText(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function toAbsoluteUrl(pathOrUrl: string | null | undefined, appUrl: string): string | null {
    if (!pathOrUrl?.trim() || !appUrl) return null;
    const s = pathOrUrl.trim();
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    const base = appUrl.replace(/\/$/, '');
    const path = s.startsWith('/') ? s : `/${s}`;
    return `${base}${path}`;
}
