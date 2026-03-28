import { parseSahnebulEventInstant } from '@/lib/sahneEventInstant';

/** Etkinlik listesi / detay — Türkiye duvar saati (admin ve ön yüz aynı gösterim). */
export const SAHNE_EVENT_DISPLAY_TZ = 'Europe/Istanbul';

function capitalizeTr(s: string): string {
    if (!s) return s;
    return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
}

export type FormatTurkishDateTimeOptions = {
    /** Varsayılan true. false iken saat gösterilmez (tarih satırında yıl yine varsayılan olarak vardır). */
    withTime?: boolean;
    /** Varsayılan true — `28 Mart Cumartesi 2026`. false iken yıl gösterilmez (nadir özetler). */
    withYear?: boolean;
    /** Boş / geçersiz değerde dönecek metin */
    empty?: string;
    /**
     * IANA zaman dilimi. Verilmezse `Europe/Istanbul` (tarayıcı yerel saati kullanılmaz — yurtdışından
     * bakan kullanıcıda da etkinlik saati İstanbul ile aynı kalır).
     */
    timeZone?: string;
};

/**
 * Tüm arayüzde tutarlı gösterim: `28 Mart Cumartesi 2026, 22:00` (yıl + İstanbul saati).
 */
export function formatTurkishDateTime(
    value: string | number | Date | null | undefined,
    options?: FormatTurkishDateTimeOptions,
): string {
    const empty = options?.empty ?? '—';
    if (value == null || value === '') {
        return empty;
    }
    let d: Date;
    if (value instanceof Date) {
        d = value;
    } else if (typeof value === 'string') {
        const ms = parseSahnebulEventInstant(value);
        d = new Date(ms);
    } else {
        d = new Date(value);
    }
    if (Number.isNaN(d.getTime())) {
        return typeof value === 'string' ? value : empty;
    }

    const tz = options?.timeZone ?? SAHNE_EVENT_DISPLAY_TZ;
    const withYear = options?.withYear !== false;

    const parts = new Intl.DateTimeFormat('tr-TR', {
        timeZone: tz,
        day: '2-digit',
        month: 'long',
        weekday: 'long',
        ...(withYear ? { year: 'numeric' as const } : {}),
    }).formatToParts(d);
    const dayNum = parts.find((p) => p.type === 'day')?.value ?? '';
    const monthRaw = parts.find((p) => p.type === 'month')?.value ?? '';
    const weekdayRaw = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const yearRaw = parts.find((p) => p.type === 'year')?.value ?? '';
    const datePart = withYear
        ? `${dayNum} ${capitalizeTr(monthRaw)} ${capitalizeTr(weekdayRaw)} ${yearRaw}`
        : `${dayNum} ${capitalizeTr(monthRaw)} ${capitalizeTr(weekdayRaw)}`;
    if (options?.withTime === false) {
        return datePart;
    }
    const time = d.toLocaleTimeString('tr-TR', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    return `${datePart}, ${time}`;
}

/** `reservation_date` (YYYY-MM-DD) + `reservation_time` (HH:mm veya HH:mm:ss) */
export function formatTurkishDateTimeFromParts(
    dateStr: string | null | undefined,
    timeStr: string | null | undefined,
    options?: FormatTurkishDateTimeOptions,
): string {
    const empty = options?.empty ?? '—';
    if (dateStr == null || dateStr === '') {
        return empty;
    }
    const t = (timeStr ?? '').trim();
    if (!t) {
        return formatTurkishDateTime(`${dateStr.trim()}T12:00:00+03:00`, { ...options, withTime: false });
    }
    const timePart = t.length === 5 && /^\d{1,2}:\d{2}$/.test(t) ? `${t}:00` : t;
    /** Sunucu / form bu ikiliyi İstanbul duvar saati olarak saklar; `T` ile birleşik ISO yerel yorumlanmasın. */
    const istanbulInstant = `${dateStr.trim()}T${timePart}+03:00`;
    return formatTurkishDateTime(istanbulInstant, options);
}
