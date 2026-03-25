export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    avatar?: string | null;
    city?: string;
    interests?: string[];
}

export interface LinkedArtistSummary {
    id: number;
    name: string;
    slug: string;
    /** Katalog / sanatçı sayfası fotoğrafı (hesap avatarından ayrı olabilir) */
    avatar?: string | null;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
        /** Hesaba bağlı sanatçı profili (varsa /sahne/sanatci-sayfam) */
        linkedArtist?: LinkedArtistSummary | null;
        /** false: saf sanatçı — yan menüde Mekanlarım / Rezervasyonlar yok */
        artist_panel_show_venue_nav?: boolean;
    };
};
