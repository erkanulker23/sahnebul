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

/** Sahne panelinde etkinlik/sanatçı oluşturan kullanıcı (API yanıtı — snake_case). */
export type StageUserRef = {
    id: number;
    name: string;
    role: string;
    organization_display_name?: string | null;
};

export function stageEventCreatorLabel(user: StageUserRef | null | undefined): string | null {
    if (!user) {
        return null;
    }
    if (user.role === 'manager_organization') {
        const org = user.organization_display_name?.trim();
        return org ? `Management: ${org}` : `Management: ${user.name}`;
    }
    if (user.role === 'venue_owner') {
        return `Mekân sahibi: ${user.name}`;
    }
    return user.name;
}

export function stageManagementArtistLabel(user: StageUserRef | null | undefined): string | null {
    if (!user) {
        return null;
    }
    const org = user.organization_display_name?.trim();
    return org ? `Management kadrosu (${org})` : `Management kadrosu (${user.name})`;
}
