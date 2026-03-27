import { AdSlot } from '@/Components/AdSlot';
import { formatVenueLocationLine } from '@/lib/formatVenueLocationLine';
import EventCarousel from '@/Components/EventCarousel';
import PublicEventTicketCard, { type PublicEventTicketCardEvent } from '@/Components/PublicEventTicketCard';
import SeoHead from '@/Components/SeoHead';
import ThisWeekEventsBadge from '@/Components/ThisWeekEventsBadge';
import AppLayout from '@/Layouts/AppLayout';
import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Star } from 'lucide-react';

interface Artist {
    id: number;
    name: string;
    slug: string;
    genre: string | null;
    avatar: string | null;
    view_count?: number;
}

interface HomeEvent {
    id: number;
    slug: string;
    title: string;
    start_date: string;
    cover_image?: string | null;
    listing_image?: string | null;
    venue: {
        id: number;
        name: string;
        slug: string;
        cover_image?: string | null;
        category?: { name: string } | null;
        city?: { name: string } | null;
    };
    artists: { id: number; name: string; slug: string; avatar?: string | null }[];
}

interface NearbyEvent extends PublicEventTicketCardEvent {
    distance_km?: number;
}

/** /mekanlar/yakinindakiler yanıtı */
interface NearbyVenue {
    id: number;
    name: string;
    slug: string;
    cover_image: string | null;
    address: string;
    distance_km?: number;
    is_featured?: boolean | number | null;
    city?: { name: string } | null;
    district?: { name: string } | null;
    category?: { name: string } | null;
}

interface VenueListItem {
    id: number;
    name: string;
    slug: string;
    cover_image: string | null;
    address: string;
    is_featured?: boolean;
    rating_avg?: number;
    review_count?: number;
    weekly_events_count?: number;
    monthly_events_count?: number;
    city?: { name: string } | null;
    district?: { name: string } | null;
    category?: { name: string } | null;
}

interface PaginatorLink {
    url: string | null;
    label: string;
    active: boolean;
}

const DEFAULT_HOME_HERO_IMAGE =
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2400&auto=format&fit=crop';

interface Props {
    isVenuesPage?: boolean;
    /** Süper yönetici ayarlarından; yalnızca ana sayfa (/) için dolu gelir. */
    homeHeroImageUrl?: string | null;
    canAddVenue?: boolean;
    venues?: {
        data: VenueListItem[];
        links?: PaginatorLink[];
        total?: number;
        from?: number | null;
        to?: number | null;
        last_page?: number;
    };
    cities?: Array<{ id: number; name: string; slug: string }>;
    categories?: Array<{ id: number; name: string; slug: string }>;
    filters?: { city?: string; category?: string; search?: string };
    popularArtists?: Artist[];
    todayEvents?: HomeEvent[];
    upcomingWeekEvents?: HomeEvent[];
}

