/** Etkinlik listesi / detay — Türkiye duvar saati (admin ve ön yüz aynı gösterim). */
export const SAHNE_EVENT_DISPLAY_TZ = 'Europe/Istanbul';

function capitalizeTr(s: string): string {
    if (!s) return s;
    return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
}

export type FormatTurkishDateTimeOptions = {
    /** Varsayılan true. false iken sadece `06 Haziran Cumartesi` (takvim günü başlıkları vb.). */
    withTime?: boolean;
    /** Boş / geçersiz değerde dönecek metin */
    empty?: string;
    /**
     * IANA zaman dilimi. Verilmezse `Europe/Istanbul` (tarayıcı yerel saati kullanılmaz — yurtdışından
     * bakan kullanıcıda da etkinlik saati İstanbul ile aynı kalır).
     */
    timeZone?: string;
};

/**
 * Tüm arayüzde tutarlı etkinlik / anlık gösterimi: `06 Haziran Cumartesi, 22:00`
 */
export function formatTurkishDateTime(
    value: string | number | Date | null | undefined,
    options?: FormatTurkishDateTimeOptions,
): string {
    const empty = options?.empty ?? '—';
    if (value == null || value === '') {
        return empty;
    }
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) {
        return typeof value === 'string' ? value : empty;
    }

    const tz = options?.timeZone ?? SAHNE_EVENT_DISPLAY_TZ;

    const parts = new Intl.DateTimeFormat('tr-TR', {
        timeZone: tz,
        day: '2-digit',
        month: 'long',
        weekday: 'long',
    }).formatToParts(d);
    const dayNum = parts.find((p) => p.type === 'day')?.value ?? '';
    const monthRaw = parts.find((p) => p.type === 'month')?.value ?? '';
    const weekdayRaw = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const datePart = `${dayNum} ${capitalizeTr(monthRaw)} ${capitalizeTr(weekdayRaw)}`;
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
