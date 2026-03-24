import { sanitizeHtmlForInnerHtml } from '@/Components/SafeRichContent';
import { eventShowParam } from '@/lib/eventShowUrl';
import { AdSlot } from '@/Components/AdSlot';
import AppLayout from '@/Layouts/AppLayout';
import SeoHead from '@/Components/SeoHead';
import { Link, router } from '@inertiajs/react';
import axios from 'axios';
import { FormEvent, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

function EventCardImage({
    src,
    alt,
    className,
}: Readonly<{ src: string; alt: string; className?: string }>) {
    const [failed, setFailed] = useState(false);
    if (failed) {
        return (
            <div
                className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-neutral-700 via-neutral-800 to-neutral-900 px-3 text-center ${className ?? ''}`}
            >
                <span aria-hidden className="text-3xl opacity-90 sm:text-4xl">
                    🎤
                </span>
                <span className="line-clamp-4 max-w-[95%] text-balance break-words text-center font-['Montserrat',system-ui,sans-serif] text-sm font-extrabold leading-tight text-white sm:text-base md:text-lg">
                    {alt}
                </span>
            </div>
        );
    }
    return (
        <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className={className}
        />
    );
}

const JJ_RED = '#E30613';

function ChevronDown({ className }: Readonly<{ className?: string }>) {
    return (
        <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
            />
        </svg>
    );
}

interface EventItem {
    id: number;
    slug: string;
    title: string;
    start_date: string;
    description: string | null;
    cover_image?: string | null;
    venue: { name: string; slug: string; cover_image?: string | null; category?: { name: string; slug?: string } | null };
    artists: { id: number; name: string; slug: string; avatar: string | null; genre?: string | null }[];
}

interface PaginatorLink {
    url: string | null;
    label: string;
    active: boolean;
}

export type LocationOption = { id: number; name: string };

interface Props {
    events: { data: EventItem[]; links: PaginatorLink[] };
    categories: { id: number; name: string; slug: string }[];
    genres: string[];
    provinces: LocationOption[];
    /** Üst kırmızı şerit: mevcut filtrelerle aynı sorgudan gelen etkinlikler */
    tickerItems: { id: number; slug: string; label: string }[];
    tickerFallback: string;
    filters: {
        search?: string;
        category?: string;
        period?: string;
        genre?: string;
        city_id?: string | number;
        district_id?: string | number;
    };
}

function imageSrc(path: string | null | undefined): string | null {
    if (!path) return null;
    return path.startsWith('http://') || path.startsWith('https://') ? path : `/storage/${path}`;
}

function EventTicketCard({ event }: Readonly<{ event: EventItem }>) {
    const headliner = event.artists[0];
    const displayName = headliner?.name ?? event.title;
    const bg =
        imageSrc(event.cover_image) ??
        imageSrc(headliner?.avatar) ??
        imageSrc(event.venue.cover_image);

    const d = new Date(event.start_date);
    const dayNum = d.getDate();
    const monthShort = d.toLocaleDateString('tr-TR', { month: 'short' });
    const weekdayShort = d.toLocaleDateString('tr-TR', { weekday: 'short' });
    const dateSubline = `${weekdayShort.toLocaleUpperCase('tr-TR')} · ${monthShort.toLocaleUpperCase('tr-TR')}`;
    const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="group h-full">
            <Link
                href={route('events.show', eventShowParam(event))}
                className="relative block aspect-[3/4] min-h-[260px] w-full overflow-hidden rounded-xl bg-neutral-200 shadow-[0_12px_40px_rgba(0,0,0,0.15)] ring-1 ring-black/10 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.22)] dark:bg-neutral-800 dark:ring-white/10 sm:min-h-[300px] lg:min-h-[320px]"
            >
                {bg ? (
                    <EventCardImage
                        src={bg}
                        alt={displayName}
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-200 via-neutral-300 to-neutral-400 text-5xl dark:from-neutral-800 dark:via-neutral-800 dark:to-neutral-950 sm:text-6xl">
                        <span aria-hidden className="select-none opacity-80">
                            🎤
                        </span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/45 to-black/50" />

                {/* Tarih — sadece sağ üst */}
                <div className="absolute right-2 top-2 z-20 w-[4.25rem] overflow-hidden rounded-md bg-white text-center shadow-lg ring-1 ring-black/15 sm:right-2.5 sm:top-2.5 sm:w-[4.75rem] lg:w-[5rem]">
                    <div className="px-1 pt-1.5 sm:px-1.5 sm:pt-2">
                        <p className="font-['Montserrat',system-ui,sans-serif] text-xl font-black leading-none text-black tabular-nums sm:text-2xl">
                            {dayNum}
                        </p>
                        <p className="mt-0.5 font-['Montserrat',system-ui,sans-serif] text-[7px] font-bold uppercase leading-[1.25] tracking-wide text-neutral-800 sm:text-[8px]">
                            {dateSubline}
                        </p>
                    </div>
                    <div className="mx-1.5 my-1 h-px bg-neutral-300 sm:mx-2" />
                    <p className="pb-1.5 font-['Montserrat',system-ui,sans-serif] text-[9px] font-bold tabular-nums text-black sm:pb-2 sm:text-[10px]">
                        {timeStr}
                    </p>
                </div>

                {/* Başlık — görselin ortasında, büyük; alt şerit için pb ile alan */}
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-3 pb-28 pt-12 sm:px-5 sm:pb-32 sm:pt-14 lg:pb-36">
                    <p className="max-w-[min(100%,20rem)] text-center text-balance break-words font-['Montserrat',system-ui,sans-serif] text-base font-extrabold leading-[1.15] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] sm:max-w-[min(100%,22rem)] sm:text-lg sm:leading-[1.12] md:text-xl lg:text-2xl lg:leading-tight">
                        <span className="line-clamp-4 break-words">{displayName}</span>
                    </p>
                </div>

                <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col gap-2 p-2.5 pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3 sm:p-3 sm:pb-4 lg:p-4 lg:pb-5">
                    <p className="min-w-0 max-w-full font-['Montserrat',system-ui,sans-serif] text-[11px] font-semibold leading-snug text-white drop-shadow-md line-clamp-2 sm:max-w-[60%] sm:text-xs md:text-sm">
                        {event.venue.name}
                    </p>
                    <span
                        className="inline-flex w-fit shrink-0 items-center gap-1 self-end px-2.5 py-1.5 font-['Montserrat',system-ui,sans-serif] text-[9px] font-bold uppercase tracking-wider text-white shadow-md transition group-hover:brightness-110 sm:self-auto sm:gap-1.5 sm:px-3 sm:py-2 sm:text-[10px] md:text-xs"
                        style={{ backgroundColor: JJ_RED }}
                    >
                        Detaylar
                        <svg className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                    </span>
                </div>
            </Link>
        </div>
    );
}

const PERIOD_LABELS: Record<string, string> = {
    today: 'Bugün',
    tomorrow: 'Yarın',
    week: 'Bu hafta',
};

const FILTER_SELECT_CLASS =
    "h-full min-h-[44px] w-full min-w-0 cursor-pointer appearance-none rounded-lg border-2 border-black bg-black py-2.5 pl-2.5 pr-9 font-['Montserrat',system-ui,sans-serif] text-[10px] font-bold uppercase leading-tight tracking-wide text-white outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-jjred disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 sm:min-h-[48px] sm:py-3 sm:pl-3 sm:pr-10 sm:text-[11px] md:text-xs";

export default function EventsIndex({
    events,
    categories,
    genres,
    provinces: provincesFromServer,
    tickerItems,
    tickerFallback,
    filters,
}: Readonly<Props>) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [category, setCategory] = useState(filters.category ?? '');
    const [period, setPeriod] = useState(filters.period ?? '');
    const [genre, setGenre] = useState(filters.genre ?? '');
    const [cityId, setCityId] = useState(filters.city_id != null ? String(filters.city_id) : '');
    const [districtId, setDistrictId] = useState(filters.district_id != null ? String(filters.district_id) : '');
    const [provinces, setProvinces] = useState<LocationOption[]>(provincesFromServer ?? []);
    const [districts, setDistricts] = useState<LocationOption[]>([]);
    const [loadingProvinces, setLoadingProvinces] = useState(!(provincesFromServer?.length > 0));
    const [loadingDistricts, setLoadingDistricts] = useState(false);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    const filtersRef = useRef({ search, category, period, genre, city_id: cityId, district_id: districtId });
    filtersRef.current = { search, category, period, genre, city_id: cityId, district_id: districtId };

    const applyQuery = useCallback(
        (
            next: Partial<{
                search: string;
                category: string;
                period: string;
                genre: string;
                city_id: string;
                district_id: string;
            }> = {}
        ) => {
            const q = { ...filtersRef.current, ...next };
            router.get(
                route('events.index'),
                {
                    search: q.search || undefined,
                    category: q.category || undefined,
                    period: q.period || undefined,
                    genre: q.genre || undefined,
                    city_id: q.city_id || undefined,
                    district_id: q.district_id || undefined,
                },
                { preserveState: true, replace: true }
            );
        },
        []
    );

    const provinceCountFromServer = provincesFromServer?.length ?? 0;

    useEffect(() => {
        if (provinceCountFromServer > 0) {
            setProvinces(provincesFromServer ?? []);
            setLoadingProvinces(false);

            return;
        }
        let cancelled = false;
        setLoadingProvinces(true);
        axios
            .get<LocationOption[]>('/api/locations/provinces')
            .then(({ data }) => {
                if (!cancelled && Array.isArray(data) && data.length > 0) {
                    setProvinces(data);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setProvinces([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingProvinces(false);
                }
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- sadece sunucudaki il sayısı değişince yeniden dene; [] referansı her render'da değişebilir
    }, [provinceCountFromServer]);

    useEffect(() => {
        if (!cityId) {
            setDistricts([]);
            return;
        }
        setLoadingDistricts(true);
        axios
            .get<LocationOption[]>(`/api/locations/districts/${cityId}`)
            .then(({ data }) => setDistricts(data))
            .catch(() => setDistricts([]))
            .finally(() => setLoadingDistricts(false));
    }, [cityId]);

    useEffect(() => {
        setSearch(filters.search ?? '');
        setCategory(filters.category ?? '');
        setPeriod(filters.period ?? '');
        setGenre(filters.genre ?? '');
        setCityId(filters.city_id != null ? String(filters.city_id) : '');
        setDistrictId(filters.district_id != null ? String(filters.district_id) : '');
    }, [filters.search, filters.category, filters.period, filters.genre, filters.city_id, filters.district_id]);

    useEffect(() => {
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            if (search === (filters.search ?? '')) return;
            applyQuery({ search });
        }, 400);
        return () => {
            if (searchDebounce.current) clearTimeout(searchDebounce.current);
        };
    }, [search, filters.search, applyQuery]);

    const handleFilterSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        applyQuery();
    };

    const clearChipAndNavigate = useCallback(
        (
            patch: Partial<{
                category: string;
                period: string;
                genre: string;
                city_id: string;
                district_id: string;
            }>
        ) => {
            if (patch.category !== undefined) setCategory(patch.category);
            if (patch.period !== undefined) setPeriod(patch.period);
            if (patch.genre !== undefined) setGenre(patch.genre);
            if (patch.city_id !== undefined) {
                setCityId(patch.city_id);
                if (patch.city_id === '') setDistrictId('');
            }
            if (patch.district_id !== undefined) setDistrictId(patch.district_id);
            applyQuery(patch);
        },
        [applyQuery]
    );

    const categoryName = useMemo(
        () => categories.find((c) => c.slug === category)?.name,
        [categories, category]
    );

    const cityName = useMemo(
        () => provinces.find((p) => String(p.id) === cityId)?.name,
        [provinces, cityId]
    );
    const districtName = useMemo(
        () => districts.find((d) => String(d.id) === districtId)?.name,
        [districts, districtId]
    );

    const hasQueryFilters = Boolean(
        filters.search || filters.category || filters.period || filters.genre || filters.city_id || filters.district_id,
    );

    const activeChips = useMemo(() => {
        const chips: { key: string; label: string; clear: () => void }[] = [];
        if (category && categoryName) {
            chips.push({
                key: 'cat',
                label: categoryName,
                clear: () => clearChipAndNavigate({ category: '' }),
            });
        }
        if (genre) {
            chips.push({
                key: 'genre',
                label: genre,
                clear: () => clearChipAndNavigate({ genre: '' }),
            });
        }
        if (period && PERIOD_LABELS[period]) {
            chips.push({
                key: 'period',
                label: PERIOD_LABELS[period],
                clear: () => clearChipAndNavigate({ period: '' }),
            });
        }
        if (cityId && cityName) {
            const locLabel =
                districtId && districtName ? `${districtName}, ${cityName}` : cityName;
            chips.push({
                key: 'loc',
                label: locLabel,
                clear: () => clearChipAndNavigate({ city_id: '', district_id: '' }),
            });
        }
        return chips;
    }, [
        category,
        categoryName,
        genre,
        period,
        cityId,
        cityName,
        districtId,
        districtName,
        clearChipAndNavigate,
    ]);

    const tickerRow = (dupKey: string) =>
        tickerItems.map((item, i) => (
            <Fragment key={`${dupKey}-${item.id}-${i}`}>
                {i > 0 && (
                    <span className="mx-3 shrink-0 select-none text-white/75 sm:mx-4" aria-hidden>
                        •
                    </span>
                )}
                <Link
                    href={route('events.show', eventShowParam(item))}
                    className="shrink-0 text-white/95 underline-offset-4 transition hover:text-white hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    prefetch
                >
                    {item.label}
                </Link>
            </Fragment>
        ));

    return (
        <AppLayout>
            <SeoHead
                title="Etkinlikler & Konserler & Performanslar - Sahnebul"
                description="Zaman, tarz, kategori ve konuma göre filtreleyin; yaklaşan konserleri, performansları ve etkinlikleri keşfedin. Sahnebul’da bilet fiyatları ve mekan bilgileri."
            >
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&display=swap" rel="stylesheet" />
            </SeoHead>

            <div className="isolate min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
                {/* Kırmızı ticker: liste ile aynı filtreler, yavaş kayma, satırlar etkinlik detayına gider */}
                <div className="overflow-hidden border-b border-black/10 bg-jjred py-2 text-white sm:py-2.5">
                    {tickerItems.length > 0 ? (
                        <div
                            className="flex w-max animate-marquee whitespace-nowrap font-['Montserrat',system-ui,sans-serif] text-[11px] font-semibold uppercase leading-normal tracking-wide motion-reduce:animate-none sm:text-xs md:text-sm"
                            aria-label="Yaklaşan etkinlikler, konserler ve performanslar"
                        >
                            <div className="flex w-max items-center px-8 sm:px-10">{tickerRow('a')}</div>
                            <div className="flex w-max items-center px-8 sm:px-10" aria-hidden="true">
                                {tickerRow('b')}
                            </div>
                        </div>
                    ) : (
                        <p className="px-4 py-1 text-center text-[11px] font-medium uppercase leading-normal tracking-wide text-white/95 sm:text-xs md:text-sm">
                            {tickerFallback}
                        </p>
                    )}
                </div>

                <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 lg:pb-14 lg:pt-10">
                    <AdSlot slotKey="events_index_top" className="pb-2 pt-1" />
                    <form onSubmit={handleFilterSubmit} className="flex flex-col gap-6 sm:gap-8">
                        <div className="flex flex-col gap-4 sm:gap-5">
                            <div>
                                <h1 className="scroll-mt-24 text-balance font-['Montserrat',system-ui,sans-serif] text-2xl font-black uppercase leading-[1.05] tracking-tight text-black dark:text-white sm:text-3xl sm:leading-[1.08] md:text-4xl lg:text-4xl xl:text-5xl">
                                    Etkinlikler & Konserler & Performanslar
                                </h1>
                                <p className="mt-1.5 max-w-2xl font-['Montserrat',system-ui,sans-serif] text-xs font-medium leading-relaxed text-neutral-600 dark:text-neutral-400 sm:mt-2 sm:text-sm">
                                    Zaman, tarz, kategori ve konuma göre filtreleyin; yaklaşan konserleri, performansları ve etkinlikleri keşfedin.
                                </p>
                            </div>

                            <div>
                                <p className="mb-2 font-['Montserrat',system-ui,sans-serif] text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500 sm:text-xs">
                                    Filtreler
                                </p>
                                <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                                <label className="relative block min-w-0">
                                    <span className="sr-only">Zaman</span>
                                    <select
                                        value={period}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setPeriod(v);
                                            applyQuery({ period: v });
                                        }}
                                        className={FILTER_SELECT_CLASS}
                                    >
                                        <option value="">Zaman</option>
                                        <option value="today">Bugün</option>
                                        <option value="tomorrow">Yarın</option>
                                        <option value="week">Bu hafta</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white opacity-90 sm:right-3 sm:h-4 sm:w-4" />
                                </label>

                                <label className="relative block min-w-0">
                                    <span className="sr-only">Tarz</span>
                                    <select
                                        value={genre}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setGenre(v);
                                            applyQuery({ genre: v });
                                        }}
                                        className={FILTER_SELECT_CLASS}
                                    >
                                        <option value="">Tarz</option>
                                        {genres.map((g) => (
                                            <option key={g} value={g}>
                                                {g}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white opacity-90 sm:right-3 sm:h-4 sm:w-4" />
                                </label>

                                <label className="relative block min-w-0">
                                    <span className="sr-only">Kategori</span>
                                    <select
                                        value={category}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setCategory(v);
                                            applyQuery({ category: v });
                                        }}
                                        className={FILTER_SELECT_CLASS}
                                    >
                                        <option value="">Kategori</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.slug}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white opacity-90 sm:right-3 sm:h-4 sm:w-4" />
                                </label>

                                <label className="relative block min-w-0">
                                    <span className="sr-only">İl</span>
                                    <select
                                        value={cityId}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setCityId(v);
                                            setDistrictId('');
                                            applyQuery({ city_id: v, district_id: '' });
                                        }}
                                        disabled={loadingProvinces}
                                        className={FILTER_SELECT_CLASS}
                                    >
                                        <option value="">{loadingProvinces ? 'İller…' : 'İl'}</option>
                                        {provinces.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white opacity-90 sm:right-3 sm:h-4 sm:w-4" />
                                </label>

                                <label className="relative block min-w-0">
                                    <span className="sr-only">İlçe</span>
                                    <select
                                        value={districtId}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setDistrictId(v);
                                            applyQuery({ district_id: v });
                                        }}
                                        disabled={loadingDistricts || !cityId}
                                        className={FILTER_SELECT_CLASS}
                                    >
                                        <option value="">{loadingDistricts ? 'İlçeler…' : 'İlçe'}</option>
                                        {districts.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white opacity-90 sm:right-3 sm:h-4 sm:w-4" />
                                </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-3">
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Etkinlik ara…"
                                className="min-h-[44px] min-w-0 flex-1 rounded-lg border-2 border-neutral-200 bg-neutral-50 px-3 py-2.5 font-['Montserrat',system-ui,sans-serif] text-sm font-medium leading-snug text-black placeholder:text-neutral-400 focus:border-jjred focus:outline-none focus:ring-2 focus:ring-jjred/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 sm:min-h-[48px] sm:max-w-md sm:px-4"
                            />
                            {activeChips.map((chip) => (
                                <button
                                    key={chip.key}
                                    type="button"
                                    onClick={chip.clear}
                                    className="inline-flex max-w-full items-center gap-1.5 self-start border-2 border-jjred bg-white px-2.5 py-1.5 font-['Montserrat',system-ui,sans-serif] text-[10px] font-bold uppercase leading-snug text-jjred transition hover:bg-jjred hover:text-white dark:bg-neutral-900 dark:hover:bg-jjred sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
                                >
                                    <span className="min-w-0 truncate">{chip.label}</span>
                                    <span className="shrink-0 text-sm leading-none sm:text-base" aria-hidden>
                                        ×
                                    </span>
                                </button>
                            ))}
                        </div>
                    </form>

                    {events.data.length === 0 ? (
                        <div className="mx-auto mt-12 max-w-md text-center sm:mt-16">
                            <p className="font-['Montserrat',system-ui,sans-serif] text-sm font-semibold leading-relaxed text-neutral-500 dark:text-neutral-400 sm:text-base">
                                {hasQueryFilters
                                    ? 'Bu filtrelere uygun etkinlik bulunamadı. Tarz veya il seçiliyse, içe aktarılan etkinlikler listeden çıkmış olabilir.'
                                    : 'Şu an listelenecek yayında etkinlik yok.'}
                            </p>
                            {hasQueryFilters ? (
                                <Link
                                    href={route('events.index')}
                                    className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-jjred bg-white px-5 py-2.5 font-['Montserrat',system-ui,sans-serif] text-xs font-bold uppercase tracking-wide text-jjred transition hover:bg-jjred hover:text-white dark:bg-neutral-900 dark:hover:text-white"
                                >
                                    Tüm filtreleri kaldır
                                </Link>
                            ) : null}
                        </div>
                    ) : (
                        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4 lg:gap-6">
                            {events.data.map((event) => (
                                <EventTicketCard key={event.id} event={event} />
                            ))}
                        </div>
                    )}

                    {events.links && events.links.length > 3 && (
                        <nav className="mt-10 flex flex-wrap items-center justify-center gap-1.5 sm:mt-14 sm:gap-2" aria-label="Sayfalama">
                            {events.links.map((link, i) => {
                                if (link.url === null) {
                                    return (
                                        <span
                                            key={`p-${link.label}-${i}`}
                                            className="min-w-[2.25rem] px-2.5 py-1.5 text-center font-['Montserrat',system-ui,sans-serif] text-xs text-neutral-400 dark:text-neutral-500 sm:min-w-[2.5rem] sm:px-3 sm:py-2 sm:text-sm"
                                            dangerouslySetInnerHTML={{ __html: sanitizeHtmlForInnerHtml(link.label) }}
                                        />
                                    );
                                }
                                return (
                                    <Link
                                        key={link.url}
                                        href={link.url}
                                        preserveScroll
                                        className={`min-w-[2.25rem] rounded-md px-2.5 py-1.5 text-center font-['Montserrat',system-ui,sans-serif] text-xs font-bold uppercase leading-none transition sm:min-w-[2.5rem] sm:px-3 sm:py-2 sm:text-sm ${
                                            link.active
                                                ? 'bg-jjred text-white'
                                                : 'border border-black text-black hover:bg-black hover:text-white dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-white'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtmlForInnerHtml(link.label) }}
                                    />
                                );
                            })}
                        </nav>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
