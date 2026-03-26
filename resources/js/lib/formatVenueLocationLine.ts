/** Kart üstü: "İstanbul / Maltepe" veya yalnızca il / yalnızca ilçe. */
export function formatVenueLocationLine(
    cityName: string | null | undefined,
    districtName: string | null | undefined,
): string {
    const c = (cityName ?? '').trim();
    const d = (districtName ?? '').trim();
    if (c !== '' && d !== '') {
        return `${c} / ${d}`;
    }
    return c || d || '';
}
