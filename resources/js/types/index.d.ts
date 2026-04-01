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
    organization_public_slug?: string | null;
    organization_about?: string | null;
    organization_cover_image?: string | null;
    organization_website?: string | null;
    organization_social_links?: Record<string, string> | null;
    /** Tarayıcı bildirimi tercihi (hesap bildirimleri için) */
    browser_notifications_enabled?: boolean;
    /** Cep — etkinlik hatırlatması SMS */
    phone?: string | null;
    event_reminder_email_enabled?: boolean;
    event_reminder_sms_enabled?: boolean;
    /** 0–23, Europe/Istanbul — hatırlatmanın gideceği saat (etkinlikten bir gün önce) */
    event_reminder_email_hour?: number;
}

export interface LinkedArtistSummary {
    id: number;
    name: string;
    slug: string;
    /** Katalog / sanatçı sayfası fotoğrafı (hesap avatarından ayrı olabilir) */
    avatar?: string | null;
}

/** Müşteri / sahne panelleri bekleyen işlem özeti (admin `adminNotifications` ile ayrı). */
export type PanelNotificationsPayload = {
    total: number;
    items: { key: string; label: string; count: number; href: string }[];
};

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    /** Üst arama: etiketler (etkinlik türü + müzik) */
    globalSearch?: {
        event_type_tags: { slug: string; label: string }[];
        music_genre_tags: string[];
    };
    panelNotifications?: PanelNotificationsPayload | null;
    auth: {
        user: User | null;
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
        /** Mekân satırı / Gold — üst menüde sahne paneli kısayolu */
        sahne_compact_nav?: boolean;
        /** Site yöneticisi — müşteri rezervasyon menüsü gizli */
        is_platform_admin?: boolean;
        /** E-posta doğrulanmadı — panellerde üst şerit */
        email_verification_banner?: boolean;
        /** Organizasyon kamu profil özeti (yalnızca manager_organization) */
        organization_public_profile?: {
            published: boolean;
            slug: string | null;
            url: string | null;
        } | null;
    };
};
