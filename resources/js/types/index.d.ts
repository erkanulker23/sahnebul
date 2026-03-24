export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
}

export interface LinkedArtistSummary {
    id: number;
    name: string;
    slug: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
        /** Hesaba bağlı sanatçı profili (varsa /sahne/sanatci-sayfam) */
        linkedArtist?: LinkedArtistSummary | null;
    };
};
