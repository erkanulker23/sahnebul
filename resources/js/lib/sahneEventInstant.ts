/**
 * Etkinlik `start_date` / `end_date` ISO dizgileri: ofset varsa standart parse.
 * Ofsetsiz (naive) `YYYY-MM-DDTHH:mm(:ss)?` değerleri Europe/Istanbul (+03) duvar saati kabul edilir
 * — böylece yurtdışındaki tarayıcıda da "Devam ediyor" / Bugün / Yarın doğru kalır.
 */
export function parseSahnebulEventInstant(iso: string | null | undefined): number {
    if (iso == null || iso === '') {
        return NaN;
    }
    const s = String(iso).trim();
    if (s === '') {
        return NaN;
    }

    const hasExplicitOffset = /[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s);
    if (hasExplicitOffset) {
        return new Date(s).getTime();
    }

    const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/);
    if (m) {
        const datePart = m[1];
        const timePart = m[2]!.length === 5 ? `${m[2]}:00` : m[2];
        return new Date(`${datePart}T${timePart}+03:00`).getTime();
    }

    return new Date(s).getTime();
}
