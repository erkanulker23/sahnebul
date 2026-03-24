/** Laravel `Event` modeli ile aynı sabitler */
export const TICKET_MODE_EXTERNAL = 'external_platforms';
export const TICKET_MODE_SAHNEBUL = 'sahnebul';
export const TICKET_MODE_PHONE = 'phone_only';

/** Etkinlik kaydındaki alanlara göre rozet metni ve renkleri (uydurma metin yok). */
export function eventTicketBadge(ev: {
    status?: string | null;
    is_full?: boolean | null;
    ticket_acquisition_mode?: string | null;
    sahnebul_reservation_enabled?: boolean | null;
}): { label: string; pillClass: string } {
    if (ev.status === 'cancelled') {
        return { label: 'İptal', pillClass: 'bg-red-600 text-white' };
    }
    if (ev.is_full) {
        return { label: 'Tükendi', pillClass: 'bg-zinc-500 text-white' };
    }
    const mode = ev.ticket_acquisition_mode ?? TICKET_MODE_SAHNEBUL;
    if (mode === TICKET_MODE_EXTERNAL) {
        return { label: 'Harici satış', pillClass: 'bg-sky-600 text-white' };
    }
    if (mode === TICKET_MODE_PHONE) {
        return { label: 'Telefon ile', pillClass: 'bg-amber-600 text-white' };
    }
    if (ev.sahnebul_reservation_enabled) {
        return { label: 'Satışta', pillClass: 'bg-emerald-600 text-white' };
    }
    return { label: 'Bilet bilgisi', pillClass: 'bg-zinc-500 text-white' };
}
