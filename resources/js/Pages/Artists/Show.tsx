import DetailEventList, { groupDetailEventsByMonthForDisplay } from '@/Components/DetailEventList';
import { SocialPlatformIcon } from '@/Components/SocialPlatformIcon';
import { eventShowParam } from '@/lib/eventShowUrl';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { claimRequestStatusTr } from '@/lib/statusLabels';
import SeoHead, { metaDescriptionFromContent } from '@/Components/SeoHead';
import { truncateMetaDescription } from '@/utils/seo';
import { RichOrPlainContent } from '@/Components/SafeRichContent';
import VerifiedArtistProfileBadge from '@/Components/VerifiedArtistProfileBadge';
import AppLayout from '@/Layouts/AppLayout';
import { Link, router, usePage } from '@inertiajs/react';
import { Music2, Pause, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface Venue {
    name: string;
    slug: string;
    city?: { name: string };
}

interface Event {
    id: number;
    slug: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string | null;
    ticket_price: number | null;
    cover_image?: string | null;
    status?: string;
    is_full?: boolean;
    ticket_acquisition_mode?: string;
    sahnebul_reservation_enabled?: boolean;
    venue: Venue;
}

interface SpotifyAlbumPreview {
    id: string;
    name: string;
    release_date: string | null;
    image: string | null;
    url: string | null;
}

interface ArtistMediaItem {
    id: number;
    path: string;
    title: string | null;
    type: string;
}

function stringMapHasContent(obj: Record<string, unknown> | null | undefined): boolean {
    if (!obj) return false;
    return Object.values(obj).some((v) => typeof v === 'string' && v.trim() !== '');
}

const SOCIAL_ORDER = ['instagram', 'twitter', 'x', 'youtube', 'spotify', 'tiktok', 'facebook'] as const;

/** API bazen null / beklenmeyen yapı döndürebilir; yalnızca dolu string değerleri alırız. */
function coerceSocialLinksRecord(raw: unknown): Record<string, string> {
    if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
        return {};
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof k !== 'string' || typeof v !== 'string') continue;
        const t = v.trim();
        if (t !== '') out[k] = t;
    }
    return out;
}

/**
 * Panelde çoğu kullanıcı tam URL yerine kullanıcı adı veya https’siz adres girer;
 * tıklanabilir ve doğru hedef için normalize ederiz.
 */
function resolveSocialHref(platformKey: string, raw: string): string {
    const v = raw.trim();
    if (!v) return '#';
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith('//')) return `https:${v}`;

    const k = platformKey.toLowerCase();
    const handle = v.replace(/^@/, '').replace(/\s+/g, '');

    const looksLikeDomainOrPath = v.includes('.') || v.includes('/') || v.startsWith('www.');

    if (!looksLikeDomainOrPath && handle.length > 0 && /^[\w.-]+$/.test(handle)) {
        if (k === 'instagram') return `https://instagram.com/${handle}/`;
        if (k === 'twitter' || k === 'x') return `https://x.com/${handle}`;
        if (k === 'tiktok') return `https://www.tiktok.com/@${handle.replace(/^@/, '')}`;
        if (k === 'facebook') return `https://www.facebook.com/${handle}`;
        if (k === 'youtube') return `https://www.youtube.com/@${handle}`;
        if (k === 'spotify' && /^[a-zA-Z0-9]{22}$/.test(handle)) {
            return `https://open.spotify.com/artist/${handle}`;
        }
    }

    const withProto = v.startsWith('www.') || v.includes('.') || v.includes('/') ? `https://${v.replace(/^\/+/, '')}` : `https://${v}`;

    return withProto;
}

function resolveWebsiteHref(raw: string): string {
    const v = raw.trim();
    if (!v) return '#';
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith('//')) return `https:${v}`;
    return `https://${v.replace(/^\/+/, '')}`;
}

function socialBadgeClass(platform: string): string {
    const k = platform.toLowerCase();
    const map: Record<string, string> = {
        instagram: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]',
        twitter: 'bg-zinc-900',
        x: 'bg-zinc-900',
        youtube: 'bg-red-600',
        spotify: 'bg-[#1ed760] text-zinc-950',
        tiktok: 'bg-zinc-950 ring-1 ring-white/15',
        facebook: 'bg-[#1877f2]',
    };
    return map[k] ?? 'bg-zinc-600';
}

function sortSocialEntries(links: Record<string, string>): [string, string][] {
    const entries = Object.entries(links);
    const order = new Map<string, number>();
    SOCIAL_ORDER.forEach((k, i) => order.set(k, i));
    entries.sort((a, b) => {
        const ia = order.get(a[0].toLowerCase()) ?? 100;
        const ib = order.get(b[0].toLowerCase()) ?? 100;
        if (ia !== ib) return ia - ib;
        return a[0].localeCompare(b[0], 'tr');
    });
    return entries;
}