export default function VenuesIndex({
    isVenuesPage = false,
    homeHeroImageUrl = null,
    canAddVenue = false,
    venues,
    cities = [],
    categories = [],
    filters = {},
    popularArtists = [],
    todayEvents = [],
    upcomingWeekEvents = [],
}: Readonly<Props>) {
    const page = usePage();
    const { auth, seo } = page.props as {
        auth?: { user?: { id: number } | null };
        seo?: { siteName: string; appUrl: string };
    };
    const isLoggedIn = Boolean(auth?.user);
    const [nearbyEvents, setNearbyEvents] = useState<NearbyEvent[]>([]);
    const [nearbyVenues, setNearbyVenues] = useState<NearbyVenue[]>([]);
    const [locationChecked, setLocationChecked] = useState(false);
    const [geoDenied, setGeoDenied] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');
    const [citySlug, setCitySlug] = useState(filters.city ?? '');
    const [categorySlug, setCategorySlug] = useState(filters.category ?? '');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const nearbyVenuesScrollRef = useRef<HTMLUListElement>(null);
    const nearbyEventsScrollRef = useRef<HTMLDivElement>(null);

    const scrollNearbyEventsBy = useCallback((dir: -1 | 1) => {
        const el = nearbyEventsScrollRef.current;
        if (!el) {
            return;
        }
        const card = el.querySelector<HTMLElement>('[data-nearby-event-card]');
        const w = card?.offsetWidth ?? 300;
        const gap = globalThis.matchMedia('(min-width: 640px)').matches ? 16 : 8;
        el.scrollBy({ left: dir * (w + gap), behavior: 'smooth' });
    }, []);

    const scrollNearbyVenuesBy = useCallback((dir: -1 | 1) => {
        const el = nearbyVenuesScrollRef.current;
        if (!el) {
            return;
        }
        const card = el.querySelector<HTMLElement>('[data-nearby-venue-card]');
        const w = card?.offsetWidth ?? 300;
        const gap = 16;
        el.scrollBy({ left: dir * (w + gap), behavior: 'smooth' });
    }, []);

    const imageSrc = (path: string | null) => {
        if (!path) return null;
        return path.startsWith('http://') || path.startsWith('https://') ? path : `/storage/${path}`;
    };

    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationChecked(true);
            setGeoDenied(true);
            setNearbyEvents([]);
            setNearbyVenues([]);
            return;
        }

        setLocationChecked(false);
        setGeoDenied(false);

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                try {
                    if (isVenuesPage) {
                        const res = await axios.get(route('venues.nearby'), {
                            params: { lat, lng, limit: 16 },
                        });
                        setNearbyVenues(Array.isArray(res.data?.venues) ? res.data.venues : []);
                        setNearbyEvents([]);
                    } else {
                        const res = await axios.get(route('events.nearby'), {
                            params: { lat, lng, limit: 8 },
                        });
                        setNearbyEvents(Array.isArray(res.data?.events) ? res.data.events : []);
                        setNearbyVenues([]);
                    }
                    setGeoDenied(false);
                } catch {
                    setNearbyEvents([]);
                    setNearbyVenues([]);
                } finally {
                    setLocationChecked(true);
                }
            },
            () => {
                setNearbyEvents([]);
                setNearbyVenues([]);
                setGeoDenied(true);
                setLocationChecked(true);
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
        );
    }, [isVenuesPage]);

    useEffect(() => {
        setCitySlug(filters.city ?? '');
        setCategorySlug(filters.category ?? '');
    }, [filters.city, filters.category]);

    useEffect(() => {
        if (searchInputRef.current === document.activeElement) {
            return;
        }
        setSearch(filters.search ?? '');
    }, [filters.search]);

    const venueFilterParams = () => {
        const p: Record<string, string> = {};
        if (search.trim()) p.search = search.trim();
        if (citySlug) p.city = citySlug;
        if (categorySlug) p.category = categorySlug;
        return p;
    };

    const handleVenueFilterSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        router.get(route('venues.index'), venueFilterParams(), { preserveState: true });
    };

    useEffect(() => {
        if (!isVenuesPage) return;

        const timer = setTimeout(() => {
            const cur = filters.search ?? '';
            const curCity = filters.city ?? '';
            const curCat = filters.category ?? '';
            if (search === cur && citySlug === curCity && categorySlug === curCat) {
                return;
            }
            router.get(route('venues.index'), venueFilterParams(), { preserveState: true, replace: true });
        }, 280);

        return () => clearTimeout(timer);
    }, [search, citySlug, categorySlug, filters.search, filters.city, filters.category, isVenuesPage]);

    const siteName = seo?.siteName ?? 'Sahnebul';
    const appUrl = seo?.appUrl ?? '';
    const defaultDesc =
        (page.props as { seo?: { defaultDescription?: string } }).seo?.defaultDescription ??
        'Sahnebul ile Türkiye’deki konser mekanlarını, etkinlikleri ve sanatçıları keşfedin; ücretsiz mekân ve etkinlik yönetimi.';
    const venuesListDesc =
        'Türkiye’nin konser ve etkinlik mekanlarını keşfedin; şehir, kategori ve yaklaşan etkinliklere göz atın. Mekan detayları, yorumlar ve rezervasyon Sahnebul’da.';
    const homeJsonLd =
        appUrl !== ''
            ? {
                  '@context': 'https://schema.org',
                  '@type': 'WebSite',
                  name: siteName,
                  url: `${appUrl.replace(/\/$/, '')}/`,
                  potentialAction: {
                      '@type': 'SearchAction',
                      target: `${appUrl.replace(/\/$/, '')}/mekanlar?search={search_term_string}`,
                      'query-input': 'required name=search_term_string',
                  },
              }
            : null;

    return (
        <AppLayout>
            <SeoHead
                title={isVenuesPage ? 'Mekanlar - Sahnebul' : 'Sahnebul — Konser, etkinlik ve mekan keşfi'}
                description={isVenuesPage ? venuesListDesc : defaultDesc}
                jsonLd={isVenuesPage ? null : homeJsonLd}
            />

            {/* Hero Section — tam viewport genişliği (görsel: Admin → Ayarlar → Ana sayfa banner) */}
            <section className="hero-full-bleed relative min-h-[min(56vh,32rem)] overflow-hidden">
                <img
                    src={homeHeroImageUrl?.trim() ? homeHeroImageUrl.trim() : DEFAULT_HOME_HERO_IMAGE}
                    alt="Konser mekanı"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-zinc-900/60" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-900/35 to-transparent" />
                <div className="relative mx-auto max-w-7xl px-3 py-16 sm:px-5 sm:py-20 lg:px-8 lg:py-28">
                    <div className="max-w-3xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-amber-400/70">
                            Türkiye&apos;nin Etkinlik Mekanları
                        </p>
                        <h1 className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                            Mekanınızı
                            {' '}
                            <span className="mt-2 block bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                                keşfedin
                            </span>
                        </h1>
                        <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
                            Konser alanları, barlar, açık hava mekanları ve daha fazlası. En iyi mekanlar tek bir platformda.
                        </p>
                    </div>
                </div>
            </section>

            <AdSlot slotKey="home_below_hero" />

            {/* Popular Artists */}
            {!isVenuesPage && popularArtists.length > 0 && (
                <section className="mx-auto max-w-7xl px-0 py-12 sm:px-4 sm:py-16 lg:px-8">
                    <div className="mb-10 flex items-end justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400/70">Trend</p>
                            <h2 className="font-display mt-1 text-2xl font-bold text-zinc-900 dark:text-white">En çok bakılan sanatçılar</h2>
                        </div>
                        <Link href={route('artists.index')} className="hidden text-sm font-medium text-amber-700 transition hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 sm:block">
                            Tümünü gör →
                        </Link>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {popularArtists.map((artist) => (
                            <Link
                                key={artist.id}
                                href={route('artists.show', artist.slug)}
                                className="group flex min-w-[140px] shrink-0 flex-col items-center transition hover:-translate-y-0.5"
                            >
                                <div className="relative h-36 w-36 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 transition group-hover:border-amber-400 dark:border-white/[0.06] dark:bg-zinc-800/80 dark:group-hover:border-amber-500/20">
                                    {artist.avatar ? (
                                        <img src={imageSrc(artist.avatar) ?? ''} alt={artist.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <span className="text-5xl opacity-50">🎤</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent dark:from-zinc-900/90" />
                                </div>
                                <p className="mt-3 text-center font-semibold text-zinc-900 group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-400">{artist.name}</p>
                                {artist.genre && <p className="text-xs text-zinc-600 dark:text-zinc-500">{artist.genre}</p>}
                                <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-500">{artist.view_count ?? 0} görüntülenme</p>
                            </Link>
                        ))}
                    </div>
                    <Link href={route('artists.index')} className="mt-6 block text-center text-sm font-medium text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 sm:hidden">
                        Tüm sanatçılar →
                    </Link>
                </section>
            )}

            {isVenuesPage && (
                <>
                    <section className="relative z-10 mx-auto max-w-7xl -mt-8 px-0 sm:px-4 lg:px-8">
                        <form
                            onSubmit={handleVenueFilterSubmit}
                            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl lg:p-6 dark:border-white/[0.06] dark:bg-zinc-900/90 dark:shadow-black/20"
                        >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-5">
                                <div className="flex-1">
                                    <label htmlFor="venue-search" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-500">
                                        Mekan ara
                                    </label>
                                    <input
                                        ref={searchInputRef}
                                        id="venue-search"
                                        type="search"
                                        name="search"
                                        placeholder="Mekan adı ile ara…"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        autoComplete="off"
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 placeholder-zinc-500 transition focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/15 dark:border-white/[0.08] dark:bg-zinc-800/60 dark:text-white"
                                    />
                                </div>
                                <div className="min-w-[200px]">
                                    <label htmlFor="venue-city" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-500">
                                        Şehir
                                    </label>
                                    <select
                                        id="venue-city"
                                        name="city"
                                        value={citySlug}
                                        onChange={(e) => setCitySlug(e.target.value)}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 transition focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/15 dark:border-white/[0.08] dark:bg-zinc-800/60 dark:text-white"
                                    >
                                        <option value="">Tüm şehirler</option>
                                        {cities.map((c) => (
                                            <option key={c.id} value={c.slug}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="min-w-[200px]">
                                    <label htmlFor="venue-category" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-500">
                                        Kategori
                                    </label>
                                    <select
                                        id="venue-category"
                                        name="category"
                                        value={categorySlug}
                                        onChange={(e) => setCategorySlug(e.target.value)}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 transition focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/15 dark:border-white/[0.08] dark:bg-zinc-800/60 dark:text-white"
                                    >
                                        <option value="">Tüm kategoriler</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.slug}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </form>
                    </section>

                    <section className="mx-auto max-w-7xl px-0 pt-6 sm:px-4 lg:px-8" aria-live="polite">
                        {!locationChecked ? (
                            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/50 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/25 dark:text-amber-50">
                                <span
                                    className="inline-flex h-5 w-5 shrink-0 animate-pulse rounded-full bg-amber-500"
                                    aria-hidden
                                />
                                <span>
                                    Konumunuza göre yakın mekânlar hazırlanıyor. Tarayıcı konum izni isteyebilir; izin verirseniz
                                    size en yakın mekânları burada gösteririz.
                                </span>
                            </div>
                        ) : null}
                        {locationChecked && geoDenied ? (
                            <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-400">
                                Konum paylaşılmadı. Yakınınızdaki mekânları görmek için sayfayı yenileyip konum iznini
                                açabilirsiniz; aşağıda tüm mekânlar listelenmeye devam eder.
                            </p>
                        ) : null}
                        {locationChecked && !geoDenied && nearbyVenues.length === 0 ? (
                            <p className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600 dark:border-white/[0.08] dark:bg-zinc-900/30 dark:text-zinc-400">
                                Yakın mekân önerisi şu an boş. Aşağıdaki tam listeden aramaya devam edebilirsiniz.
                            </p>
                        ) : null}
                        {locationChecked && nearbyVenues.length > 0 ? (
                            <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-b from-amber-50/90 via-white to-zinc-50/90 p-4 shadow-sm ring-1 ring-amber-100/80 dark:border-amber-500/20 dark:from-amber-950/40 dark:via-zinc-900/80 dark:to-zinc-950 dark:ring-amber-500/10 sm:p-6 lg:p-8">
                                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                            Konumunuza göre
                                        </p>
                                        <h2 className="font-display mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                                            Yakınınızdaki mekânlar
                                        </h2>
                                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                            Kaydırarak gezinin. Öne çıkan mekânlar altın çerçeve ve yıldız rozetiyle işaretlenir; sıralamada
                                            önce gelir, ardından yakınlık uygulanır. Koordinatı olmayanlar sonda yer alır. Yeşil rozet yalnızca
                                            mesafe hesaplanabildiğinde gösterilir.
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => scrollNearbyVenuesBy(-1)}
                                            className="rounded-full border border-zinc-300 bg-white/90 px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                            aria-label="Önceki mekânlar"
                                        >
                                            ←
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => scrollNearbyVenuesBy(1)}
                                            className="rounded-full border border-zinc-300 bg-white/90 px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                            aria-label="Sonraki mekânlar"
                                        >
                                            →
                                        </button>
                                    </div>
                                </div>
                                <ul
                                    ref={nearbyVenuesScrollRef}
                                    aria-label="Yakınınızdaki mekânlar"
                                    className="-mx-1 flex list-none snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-2 scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
                                >
                                    {nearbyVenues.map((venue) => {
                                        const locLine = formatVenueLocationLine(venue.city?.name, venue.district?.name);
                                        const rawDist =
                                            venue.distance_km != null && Number.isFinite(Number(venue.distance_km))
                                                ? Number(venue.distance_km)
                                                : null;
                                        /** Sunucu: koordinatsız mekânlar için sentinel (~999999 km) */
                                        const dist = rawDist != null && rawDist < 900_000 ? rawDist : null;
                                        const featured = Boolean(venue.is_featured);
                                        const card = (
                                            <Link
                                                data-nearby-venue-card
                                                href={route('venues.show', venue.slug)}
                                                className={`block w-[min(85vw,300px)] max-w-[300px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md shadow-zinc-900/[0.07] transition hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-black/40 dark:hover:border-emerald-500/35 ${
                                                    featured
                                                        ? 'rounded-[14px] border-transparent shadow-lg shadow-emerald-900/22 dark:border-transparent dark:shadow-[0_10px_32px_-6px_rgba(52,211,153,0.32)]'
                                                        : ''
                                                }`}
                                            >
                                                <div className="relative h-40 w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                                    {venue.cover_image ? (
                                                        <img
                                                            src={imageSrc(venue.cover_image) ?? ''}
                                                            alt=""
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-4xl opacity-50">
                                                            🎭
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${
                                                            featured
                                                                ? 'from-emerald-950/75 via-black/25 to-emerald-900/22'
                                                                : 'from-black/40 to-transparent'
                                                        }`}
                                                    />
                                                    {featured ? (
                                                        <div className="pointer-events-none absolute left-2 top-2 z-[3] sm:left-3 sm:top-3">
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-300 via-emerald-500 to-emerald-700 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-zinc-950 shadow-lg shadow-emerald-900/45 ring-2 ring-white/50 sm:gap-1.5 sm:px-2.5 sm:text-[10px]">
                                                                <Star className="h-3 w-3 fill-zinc-950" strokeWidth={2} aria-hidden />
                                                                Öne çıkan
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                    {locLine !== '' ? (
                                                        <div
                                                            className={`pointer-events-none absolute z-[2] max-w-[calc(100%-4.5rem)] sm:max-w-[calc(100%-5rem)] ${
                                                                featured
                                                                    ? 'left-2 top-11 sm:left-3 sm:top-12'
                                                                    : 'left-2 top-2 sm:left-3 sm:top-3'
                                                            }`}
                                                        >
                                                            <span
                                                                className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-gradient-to-r from-zinc-800 via-zinc-900 to-emerald-900 px-2.5 py-1.5 text-white shadow-lg shadow-black/35 ring-1 ring-white/20"
                                                                title={locLine}
                                                            >
                                                                <MapPin className="h-3 w-3 shrink-0 text-white/95" aria-hidden />
                                                                <span className="min-w-0 truncate text-left text-[9px] font-semibold text-white sm:text-[10px]">
                                                                    {locLine}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                    {dist != null ? (
                                                        <div className="pointer-events-none absolute bottom-2 right-2 z-[2]">
                                                            <span className="inline-flex rounded-full bg-emerald-600 px-2 py-1 text-[9px] font-bold tabular-nums text-white shadow-lg ring-1 ring-white/25 sm:text-[10px]">
                                                                {dist.toFixed(1)} km
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div
                                                    className={`p-4 ${
                                                        featured
                                                            ? 'bg-gradient-to-b from-emerald-50/90 to-white dark:from-emerald-950/38 dark:to-zinc-900/90'
                                                            : ''
                                                    }`}
                                                >
                                                    <p className="font-semibold text-zinc-900 dark:text-white">{venue.name}</p>
                                                    {venue.category?.name ? (
                                                        <p className="mt-1 text-xs font-medium text-emerald-800 dark:text-emerald-400/90">
                                                            {venue.category.name}
                                                        </p>
                                                    ) : null}
                                                    <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-500">
                                                        {venue.address}
                                                    </p>
                                                </div>
                                            </Link>
                                        );
                                        return (
                                            <li key={venue.id} className="shrink-0 snap-start">
                                                {featured ? (
                                                    <div className="rounded-2xl bg-gradient-to-br from-emerald-300/95 via-emerald-500 to-emerald-900 p-[2px] shadow-[0_12px_40px_-8px_rgba(16,185,129,0.38)] dark:from-emerald-400/80 dark:via-emerald-600 dark:to-emerald-950 dark:shadow-[0_14px_44px_-8px_rgba(52,211,153,0.35)]">
                                                        {card}
                                                    </div>
                                                ) : (
                                                    card
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ) : null}
                    </section>

                    <section className="mx-auto max-w-7xl px-0 py-10 sm:px-4 sm:py-12 lg:px-8">
                        <AdSlot slotKey="venues_list_top" />
                        <div className="mb-6">
                            <h2 className="font-display text-3xl font-bold text-zinc-900 dark:text-white">Mekanlar</h2>
                            <p className="mt-2 text-zinc-700 dark:text-zinc-400">
                                Onaylı ve yayında olan tüm etkinlik mekanları.{' '}
                                <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300/90">
                                    <Star className="inline h-3.5 w-3.5 fill-emerald-500 text-emerald-600 dark:fill-emerald-400" aria-hidden />
                                    <span>Öne çıkan</span>
                                </span>{' '}
                                mekânlar yeşil çerçeve, gölge ve rozetle vurgulanır.
                            </p>
                        </div>
                        {(venues?.data ?? []).length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 py-20 text-center dark:border-white/10 dark:bg-zinc-900/40">
                                <div className="mb-4 text-5xl opacity-50" aria-hidden>
                                    🎭
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Mekan bulunamadı</h3>
                                <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
                                    Arama veya filtreleri değiştirerek tekrar deneyin.
                                </p>
                            </div>
                        ) : (
                            <>
                                {venues?.total != null && venues.total > 0 ? (
                                    <p className="mb-6 text-sm font-medium text-zinc-600 dark:text-zinc-500">
                                        {venues.total} mekandan {venues.from ?? 0}–{venues.to ?? 0} arası gösteriliyor
                                    </p>
                                ) : null}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                                    {(venues?.data ?? []).map((venue) => {
                                        const venueLocationLine = formatVenueLocationLine(venue.city?.name, venue.district?.name);
                                        const showVenueLocation = venueLocationLine !== '';
                                        const featured = Boolean(venue.is_featured);
                                        const link = (
                                            <Link
                                                href={route('venues.show', venue.slug)}
                                                className={`group/card block h-full overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-0.5 dark:bg-zinc-900/60 ${
                                                    featured
                                                        ? 'rounded-[14px] border-transparent shadow-lg shadow-emerald-900/25 dark:border-transparent dark:shadow-[0_10px_36px_-6px_rgba(52,211,153,0.35)]'
                                                        : 'border-zinc-200 shadow-md shadow-zinc-900/[0.08] hover:border-emerald-500/35 hover:shadow-lg hover:shadow-zinc-900/12 dark:border-white/10 dark:shadow-black/45 dark:hover:border-emerald-500/30 dark:hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)]'
                                                }`}
                                            >
                                                <div className="relative h-44 w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                                    {venue.cover_image ? (
                                                        <img src={imageSrc(venue.cover_image) ?? ''} alt={venue.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-4xl opacity-50">🎭</div>
                                                    )}
                                                    <div
                                                        className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${
                                                            featured
                                                                ? 'from-emerald-950/72 via-black/25 to-emerald-900/28'
                                                                : 'from-black/35 via-transparent to-black/20'
                                                        }`}
                                                    />
                                                    {featured ? (
                                                        <div className="pointer-events-none absolute left-2 top-2 z-[14] sm:left-3 sm:top-3">
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-300 via-emerald-500 to-emerald-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-950 shadow-lg shadow-emerald-900/45 ring-2 ring-white/50 sm:gap-1.5 sm:text-xs">
                                                                <Star className="h-3 w-3 fill-zinc-950 sm:h-3.5 sm:w-3.5" strokeWidth={2} aria-hidden />
                                                                Öne çıkan
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                    {showVenueLocation ? (
                                                        <div
                                                            className={`pointer-events-none absolute right-2 z-[12] max-w-[calc(100%-5.5rem)] sm:right-3 ${
                                                                featured ? 'top-11 sm:top-12' : 'top-2 sm:top-3'
                                                            }`}
                                                        >
                                                            <span
                                                                className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-gradient-to-r from-zinc-800 via-zinc-900 to-emerald-900 px-2.5 py-1.5 text-white shadow-lg shadow-black/40 ring-1 ring-white/20 sm:gap-2 sm:px-3 sm:py-1.5"
                                                                title={venueLocationLine}
                                                            >
                                                                <MapPin className="h-3 w-3 shrink-0 text-white/95 sm:h-3.5 sm:w-3.5" aria-hidden />
                                                                <span className="min-w-0 truncate text-left text-[9px] font-semibold leading-tight tracking-tight text-white sm:text-[11px]">
                                                                    {venueLocationLine}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                    <ThisWeekEventsBadge
                                                        weekCount={venue.weekly_events_count ?? 0}
                                                        monthCount={venue.monthly_events_count ?? 0}
                                                        className={
                                                            featured
                                                                ? '!top-auto bottom-3 left-2 max-w-[min(100%,8.5rem)] sm:!left-3 sm:bottom-3'
                                                                : ''
                                                        }
                                                    />
                                                </div>
                                                <div
                                                    className={`p-4 ${
                                                        featured
                                                            ? 'bg-gradient-to-b from-emerald-50/95 to-white dark:from-emerald-950/45 dark:to-zinc-900/95'
                                                            : ''
                                                    }`}
                                                >
                                                    <p className="font-semibold text-zinc-900 dark:text-white">{venue.name}</p>
                                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                                        {venue.city?.name ?? '-'} • {venue.category?.name ?? '-'}
                                                    </p>
                                                    {(venue.review_count ?? 0) > 0 && (venue.rating_avg ?? 0) > 0 ? (
                                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                                                            <span className="flex text-amber-500 dark:text-amber-400" aria-hidden>
                                                                {'★'.repeat(Math.min(5, venue.rating_avg ?? 0))}
                                                                <span className="text-zinc-300 dark:text-zinc-600">
                                                                    {'★'.repeat(5 - Math.min(5, venue.rating_avg ?? 0))}
                                                                </span>
                                                            </span>
                                                            <span className="font-medium text-zinc-800 dark:text-zinc-200">{venue.rating_avg}</span>
                                                            <span className="text-zinc-500 dark:text-zinc-500">({venue.review_count} değerlendirme)</span>
                                                        </div>
                                                    ) : null}
                                                    <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-500">{venue.address}</p>
                                                </div>
                                            </Link>
                                        );
                                        return featured ? (
                                            <div
                                                key={venue.id}
                                                className="rounded-2xl bg-gradient-to-br from-emerald-300/95 via-emerald-500 to-emerald-900 p-[2px] shadow-[0_14px_44px_-8px_rgba(16,185,129,0.42)] dark:from-emerald-400/85 dark:via-emerald-600 dark:to-emerald-950 dark:shadow-[0_18px_50px_-10px_rgba(52,211,153,0.38)]"
                                            >
                                                {link}
                                            </div>
                                        ) : (
                                            <div key={venue.id}>{link}</div>
                                        );
                                    })}
                                </div>
                                {(venues?.links?.length ?? 0) > 3 && (
                                    <div className="mt-10 flex flex-wrap gap-2">
                                        {(venues?.links ?? []).map((link) => {
                                            const label = link.label
                                                .replace('&laquo; Previous', 'Önceki')
                                                .replace('Next &raquo;', 'Sonraki');
                                            const linkKey = link.url ?? `disabled:${link.label}`;
                                            if (!link.url) {
                                                return (
                                                    <span
                                                        key={linkKey}
                                                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-400 dark:border-white/10 dark:text-zinc-600"
                                                        dangerouslySetInnerHTML={{ __html: label }}
                                                    />
                                                );
                                            }
                                            return (
                                                <Link
                                                    key={linkKey}
                                                    href={link.url}
                                                    preserveState
                                                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                                                        link.active
                                                            ? 'border-amber-500 bg-amber-50 font-semibold text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
                                                            : 'border-zinc-200 text-zinc-700 hover:border-amber-300 dark:border-white/10 dark:text-zinc-300 dark:hover:border-amber-500/30'
                                                    }`}
                                                    dangerouslySetInnerHTML={{ __html: label }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </section>

                    <section className="border-t border-amber-500/15 bg-gradient-to-r from-amber-500/[0.12] via-amber-400/[0.06] to-transparent dark:from-amber-500/10 dark:via-amber-600/5">
                        <div className="mx-auto max-w-7xl px-0 py-8 sm:px-4 lg:px-8">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                <div className="max-w-2xl">
                                    <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl">
                                        Mekanınız burada listelenmiyor mu?
                                    </h2>
                                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
                                        Ücretsiz hesapla mekânınızı ekleyin; admin onayı sonrası bu listede görünür.
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
                                    {!isLoggedIn && (
                                        <>
                                            <Link
                                                href={route('register', { uyelik: 'mekan' })}
                                                className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-3 text-center text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
                                            >
                                                Üye ol, mekânını ekle
                                            </Link>
                                            <Link
                                                href={route('login.mekan')}
                                                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3 text-center text-sm font-medium text-zinc-800 transition hover:border-amber-400 hover:text-amber-700 dark:border-white/15 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:border-amber-500/40 dark:hover:text-amber-300"
                                            >
                                                Zaten üye misiniz? Giriş
                                            </Link>
                                        </>
                                    )}
                                    {isLoggedIn && canAddVenue && (
                                        <Link
                                            href={route('artist.venues.create')}
                                            className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-3 text-center text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
                                        >
                                            Mekanınızı ekleyin
                                        </Link>
                                    )}
                                    {isLoggedIn && !canAddVenue && (
                                        <Link
                                            href={route('register', { uyelik: 'mekan' })}
                                            className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-3 text-center text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
                                        >
                                            Mekân eklemek için kayıt
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                </>
            )}

            {/* Bugünkü etkinlikler — slider */}
            {!isVenuesPage && (
                <div id="haftalik-etkinlikler">
                    <EventCarousel
                        accent="amber"
                        subtitle="Bugün"
                        title="Bugünkü etkinlikler"
                        events={todayEvents}
                        emptyMessage="Bugün için yayınlanmış etkinlik bulunmuyor. Yakında yeni tarihler eklenecek."
                    />
                    <EventCarousel
                        accent="violet"
                        subtitle="Önümüzdeki 7 gün"
                        title="Bu haftaki etkinlikler"
                        events={upcomingWeekEvents}
                        emptyMessage="Önümüzdeki günler için eklenmiş etkinlik yok. Takipte kalın!"
                    />
                </div>
            )}

            {locationChecked && nearbyEvents.length > 0 && (
                <section className="mx-auto max-w-7xl px-0 pb-10 pt-6 sm:px-4 lg:px-8">
                    <div className="rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-white via-zinc-50/80 to-zinc-100/40 p-4 shadow-sm ring-1 ring-zinc-200/60 dark:border-white/[0.08] dark:from-zinc-900/90 dark:via-zinc-950/80 dark:to-zinc-950 dark:ring-white/[0.06] sm:p-6 lg:p-8">
                        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div className="min-w-0">
                                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                                    Size yakın
                                </p>
                                <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                                    Konumunuza en yakın etkinlikler
                                </h2>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                    Yaklaşan yayınlar; mesafe, mekân koordinatlarına göre hesaplanır. Kartlardaki yeşil rozet yaklaşık km bilgisidir.
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <button
                                    type="button"
                                    onClick={() => scrollNearbyEventsBy(-1)}
                                    className="rounded-full border border-zinc-300 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                    aria-label="Önceki etkinlikler"
                                >
                                    ←
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollNearbyEventsBy(1)}
                                    className="rounded-full border border-zinc-300 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                    aria-label="Sonraki etkinlikler"
                                >
                                    →
                                </button>
                            </div>
                        </div>
                        <div
                            ref={nearbyEventsScrollRef}
                            className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 sm:pb-4 [&::-webkit-scrollbar]:hidden"
                        >
                            {nearbyEvents.map((ev) => {
                                const { distance_km: distanceKm, ...cardEvent } = ev;
                                return (
                                    <div
                                        key={ev.id}
                                        data-nearby-event-card
                                        className="h-full min-w-[min(100%,320px)] max-w-[320px] shrink-0 snap-start"
                                    >
                                        <PublicEventTicketCard event={cardEvent} distanceKm={distanceKm} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

        </AppLayout>
    );
}
