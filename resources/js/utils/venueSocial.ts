const VENUE_SOCIAL_ORDER = ['instagram', 'twitter', 'x', 'youtube', 'spotify', 'tiktok', 'facebook'] as const;

export function sortVenueSocialEntries(links: Record<string, string>): [string, string][] {
    const entries = Object.entries(links);
    const order = new Map<string, number>();
    VENUE_SOCIAL_ORDER.forEach((k, i) => order.set(k, i));
    entries.sort((a, b) => {
        const ia = order.get(a[0].toLowerCase()) ?? 100;
        const ib = order.get(b[0].toLowerCase()) ?? 100;
        if (ia !== ib) return ia - ib;
        return a[0].localeCompare(b[0], 'tr');
    });
    return entries;
}

export function venueSocialLinkTitle(key: string): string {
    const k = key.toLowerCase();
    const map: Record<string, string> = {
        instagram: 'Instagram',
        twitter: 'X',
        x: 'X',
        youtube: 'YouTube',
        spotify: 'Spotify',
        tiktok: 'TikTok',
        facebook: 'Facebook',
    };
    return map[k] ?? key;
}