/** DB’de spotify_id / spotify_url varken social_links’e yazılmamışsa yan panelde Spotify görünmez; birleştiririz. */
function mergeSpotifyIntoSocialLinks(
    social: Record<string, string> | null | undefined,
    spotifyUrl: string | null | undefined,
    spotifyId: string | null | undefined,
): Record<string, string> {
    const out: Record<string, string> = { ...coerceSocialLinksRecord(social) };
    const hasSpotifyLink = Object.entries(out).some(
        ([k, v]) => k.toLowerCase() === 'spotify' && typeof v === 'string' && v.trim() !== '',
    );
    if (hasSpotifyLink) {
        return out;
    }
    const href =
        (spotifyUrl && spotifyUrl.trim() !== '' ? spotifyUrl.trim() : null) ??
        (spotifyId && spotifyId.trim() !== '' ? `https://open.spotify.com/artist/${spotifyId.trim()}` : null);
    if (href) {
        out.spotify = href;
    }
    return out;
}

function socialLinkTitle(key: string): string {
    const k = key.toLowerCase();
    const map: Record<string, string> = {
        instagram: 'Instagram',
        twitter: 'X',
        x: 'X',
        youtube: 'YouTube',
        spotify: 'Spotify',
        tiktok: 'TikTok',
        facebook: 'Facebook',
    };
    return map[k] ?? key;
}

interface Artist {
    id: number;
    user_id?: number | null;
    view_count?: number;
    /** Bağlı kullanıcının e-postası doğrulanmış, profil sahiplenilmiş. */
    is_verified_profile?: boolean;
    name: string;
    slug: string;
    bio: string | null;
    avatar: string | null;
    genre: string | null;
    website: string | null;
    social_links: Record<string, string> | null;
    manager_info?: Record<string, string> | null;
    public_contact?: Record<string, string> | null;
    spotify_id?: string | null;
    spotify_url?: string | null;
    spotify_genres?: string[] | null;
    spotify_popularity?: number | null;
    spotify_followers?: number | null;
    /** Ayrılmış; profil görseli yalnızca `avatar`. */
    spotify_artist_image_url?: string | null;
    spotify_albums?: SpotifyAlbumPreview[] | null;
    media?: ArtistMediaItem[];
}

interface Props {
    artist: Artist;
    upcomingEvents: Event[];
    pastEvents: Event[];
    latestTracks?: {
        id: string | null;
        name: string;
        spotify_url: string | null;
        preview_url: string | null;
        album_name: string | null;
        album_image: string | null;
        release_date: string | null;
        duration_ms: number | null;
        artists?: string[];
    }[];
    stats: {
        total_events: number;
        upcoming_count: number;
        past_count: number;
        venue_count: number;
    };
    /** TurkiyeAPI ile senkron 81 il adı (şehir filtresi). */
    provinceNames?: string[];
    claimStatus?: string | null;
    artistFavorite?: { canToggle: boolean; isFavorited: boolean };
}

