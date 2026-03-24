/** Platform etkinliği: /etkinlikler/{slug}-{id} */
export function eventShowParam(ev: { slug: string; id: number }): string {
    return `${ev.slug}-${ev.id}`;
}

/** Dış kaynak (şehir seç listesi) etkinliği: /etkinlikler/dis{id} — slug-id ile çakışmaz. */
export function externalDisKaynakSegment(id: number): string {
    return `dis${id}`;
}
