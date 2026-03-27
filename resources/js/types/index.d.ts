export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    avatar?: string | null;
    city?: string;
    interests?: string[];
    role?: string;
    organization_display_name?: string | null;
    organization_tax_office?: string | null;
    organization_tax_number?: string | null;
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
    /** Üst arama: etiketler (etkinlik türü + müzik) */
    globalSearch?: {
        event_type_tags: { slug: string; label: string }[];
        music_genre_tags: string[];
    };
    auth: {
        user: User;
        /** Hesaba bağlı sanatçı profili (varsa /sahne/sanatci-sayfam) */
        linkedArtist?: LinkedArtistSummary | null;
        /** false: saf sanatçı — yan menüde Mekanlarım / Rezervasyonlar yok */
        artist_panel_show_venue_nav?: boolean;
        /** Organizasyon yöneticisi — sanatçı müsaitlik tarayıcısı */
        is_manager_organization?: boolean;
        /** Üst çubukta gösterilen panel başlığı */
        stage_panel_title?: string;
        /** Kenar çubuğundaki kısa rozet metni */
        stage_sidebar_nav_badge?: string;
        /** E-posta doğrulanmadı — panellerde üst şerit */
        email_verification_banner?: boolean;
    };
};
