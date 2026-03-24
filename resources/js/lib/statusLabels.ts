/** Veritabanı durum kodlarını arayüzde Türkçe gösterir. */

const VENUE_ARTIST: Record<string, string> = {
    pending: 'Beklemede',
    approved: 'Onaylı',
    rejected: 'Reddedildi',
};

const EVENT: Record<string, string> = {
    draft: 'Taslak',
    published: 'Yayında',
    cancelled: 'İptal',
};

const RESERVATION: Record<string, string> = {
    pending: 'Beklemede',
    confirmed: 'Onaylandı',
    cancelled: 'İptal',
    completed: 'Tamamlandı',
};

export function venueArtistStatusTr(status: string): string {
    return VENUE_ARTIST[status] ?? status;
}

export function eventStatusTr(status: string): string {
    return EVENT[status] ?? status;
}

export function reservationStatusTr(status: string): string {
    return RESERVATION[status] ?? status;
}

export function claimRequestStatusTr(status: string): string {
    return VENUE_ARTIST[status] ?? status;
}
