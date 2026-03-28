import { SAHNE_EVENT_DISPLAY_TZ, formatTurkishDateTime } from '@/lib/formatTurkishDateTime';

function ymdInTz(d: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}

/**
 * Başlangıç–bitiş ISO aralığında şu an (istemci saati değil; karşılaştırma anlık UTC tabanlı).
 */
export function isEventOngoingNow(
    startIso: string | null | undefined,
    endIso: string | null | undefined,
    atMs: number = Date.now(),
): boolean {
    if (startIso == null || startIso === '') {
        return false;
    }
    const start = new Date(startIso).getTime();
    if (Number.isNaN(start) || atMs < start) {
        return false;
    }
    if (endIso != null && endIso !== '') {
        const end = new Date(endIso).getTime();
        if (!Number.isNaN(end)) {
            return atMs <= end;
        }
    }
    /** Bitiş yoksa: yalnızca başlangıcın İstanbul takvim günü içinde “devam ediyor” sayılır (geceyi aşan sahne için bitiş tarihi girilmeli). */
    const tz = SAHNE_EVENT_DISPLAY_TZ;
    const ymdStart = ymdInTz(new Date(startIso), tz);
    const ymdNow = ymdInTz(new Date(atMs), tz);
    return ymdStart === ymdNow && atMs >= start;
}

/** Etkinlik ziyaretçi açısından bitti mi (bitiş yoksa başlangıç günü değişince biter). */
export function isEventFinishedAt(
    startIso: string | null | undefined,
    endIso: string | null | undefined,
    atMs: number = Date.now(),
): boolean {
    if (startIso == null || startIso === '') {
        return false;
    }
    if (isEventOngoingNow(startIso, endIso, atMs)) {
        return false;
    }
    const start = new Date(startIso).getTime();
    if (Number.isNaN(start) || atMs < start) {
        return false;
    }
    if (endIso != null && endIso !== '') {
        const end = new Date(endIso).getTime();
        if (!Number.isNaN(end)) {
            return atMs > end;
        }
    }
    const tz = SAHNE_EVENT_DISPLAY_TZ;
    return ymdInTz(new Date(atMs), tz) !== ymdInTz(new Date(startIso), tz);
}

/** Tek satır: aynı İstanbul gününde `gün, başlangıç – bitiş`; geceyi aşan etkinliklerde iki tam parça. */
export function formatTurkishEventTimeRange(startIso: string, endIso?: string | null): string {
    const startFull = formatTurkishDateTime(startIso);
    if (endIso == null || endIso === '') {
        return startFull;
    }
    const tz = SAHNE_EVENT_DISPLAY_TZ;
    const s = new Date(startIso);
    const e = new Date(endIso);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
        return startFull;
    }
    if (ymdInTz(s, tz) === ymdInTz(e, tz)) {
        const endTime = e.toLocaleTimeString('tr-TR', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        const dateHead = formatTurkishDateTime(startIso, { withTime: false });
        const startTime = s.toLocaleTimeString('tr-TR', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        return `${dateHead}, ${startTime} – ${endTime}`;
    }
    return `${startFull} – ${formatTurkishDateTime(endIso)}`;
}