function SpotifyTrackPreview({
    src,
    trackKey,
    playingKey,
    onPlayingChange,
    fallbackOpenUrl,
}: Readonly<{
    src: string;
    trackKey: string;
    playingKey: string | null;
    onPlayingChange: (key: string | null) => void;
    /** Önizleme tarayıcıda çalınamazsa (süresi dolmuş URL, autoplay vb.) yeni sekmede açılır */
    fallbackOpenUrl?: string | null;
}>) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const isPlaying = playingKey === trackKey;

    useEffect(() => {
        const el = audioRef.current;
        if (!el) return;
        if (!isPlaying) {
            el.pause();
        }
    }, [isPlaying]);

    useEffect(() => {
        const el = audioRef.current;
        if (!el) return;
        const onEnded = () => onPlayingChange(null);
        el.addEventListener('ended', onEnded);
        return () => el.removeEventListener('ended', onEnded);
    }, [onPlayingChange]);

    return (
        <>
            <audio ref={audioRef} src={src} preload="metadata" className="sr-only" />
            <button
                type="button"
                onClick={() => {
                    if (isPlaying) {
                        onPlayingChange(null);
                        audioRef.current?.pause();
                    } else {
                        const el = audioRef.current;
                        if (!el) return;
                        void el
                            .play()
                            .then(() => onPlayingChange(trackKey))
                            .catch(() => {
                                onPlayingChange(null);
                                const u = fallbackOpenUrl?.trim();
                                if (u && u !== '#') {
                                    window.open(u, '_blank', 'noopener,noreferrer');
                                }
                            });
                    }
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1ed760] text-black shadow-md transition hover:scale-[1.03] hover:bg-[#1fdf64] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1ed760] active:scale-95"
                aria-label={isPlaying ? 'Önizlemeyi duraklat' : '30 sn önizlemeyi çal'}
                aria-pressed={isPlaying}
            >
                {isPlaying ? <Pause className="h-4 w-4" strokeWidth={2.25} /> : <Play className="h-4 w-4 pl-0.5" strokeWidth={2.25} />}
            </button>
        </>
    );
}

export default function ArtistShow({
    artist,
    upcomingEvents,
    pastEvents,
    latestTracks = [],
    stats,
    provinceNames = [],
    claimStatus,
    artistFavorite = { canToggle: false, isFavorited: false },
}: Readonly<Props>) {
    const page = usePage().props as { auth?: { user?: { id: number } | null } };
    const user = page.auth?.user;
    const [claimMessage, setClaimMessage] = useState('');
    const [claimFirstName, setClaimFirstName] = useState('');
    const [claimLastName, setClaimLastName] = useState('');
    const [claimPhone, setClaimPhone] = useState('');
    const [claimEmail, setClaimEmail] = useState('');
    const [claimLoading, setClaimLoading] = useState(false);
    const [playingTrackKey, setPlayingTrackKey] = useState<string | null>(null);
    const hasEvents = upcomingEvents.length > 0 || pastEvents.length > 0;
    const nextEvent = upcomingEvents[0];
    const cityOptions = useMemo(() => {
        if (provinceNames.length > 0) {
            return ['Tümü', ...provinceNames];
        }
        const set = new Set<string>();
        upcomingEvents.forEach((ev) => {
            if (ev.venue?.city?.name) set.add(ev.venue.city.name);
        });
        return ['Tümü', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'))];
    }, [provinceNames, upcomingEvents]);
    const [selectedCity, setSelectedCity] = useState('Tümü');
    const filteredUpcoming = useMemo(
        () => upcomingEvents.filter((ev) => selectedCity === 'Tümü' || ev.venue?.city?.name === selectedCity),
        [upcomingEvents, selectedCity],
    );
    const pastEventsByMonth = useMemo(() => groupDetailEventsByMonthForDisplay(pastEvents, 'desc'), [pastEvents]);
    const showCityFilter = cityOptions.length > 1;
    const imageSrc = (path: string | null | undefined) => {
        if (!path) return null;
        return path.startsWith('http://') || path.startsWith('https://') ? path : `/storage/${path}`;
    };
    const canClaimArtist = artist.user_id == null;

    const formatTrackDuration = (ms: number | null | undefined) => {
        if (ms == null || ms <= 0) return '—';
        const total = Math.round(ms / 1000);
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const trackArtistLine = (names: string[] | undefined) => {
        if (names && names.length > 0) return names.join(', ');
        return artist.name;
    };

    const spotifySearchHref = (trackName: string) =>
        `https://open.spotify.com/search/${encodeURIComponent(artist.name + ' ' + trackName)}`;

    const { displaySocialLinks, resolvedSocialList } = useMemo(() => {
        const merged = mergeSpotifyIntoSocialLinks(artist.social_links, artist.spotify_url, artist.spotify_id);
        const list = sortSocialEntries(merged).map(([key, url]) => ({
            key,
            href: resolveSocialHref(key, url),
            label: socialLinkTitle(key),
        }));
        return { displaySocialLinks: merged, resolvedSocialList: list };
    }, [artist.social_links, artist.spotify_url, artist.spotify_id]);

    const spotifySearchPills: readonly string[] = ['Tümü'];

    /** Yalnızca veritabanındaki profil görseli; iTunes/Spotify önizlemesi ana fotoğrafı doldurmaz (avatar temizlendiğinde boş kalır). */
    const profilePhoto = imageSrc(artist.avatar);

    const submitClaim = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || claimLoading) return;
        setClaimLoading(true);
        router.post(route('artists.claim', artist.slug), {
            first_name: claimFirstName,
            last_name: claimLastName,
            phone: claimPhone,
            email: claimEmail,
            message: claimMessage,
        }, {
            preserveScroll: true,
            onFinish: () => setClaimLoading(false),
        });
    };

    useEffect(() => {
        const hash = window.location.hash.replace(/^#/, '');
        const goTakvim = ['takvim', 'haftalik-etkinlikler', 'yaklasan-etkinlikler'].includes(hash);
        if (!goTakvim) return;
        const t = window.setTimeout(() => {
            document.getElementById('takvim')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => window.clearTimeout(t);
    }, [artist.slug]);

    const avatarUrl = profilePhoto;
    const seoKeywordLead = `${artist.name} konserleri, performansları ve etkinlikleri`;
    const bioPlain = metaDescriptionFromContent(artist.bio, '');
    const seoGenreSuffix = artist.genre ? ` Tür: ${artist.genre}.` : '';
    const seoDescFallback = `${seoKeywordLead}. Yaklaşan ve geçmiş konserler, canlı performanslar ve etkinlik takvimi Sahnebul’da.${seoGenreSuffix}`;
    const artistDesc = truncateMetaDescription(
        bioPlain ? `${seoKeywordLead}. ${bioPlain}` : seoDescFallback,
    );

    return (
        <AppLayout>
            <SeoHead
                title={`${artist.name} Konserleri, Performansları ve Etkinlikleri`}
                description={artistDesc}
                image={avatarUrl}
            />

            <div className="min-h-screen">
                <div className="mx-auto max-w-7xl px-0 pt-6 sm:px-4 sm:pt-8 lg:px-8">
                    <Link
                        href={route('artists.index')}
                        className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-amber-400"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Tüm Sanatçılar
                    </Link>
                </div>

                <div className="relative mx-auto mt-4 max-w-7xl px-0 sm:mt-6 sm:px-4 lg:px-8">
                    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
                        {/* Sol: Fotoğraf + sosyal */}
                        <div className="shrink-0 lg:w-96">
                            <div className="sticky top-24">
                                <div className="relative overflow-hidden rounded-2xl">
                                    <div className="aspect-square overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-lg dark:border-white/[0.06] dark:bg-zinc-900 dark:shadow-2xl">
                                        {profilePhoto ? (
                                            <img
                                                src={profilePhoto ?? ''}
                                                alt={artist.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                                                <span className="text-8xl opacity-40">🎤</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col gap-3">
                                    {artist.website && (
                                        <a
                                            href={resolveWebsiteHref(artist.website)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-50 py-3 font-medium text-amber-900 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            Web Sitesi
                                        </a>
                                    )}
                                    {resolvedSocialList.length > 0 && (
                                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/60">
                                            <p className="text-center text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400/90">
                                                Sosyal medya
                                            </p>
                                            <ul className="mt-3 space-y-2">
                                                {resolvedSocialList.map(({ key, href, label }) => (
                                                    <li key={key}>
                                                        <a
                                                            href={href}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            aria-label={`${label} — yeni sekmede aç`}
                                                            className="flex min-h-11 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:border-amber-400/80 hover:bg-amber-50/80 dark:border-white/10 dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:border-amber-500/40 dark:hover:bg-zinc-800"
                                                        >
                                                            <span
                                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${socialBadgeClass(key)}`}
                                                                aria-hidden
                                                            >
                                                                <SocialPlatformIcon platform={key} className="h-[18px] w-[18px]" />
                                                            </span>
                                                            <span className="min-w-0 flex-1 truncate">{label}</span>
                                                            <span className="shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden>
                                                                ↗
                                                            </span>
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {stringMapHasContent(artist.public_contact as Record<string, unknown>) && (
                                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left dark:border-white/10 dark:bg-zinc-900/60">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400/90">
                                                İletişim
                                            </p>
                                            <ul className="mt-3 space-y-2 text-sm text-zinc-800 dark:text-zinc-300">
                                                {artist.public_contact?.email && (
                                                    <li>
                                                        <span className="text-zinc-600 dark:text-zinc-500">E-posta: </span>
                                                        <a
                                                            href={`mailto:${artist.public_contact.email}`}
                                                            className="text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                                                        >
                                                            {artist.public_contact.email}
                                                        </a>
                                                    </li>
                                                )}
                                                {artist.public_contact?.phone && (
                                                    <li>
                                                        <span className="text-zinc-600 dark:text-zinc-500">Telefon: </span>
                                                        <a
                                                            href={`tel:${artist.public_contact.phone.replace(/\s+/g, '')}`}
                                                            className="text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                                                        >
                                                            {artist.public_contact.phone}
                                                        </a>
                                                    </li>
                                                )}
                                                {artist.public_contact?.note && (
                                                    <li className="whitespace-pre-line text-zinc-700 dark:text-zinc-400">
                                                        {artist.public_contact.note}
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                    {stringMapHasContent(artist.manager_info as Record<string, unknown>) && (
                                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left dark:border-white/10 dark:bg-zinc-900/60">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400/90">
                                                Menajer
                                            </p>
                                            <ul className="mt-3 space-y-1.5 text-sm text-zinc-800 dark:text-zinc-300">
                                                {artist.manager_info?.name && (
                                                    <li>
                                                        <span className="text-zinc-600 dark:text-zinc-500">Ad: </span>
                                                        {artist.manager_info.name}
                                                    </li>
                                                )}
                                                {artist.manager_info?.company && (
                                                    <li>
                                                        <span className="text-zinc-600 dark:text-zinc-500">Ajans / şirket: </span>
                                                        {artist.manager_info.company}
                                                    </li>
                                                )}
                                                {artist.manager_info?.phone && (
                                                    <li>
                                                        <span className="text-zinc-600 dark:text-zinc-500">Telefon: </span>
                                                        <a
                                                            href={`tel:${artist.manager_info.phone.replace(/\s+/g, '')}`}
                                                            className="text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                                                        >
                                                            {artist.manager_info.phone}
                                                        </a>
                                                    </li>
                                                )}
                                                {artist.manager_info?.email && (
                                                    <li>
                                                        <span className="text-zinc-600 dark:text-zinc-500">E-posta: </span>
                                                        <a
                                                            href={`mailto:${artist.manager_info.email}`}
                                                            className="text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                                                        >
                                                            {artist.manager_info.email}
                                                        </a>
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {canClaimArtist && (
                                    <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                                        <p className="font-semibold text-amber-700 dark:text-amber-300">Bu profil size mi ait?</p>
                                        <p className="mt-1 text-sm text-amber-700/80 dark:text-amber-200/90">Google Maps işletme sahiplenme akışı gibi, bu sanatçı profilini hesabınıza bağlamak için talep oluşturabilirsiniz.</p>
                                        {user ? (
                                            <form onSubmit={submitClaim} className="mt-3 space-y-2">
                                                {claimStatus && (
                                                    <p className="text-xs text-amber-600 dark:text-amber-300">
                                                        Mevcut talep: {claimRequestStatusTr(claimStatus)}
                                                    </p>
                                                )}
                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    <input value={claimFirstName} onChange={(e) => setClaimFirstName(e.target.value)} className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-amber-500/20 dark:bg-zinc-900 dark:text-white" placeholder="Ad" required />
                                                    <input value={claimLastName} onChange={(e) => setClaimLastName(e.target.value)} className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-amber-500/20 dark:bg-zinc-900 dark:text-white" placeholder="Soyad" required />
                                                </div>
                                                <input value={claimPhone} onChange={(e) => setClaimPhone(e.target.value)} className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-amber-500/20 dark:bg-zinc-900 dark:text-white" placeholder="Telefon" required />
                                                <input type="email" value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-amber-500/20 dark:bg-zinc-900 dark:text-white" placeholder="E-posta" required />
                                                <textarea value={claimMessage} onChange={(e) => setClaimMessage(e.target.value)} rows={3} className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-amber-500/20 dark:bg-zinc-900 dark:text-white" placeholder="Kısa doğrulama notu (opsiyonel)" />
                                                <button type="submit" disabled={claimLoading} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60">Sahiplenme Talebi Gönder</button>
                                            </form>
                                        ) : (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Link
                                                    href={route('register', { claim_artist: artist.slug })}
                                                    className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950"
                                                >
                                                    Üye Ol
                                                </Link>
                                                <Link
                                                    href={route('login', {
                                                        redirect: `/sanatcilar/${artist.slug}`,
                                                        claim_artist: artist.slug,
                                                    })}
                                                    className="rounded-lg border border-amber-600/30 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-500/40 dark:text-amber-300"
                                                >
                                                    Giriş Yap
                                                </Link>
                                                <Link
                                                    href={route('register', { uyelik: 'sanatci' })}
                                                    className="rounded-lg border border-amber-400 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
                                                >
                                                    Sanatçı kaydı
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sağ: Bio + Etkinlikler */}
                        <div className="min-w-0 flex-1">
                            <span className="mb-3 inline-block rounded-full bg-amber-500/20 px-4 py-1.5 text-sm font-medium text-amber-400">
                                {artist.genre ?? 'Sanatçı'}
                            </span>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="font-display text-4xl font-bold text-zinc-900 dark:text-white sm:text-5xl lg:text-6xl">
                                    {artist.name}
                                </h1>
                                {artist.is_verified_profile && <VerifiedArtistProfileBadge size="md" className="self-center" />}
                                {artistFavorite.canToggle ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.post(route('user.favorites.artists.toggle', artist.id), {}, { preserveScroll: true })
                                        }
                                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                            artistFavorite.isFavorited
                                                ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                                                : 'border border-zinc-300 bg-white text-zinc-800 hover:border-amber-400 dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-amber-500/40'
                                        }`}
                                    >
                                        {artistFavorite.isFavorited ? '♥ Favorilerde' : 'Favorilere ekle'}
                                    </button>
                                ) : !user ? (
                                    <Link
                                        href={route('login', { redirect: `/sanatcilar/${artist.slug}` })}
                                        className="rounded-full border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                                    >
                                        Favoriler için giriş
                                    </Link>
                                ) : null}
                            </div>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                {(artist.view_count ?? 0).toLocaleString('tr-TR')} görüntülenme
                            </p>

                            {resolvedSocialList.length > 0 && (
                                <div className="mt-4">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                        Sosyal medya
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {resolvedSocialList.map(({ key, href, label }) => (
                                            <a
                                                key={`hero-${key}`}
                                                href={href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={`${label} — yeni sekmede aç`}
                                                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-amber-400 hover:text-amber-900 dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:border-amber-500/50 dark:hover:text-amber-300"
                                            >
                                                <span
                                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${socialBadgeClass(key)}`}
                                                    aria-hidden
                                                >
                                                    <SocialPlatformIcon platform={key} className="h-4 w-4" />
                                                </span>
                                                {label}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-white/10 dark:bg-zinc-900/50">
                                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500">Toplam Konser</p>
                                    <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">{stats.total_events}</p>
                                </div>
                                <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-white/10 dark:bg-zinc-900/50">
                                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500">Yaklaşan</p>
                                    <p className="mt-1 text-xl font-semibold text-amber-600 dark:text-amber-400">{stats.upcoming_count}</p>
                                </div>
                                <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-white/10 dark:bg-zinc-900/50">
                                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500">Geçmiş</p>
                                    <p className="mt-1 text-xl font-semibold text-zinc-700 dark:text-zinc-200">{stats.past_count}</p>
                                </div>
                                <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-white/10 dark:bg-zinc-900/50">
                                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500">Mekan sayısı</p>
                                    <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">{stats.venue_count}</p>
                                </div>
                            </div>

                            {nextEvent && (
                                <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">Sıradaki Konser</p>
                                    <p className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-white">{nextEvent.title}</p>
                                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{nextEvent.venue.name}</p>
                                    <p className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-200">{formatTurkishDateTime(nextEvent.start_date)}</p>
                                </div>
                            )}

                            <div className="mt-10 space-y-12">
                                {upcomingEvents.length > 0 && (
                                    <div>
                                        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                                            <div className="min-w-0">
                                                <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white sm:text-xl">
                                                    Etkinlikleri Listele
                                                </h2>
                                                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{artist.name} — yaklaşan etkinlikler (ay ay)</p>
                                            </div>
                                            {showCityFilter && (
                                                <div className="flex items-center gap-2">
                                                    <label
                                                        htmlFor="artist-upcoming-city"
                                                        className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400"
                                                    >
                                                        Şehir
                                                    </label>
                                                    <select
                                                        id="artist-upcoming-city"
                                                        value={selectedCity}
                                                        onChange={(e) => setSelectedCity(e.target.value)}
                                                        className="max-w-[min(100vw-6rem,14rem)] rounded-md border border-zinc-300 bg-white py-1.5 pr-8 pl-2.5 text-sm text-zinc-900 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100"
                                                    >
                                                        {cityOptions.map((city) => (
                                                            <option key={city} value={city}>
                                                                {city}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        {filteredUpcoming.length > 0 ? (
                                            <DetailEventList
                                                events={filteredUpcoming}
                                                imageSrc={imageSrc}
                                                context="artist"
                                                showHeading={false}
                                            />
                                        ) : (
                                            <p className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-400">
                                                Seçilen şehir için yaklaşan etkinlik yok. Farklı bir şehir seçin veya &quot;Tümü&quot;ne dönün.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {pastEvents.length > 0 && (
                                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-8 dark:border-white/[0.06] dark:bg-zinc-900/30">
                                        <h2 className="font-display mb-2 text-xl font-bold text-zinc-900 dark:text-white">
                                            Geçmiş Etkinlikler
                                        </h2>
                                        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-500">
                                            {pastEvents.length} geçmiş performans
                                        </p>
                                        <div className="space-y-8">
                                            {pastEventsByMonth.map(({ key, heading, events: monthPast }) => (
                                                <div key={key}>
                                                    <h3 className="border-b border-zinc-300 pb-2 font-display text-sm font-semibold text-zinc-700 dark:border-white/10 dark:text-zinc-300">
                                                        {heading}
                                                    </h3>
                                                    <div className="mt-4 space-y-4">
                                                        {monthPast.map((event) => (
                                                            <Link
                                                                key={event.id}
                                                                href={route('events.show', eventShowParam(event))}
                                                                className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-amber-300/80 hover:bg-amber-50/50 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.04] dark:bg-zinc-800/30 dark:hover:border-white/10 dark:hover:bg-zinc-800/50"
                                                            >
                                                                <div>
                                                                    <p className="font-medium text-zinc-900 dark:text-zinc-200">{event.title}</p>
                                                                    <p className="text-sm text-zinc-600 dark:text-zinc-500">{event.venue?.name ?? ''}</p>
                                                                </div>
                                                                <span className="text-sm text-zinc-500 dark:text-zinc-500">
                                                                    {formatTurkishDateTime(event.start_date)}
                                                                </span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!hasEvents && (
                                    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-16 text-center dark:border-white/10 dark:bg-zinc-900/30">
                                        <span className="mb-4 block text-6xl opacity-40">🎭</span>
                                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-300">
                                            Henüz etkinlik bilgisi yok
                                        </h3>
                                        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-500">
                                            {artist.name} için yaklaşan veya geçmiş etkinlik bulunmuyor.
                                        </p>
                                        <Link
                                            href={route('artists.index')}
                                            className="mt-6 inline-block rounded-xl bg-amber-500 px-6 py-2.5 font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400"
                                        >
                                            Diğer sanatçıları keşfet
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {artist.bio?.trim() && (
                                <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-8 dark:border-white/[0.06] dark:bg-zinc-900/50">
                                    <h2 className="font-display mb-4 text-xl font-bold text-zinc-900 dark:text-white">Hakkında</h2>
                                    <RichOrPlainContent
                                        content={artist.bio}
                                        richClassName="prose prose-zinc max-w-none dark:prose-invert prose-p:leading-relaxed prose-p:text-zinc-600 dark:prose-p:text-zinc-400 prose-headings:font-semibold prose-a:text-amber-600 dark:prose-a:text-amber-400"
                                        plainParagraphClassName="leading-relaxed text-zinc-600 dark:text-zinc-400"
                                    />
                                </div>
                            )}

                            {artist.media && artist.media.length > 0 && (
                                <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/[0.06] dark:bg-zinc-900/50">
                                    <h2 className="font-display mb-4 text-xl font-bold text-zinc-900 dark:text-white">Galeri</h2>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                        {artist.media.map((m) => (
                                            <figure key={m.id} className="overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">
                                                <img
                                                    src={imageSrc(m.path) ?? ''}
                                                    alt={m.title ?? artist.name}
                                                    className="aspect-square w-full object-cover"
                                                />
                                                {m.title && (
                                                    <figcaption className="truncate px-2 py-1.5 text-center text-xs text-zinc-500 dark:text-zinc-400">
                                                        {m.title}
                                                    </figcaption>
                                                )}
                                            </figure>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 rounded-2xl border border-zinc-800 bg-[#121212] p-6 shadow-xl sm:p-8">
                                <div className="mb-2">
                                    <h2 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">Spotify</h2>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        Popüler şarkılar; önizlemesi olan parçalar burada dinlenebilir (30 sn). Tam çalma Spotify uygulamasında.
                                    </p>
                                </div>

                                {(artist.spotify_genres?.length ||
                                    artist.spotify_followers != null ||
                                    artist.spotify_popularity != null) && (
                                    <div className="mb-6 mt-4 border-b border-white/[0.08] pb-6">
                                        <div className="flex flex-col gap-4">
                                            <div className="min-w-0 flex-1 space-y-3">
                                                {artist.spotify_genres && artist.spotify_genres.length > 0 && (
                                                    <div>
                                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                            Spotify türleri
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {artist.spotify_genres.map((g) => (
                                                                <span
                                                                    key={g}
                                                                    className="rounded-full bg-[#ffffff12] px-3 py-1 text-xs text-zinc-200"
                                                                >
                                                                    {g.replace(/-/g, ' ')}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                                                    {artist.spotify_followers != null && artist.spotify_followers > 0 && (
                                                        <span>
                                                            Takipçi:{' '}
                                                            <strong className="text-zinc-200">
                                                                {artist.spotify_followers.toLocaleString('tr-TR')}
                                                            </strong>
                                                        </span>
                                                    )}
                                                    {artist.spotify_popularity != null && (
                                                        <span>
                                                            Popülerlik:{' '}
                                                            <strong className="text-zinc-200">{artist.spotify_popularity}/100</strong>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {artist.spotify_id && (
                                    <div className="relative z-[1] mb-8 isolate">
                                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                                            Çalar
                                        </h3>
                                        <iframe
                                            title={`${artist.name} — Spotify`}
                                            src={`https://open.spotify.com/embed/artist/${artist.spotify_id}?utm_source=generator&theme=0`}
                                            className="h-[380px] w-full max-w-full rounded-xl border-0"
                                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
                                            allowFullScreen
                                            loading="eager"
                                            referrerPolicy="strict-origin-when-cross-origin"
                                        />
                                        <p className="mt-2 text-xs text-zinc-500">
                                            Gömülü çalar bazı tarayıcılarda (reklam engelleyici, gizlilik modu) yanıt vermeyebilir; tam dinleme için sayfanın altındaki Spotify&apos;da aç bağlantısını kullanın.
                                        </p>
                                    </div>
                                )}

                                {latestTracks.length > 0 ? (
                                    <>
                                        <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                                            Popüler şarkılar
                                        </h3>
                                        <div
                                            role="list"
                                            className="flex gap-3 overflow-x-auto pb-3 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] scroll-pl-1 scroll-pr-4 snap-x snap-mandatory sm:gap-4 [&::-webkit-scrollbar]:hidden"
                                        >
                                            {latestTracks.map((track) => {
                                                const href = track.spotify_url ?? spotifySearchHref(track.name);
                                                const rowKey = String(track.id ?? track.name);
                                                const coverUrl = track.album_image
                                                    ? track.album_image.startsWith('http')
                                                        ? track.album_image
                                                        : imageSrc(track.album_image)
                                                    : null;
                                                return (
                                                    <div
                                                        key={rowKey}
                                                        role="listitem"
                                                        className="w-[min(100vw-2.5rem,22rem)] shrink-0 snap-start sm:w-[22rem]"
                                                    >
                                                        <div className="group grid grid-cols-[2.75rem_1fr_auto_auto] items-center gap-2 rounded-xl border border-white/[0.06] bg-zinc-900/35 py-2.5 pl-2 pr-2 transition-colors hover:border-white/10 hover:bg-white/[0.04] sm:grid-cols-[3.5rem_1fr_2.75rem_auto] sm:gap-3 sm:py-3 sm:pl-3 sm:pr-3 md:gap-4">
                                                            <a
                                                                href={href}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="relative aspect-square w-11 shrink-0 overflow-hidden rounded-md bg-zinc-800 ring-1 ring-white/10 sm:w-14"
                                                                aria-label={`${track.name} — Spotify’da aç`}
                                                            >
                                                                {coverUrl ? (
                                                                    <img src={coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                                                                ) : (
                                                                    <span className="flex h-full w-full items-center justify-center">
                                                                        <Music2 className="h-6 w-6 text-zinc-500 sm:h-7 sm:w-7" strokeWidth={1.75} aria-hidden />
                                                                    </span>
                                                                )}
                                                            </a>
                                                            <a
                                                                href={href}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="min-w-0"
                                                            >
                                                                <p className="truncate font-semibold text-white group-hover:text-[#1ed760] transition-colors">
                                                                    {track.name}
                                                                </p>
                                                                <p className="truncate text-sm text-zinc-400">{trackArtistLine(track.artists)}</p>
                                                            </a>
                                                            <span className="tabular-nums text-sm text-zinc-500">
                                                                {formatTrackDuration(track.duration_ms)}
                                                            </span>
                                                            <div className="flex justify-end">
                                                                {track.preview_url ? (
                                                                    <SpotifyTrackPreview
                                                                        src={track.preview_url}
                                                                        trackKey={rowKey}
                                                                        playingKey={playingTrackKey}
                                                                        onPlayingChange={setPlayingTrackKey}
                                                                        fallbackOpenUrl={href}
                                                                    />
                                                                ) : (
                                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-800/80 text-[10px] font-medium text-zinc-500" title="Önizleme yok">
                                                                        —
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-zinc-400">
                                        Bu sanatçı için önizlemeli şarkı listesi bulunamadı (isim eşleşmesi veya katalog boş olabilir).
                                    </p>
                                )}

                                {artist.spotify_albums && artist.spotify_albums.length > 0 && (
                                    <div className="mt-8">
                                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                                            Albümler &amp; single&apos;lar
                                        </h3>
                                        <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                            {artist.spotify_albums.map((al) => (
                                                <a
                                                    key={al.id}
                                                    href={al.url ?? '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-36 shrink-0 rounded-lg bg-[#181818] p-2 transition hover:bg-[#282828] sm:w-40"
                                                >
                                                    <div className="relative aspect-square w-full overflow-hidden rounded bg-zinc-800 ring-1 ring-white/10">
                                                        {al.image ? (
                                                            <img
                                                                src={al.image}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                                loading="lazy"
                                                                decoding="async"
                                                            />
                                                        ) : (
                                                            <span className="flex h-full w-full items-center justify-center">
                                                                <Music2 className="h-8 w-8 text-zinc-600" strokeWidth={1.75} aria-hidden />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-2 line-clamp-2 text-xs font-medium text-white">{al.name}</p>
                                                    {al.release_date && (
                                                        <p className="mt-0.5 text-[10px] text-zinc-500">{al.release_date}</p>
                                                    )}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-8 border-t border-white/[0.08] pt-6">
                                    <a
                                        href={
                                            artist.spotify_url ??
                                            (displaySocialLinks.spotify
                                                ? resolveSocialHref('spotify', displaySocialLinks.spotify)
                                                : null) ??
                                            (artist.spotify_id
                                                ? `https://open.spotify.com/artist/${artist.spotify_id}`
                                                : `https://open.spotify.com/search/${encodeURIComponent(artist.name)}`)
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#1ed760] transition hover:text-[#1fdf64]"
                                    >
                                        Spotify&apos;da aç →
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
