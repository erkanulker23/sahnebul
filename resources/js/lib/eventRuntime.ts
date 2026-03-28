import { SAHNE_EVENT_DISPLAY_TZ, formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { parseSahnebulEventInstant } from '@/lib/sahneEventInstant';

function ymdInTz(d: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}

function ymdInTzFromIso(iso: string, timeZone: string): string {
    const ms = parseSahnebulEventInstant(iso);
    if (Number.isNaN(ms)) {
        return '';
    }
    return ymdInTz(new Date(ms), timeZone);
}

/**
 * Başlangıç–bitiş ISO aralığında şu an (İstanbul duvar saati ile uyumlu anlık karşılaştırma).
 */
export function isEventOngoingNow(
    startIso: string | null | undefined,
    endIso: string | null | undefined,
    atMs: number = Date.now(),
): boolean {
    if (startIso == null || startIso === '') {
        return false;
    }
    const start = parseSahnebulEventInstant(startIso);
    if (Number.isNaN(start) || atMs < start) {
        return false;
    }
    if (endIso != null && endIso !== '') {
        const end = parseSahnebulEventInstant(endIso);
        if (!Number.isNaN(end)) {
            return atMs <= end;
        }
    }
    /** Bitiş yoksa: yalnızca başlangıcın İstanbul takvim günü içinde “devam ediyor” sayılır (geceyi aşan sahne için bitiş tarihi girilmeli). */
    const tz = SAHNE_EVENT_DISPLAY_TZ;
    const ymdStart = ymdInTzFromIso(startIso, tz);
    const ymdNow = ymdInTz(new Date(atMs), tz);
    return ymdStart !== '' && ymdStart === ymdNow && atMs >= start;
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
    const start = parseSahnebulEventInstant(startIso);
    if (Number.isNaN(start) || atMs < start) {
        return false;
    }
    if (endIso != null && endIso !== '') {
        const end = parseSahnebulEventInstant(endIso);
        if (!Number.isNaN(end)) {
            return atMs > end;
        }
    }
    const tz = SAHNE_EVENT_DISPLAY_TZ;
    return ymdInTz(new Date(atMs), tz) !== ymdInTzFromIso(startIso, tz);
}

/** Tek satır: aynı İstanbul gününde `gün, başlangıç – bitiş`; geceyi aşan etkinliklerde iki tam parça. */
export function formatTurkishEventTimeRange(startIso: string, endIso?: string | null): string {
    const startFull = formatTurkishDateTime(startIso);
    if (endIso == null || endIso === '') {
        return startFull;
    }
    const tz = SAHNE_EVENT_DISPLAY_TZ;
    const sMs = parseSahnebulEventInstant(startIso);
    const eMs = parseSahnebulEventInstant(endIso);
    if (Number.isNaN(sMs) || Number.isNaN(eMs)) {
        return startFull;
    }
    const s = new Date(sMs);
    const e = new Date(eMs);
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
