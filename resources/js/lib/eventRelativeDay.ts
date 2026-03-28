import { SAHNE_EVENT_DISPLAY_TZ } from '@/lib/formatTurkishDateTime';
import { isEventOngoingNow } from '@/lib/eventRuntime';
import { parseSahnebulEventInstant } from '@/lib/sahneEventInstant';

function ymdKeyInTimeZone(d: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}

function ymdKeyFromStartIso(startIso: string, timeZone: string): string {
    const ms = parseSahnebulEventInstant(startIso);
    if (Number.isNaN(ms)) {
        return '';
    }
    return ymdKeyInTimeZone(new Date(ms), timeZone);
}

/** Takvim günü +1 (YYYY-MM-DD); İstanbul takvim kıyası için yeterli (TR’de DST yok). */
function addOneCalendarDayYmd(ymd: string): string {
    const parts = ymd.split('-').map(Number);
    const y = parts[0];
    const m = parts[1];
    const day = parts[2];
    if (y == null || m == null || day == null || Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(day)) {
        return ymd;
    }
    const dt = new Date(Date.UTC(y, m - 1, day + 1));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

export type EventRelativeDayKind = 'today' | 'tomorrow' | 'ongoing';

/**
 * Etkinlik başlangıcı İstanbul takvimine göre bugün mü, yarın mı?
 * `endIso` verilirse ve şu an aralık içindeyse `ongoing` döner (Bugün/Yarın yerine).
 */
export function eventRelativeDayKind(
    startIso: string | null | undefined,
    endIso?: string | null,
): EventRelativeDayKind | null {
    if (startIso == null || startIso === '') {
        return null;
    }
    if (Number.isNaN(parseSahnebulEventInstant(startIso))) {
        return null;
    }
    if (isEventOngoingNow(startIso, endIso ?? null)) {
        return 'ongoing';
    }
    const tz = SAHNE_EVENT_DISPLAY_TZ;
    const eventKey = ymdKeyFromStartIso(startIso, tz);
    if (eventKey === '') {
        return null;
    }
    const todayKey = ymdKeyInTimeZone(new Date(), tz);
    if (eventKey === todayKey) {
        return 'today';
    }
    if (eventKey === addOneCalendarDayYmd(todayKey)) {
        return 'tomorrow';
    }
    return null;
}

export function eventRelativeDayTrLabel(kind: EventRelativeDayKind): string {
    if (kind === 'ongoing') {
        return 'Devam ediyor';
    }
    return kind === 'today' ? 'Bugün' : 'Yarın';
}
