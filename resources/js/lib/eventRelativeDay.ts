import { SAHNE_EVENT_DISPLAY_TZ } from '@/lib/formatTurkishDateTime';

function ymdKeyInTimeZone(d: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
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

export type EventRelativeDayKind = 'today' | 'tomorrow';

/**
 * Etkinlik başlangıcı İstanbul takvimine göre bugün mü, yarın mı?
 */
export function eventRelativeDayKind(startIso: string | null | undefined): EventRelativeDayKind | null {
    if (startIso == null || startIso === '') {
        return null;
    }
    const eventDate = new Date(startIso);
    if (Number.isNaN(eventDate.getTime())) {
        return null;
    }
    const tz = SAHNE_EVENT_DISPLAY_TZ;
    const eventKey = ymdKeyInTimeZone(eventDate, tz);
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
    return kind === 'today' ? 'Bugün' : 'Yarın';
}
