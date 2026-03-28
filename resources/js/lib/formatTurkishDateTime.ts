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
     * IANA zaman dilimi (örn. Europe/Istanbul). Verilmezse tarayıcının yerel dilimi kullanılır.
     * Etkinlik saatleri için İstanbul duvar saati: `Europe/Istanbul`.
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

    const tz = options?.timeZone;

    if (tz) {
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
        const time = d.toLocaleTimeString('tr-TR', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
        return `${datePart}, ${time}`;
    }

    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthRaw = d.toLocaleDateString('tr-TR', { month: 'long' });
    const weekdayRaw = d.toLocaleDateString('tr-TR', { weekday: 'long' });
    const datePart = `${dayNum} ${capitalizeTr(monthRaw)} ${capitalizeTr(weekdayRaw)}`;
    if (options?.withTime === false) {
        return datePart;
    }
    const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
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
        return formatTurkishDateTime(dateStr, options);
    }
    const timePart = t.length === 5 && /^\d{1,2}:\d{2}$/.test(t) ? `${t}:00` : t;
    return formatTurkishDateTime(`${dateStr}T${timePart}`, options);
}
