import { sanitizeHtmlForInnerHtml } from '@/Components/SafeRichContent';
import { eventShowParam } from '@/lib/eventShowUrl';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
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
                <span className="line-clamp-4 max-w-[95%] text-balance break-words text-center font-display text-sm font-bold leading-tight text-white sm:text-base md:text-lg">
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
    listing_image?: string | null;
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
    events: { data: EventItem[]; links: PaginatorLink[]; total?: number; from?: number | null; to?: number | null };
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

/** Kart / liste görseli: önce listing_image, yoksa kapak. */
function eventCardImageSrc(listing: string | null | undefined, cover: string | null | undefined): string | null {
    const list = listing?.trim();
    if (list) {
        return imageSrc(list);
    }
    return imageSrc(cover ?? null);
}

function EventTicketCard({ event }: Readonly<{ event: EventItem }>) {
    const headliner = event.artists[0];
    const displayName = headliner?.name ?? event.title;
    const bg =
        eventCardImageSrc(event.listing_image, event.cover_image) ??
        imageSrc(headliner?.avatar) ??
        imageSrc(event.venue.cover_image);

    const whenLabel = formatTurkishDateTime(event.start_date);

    return (
        <div className="group h-full">
            <Link
                href={route('events.show', eventShowParam(event))}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-500/5 dark:border-white/[0.08] dark:bg-zinc-900/50 dark:hover:border-amber-500/35"
            >
                <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800/80">
                    {bg ? (
                        <EventCardImage
                            src={bg}
                            alt={displayName}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-200 via-zinc-100 to-amber-100/40 text-5xl dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950">
                            <span aria-hidden className="select-none opacity-70">
                                🎤
                            </span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-80 transition group-hover:opacity-100" />
                    <div className="absolute right-1.5 top-1.5 max-w-[min(100%,11.5rem)] rounded-lg bg-white/95 px-1.5 py-1 text-right shadow-md ring-1 ring-black/5 backdrop-blur-sm dark:bg-zinc-950/90 dark:ring-white/10 sm:right-3 sm:top-3 sm:rounded-xl sm:px-3 sm:py-2">
                        <p className="text-[9px] font-semibold leading-tight text-zinc-900 dark:text-white sm:text-[11px] sm:leading-snug">{whenLabel}</p>
                    </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-2.5 pt-2 sm:p-4 sm:pt-3.5">
                    <h2 className="font-display text-xs font-bold leading-snug tracking-tight text-zinc-900 dark:text-white sm:text-lg">
                        <span className="line-clamp-2">{displayName}</span>
                    </h2>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400 sm:mt-2 sm:text-sm">{event.venue.name}</p>
                    {event.venue.category?.name && (
                        <p className="mt-0.5 truncate text-[10px] font-medium text-amber-700/90 dark:text-amber-400/90 sm:mt-1 sm:text-xs">{event.venue.category.name}</p>
                    )}
                    <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[11px] font-semibold text-amber-600 transition group-hover:gap-2 dark:text-amber-400 sm:gap-1.5 sm:pt-4 sm:text-sm">
                        Detaylar
                        <svg className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
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
    'h-full min-h-[44px] w-full min-w-0 cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-3 pr-9 text-sm font-medium text-zinc-900 outline-none ring-amber-500/0 transition hover:border-zinc-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-800/60 dark:text-zinc-100 dark:hover:border-white/15 dark:focus:border-amber-500/60 sm:min-h-[48px] sm:py-3 sm:pl-3.5 sm:pr-10';

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
                    <span className="mx-3 shrink-0 select-none text-zinc-500 sm:mx-4" aria-hidden>
                        ·
                    </span>
                )}
                <Link
                    href={route('events.show', eventShowParam(item))}
                    className="shrink-0 text-amber-200/95 underline-offset-4 transition hover:text-amber-50 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
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
            />

            <div className="isolate min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
                <div className="relative overflow-hidden border-b border-zinc-200/80 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 py-2.5 text-zinc-100 dark:border-white/10">
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-zinc-900 to-transparent sm:w-24" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-900 to-transparent sm:w-24" />
                    {tickerItems.length > 0 ? (
                        <div
                            className="flex w-max animate-marquee whitespace-nowrap text-sm font-medium motion-reduce:animate-none"
                            aria-label="Yaklaşan etkinlikler, konserler ve performanslar"
                        >
                            <div className="flex w-max items-center px-10 sm:px-14">{tickerRow('a')}</div>
                            <div className="flex w-max items-center px-10 sm:px-14" aria-hidden="true">
                                {tickerRow('b')}
                            </div>
                        </div>
                    ) : (
                        <p className="px-4 py-0.5 text-center text-sm text-zinc-300">{tickerFallback}</p>
                    )}
                </div>

                <div className="mx-auto max-w-7xl px-2 pb-10 pt-5 sm:px-4 sm:pb-14 sm:pt-8 lg:px-8 lg:pb-16">
                    <AdSlot slotKey="events_index_top" className="pb-3 pt-1" />
                    <form onSubmit={handleFilterSubmit} className="flex flex-col gap-8">
                        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-zinc-900/40 sm:p-6 lg:p-8">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Etkinlikler</p>
                                    <h1 className="mt-2 scroll-mt-24 text-balance font-display text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
                                        Konser ve etkinlikleri keşfedin
                                    </h1>
                                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
                                        Tarih, müzik tarzı, kategori ve şehre göre filtreleyin; yaklaşan gösterileri tek yerde listeleyin.
                                    </p>
                                </div>
                                <div className="w-full shrink-0 lg:max-w-md">
                                    <label htmlFor="events-search" className="sr-only">
                                        Etkinlik ara
                                    </label>
                                    <input
                                        id="events-search"
                                        type="search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Etkinlik veya sanatçı ara…"
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-inner placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-800/50 dark:text-white dark:placeholder:text-zinc-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 border-t border-zinc-100 pt-6 dark:border-white/[0.06]">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">Filtreler</p>
                                <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
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
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 sm:right-3" />
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
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 sm:right-3" />
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
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 sm:right-3" />
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
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 sm:right-3" />
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
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 sm:right-3" />
                                </label>
                                </div>
                            </div>

                            {activeChips.length > 0 && (
                                <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-100 pt-6 dark:border-white/[0.06]">
                                    {activeChips.map((chip) => (
                                        <button
                                            key={chip.key}
                                            type="button"
                                            onClick={chip.clear}
                                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/[0.08] px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-500/15 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20"
                                        >
                                            <span className="min-w-0 truncate">{chip.label}</span>
                                            <span className="shrink-0 text-base leading-none opacity-70" aria-hidden>
                                                ×
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </form>

                    {events.data.length === 0 ? (
                        <div className="mx-auto mt-14 max-w-md rounded-2xl border border-zinc-200/90 bg-white px-6 py-10 text-center shadow-sm dark:border-white/[0.08] dark:bg-zinc-900/40 sm:mt-16">
                            <p className="text-4xl" aria-hidden>
                                🎫
                            </p>
                            <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
                                {hasQueryFilters
                                    ? 'Bu filtrelere uygun etkinlik bulunamadı. Farklı tarih veya konum deneyebilirsiniz.'
                                    : 'Şu an listelenecek yayında etkinlik yok.'}
                            </p>
                            {hasQueryFilters ? (
                                <Link
                                    href={route('events.index')}
                                    className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
                                >
                                    Tüm filtreleri kaldır
                                </Link>
                            ) : null}
                        </div>
                    ) : (
                        <>
                            <div className="mt-10 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl">Yaklaşan etkinlikler</h2>
                                {events.total != null && events.total > 0 && (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {events.from != null && events.to != null
                                            ? `${events.from}–${events.to} / ${events.total} etkinlik`
                                            : `Toplam ${events.total} etkinlik`}
                                    </p>
                                )}
                            </div>
                            <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                                {events.data.map((event) => (
                                    <EventTicketCard key={event.id} event={event} />
                                ))}
                            </div>
                        </>
                    )}

                    {events.links && events.links.length > 3 && (
                        <nav className="mt-12 flex flex-wrap items-center justify-center gap-2 sm:mt-14" aria-label="Sayfalama">
                            {events.links.map((link, i) => {
                                if (link.url === null) {
                                    return (
                                        <span
                                            key={`p-${link.label}-${i}`}
                                            className="min-w-[2.5rem] px-3 py-2 text-center text-sm text-zinc-400 dark:text-zinc-500"
                                            dangerouslySetInnerHTML={{ __html: sanitizeHtmlForInnerHtml(link.label) }}
                                        />
                                    );
                                }
                                return (
                                    <Link
                                        key={link.url}
                                        href={link.url}
                                        preserveScroll
                                        className={`min-w-[2.5rem] rounded-xl px-3 py-2 text-center text-sm font-semibold transition ${
                                            link.active
                                                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                                                : 'border border-zinc-200 bg-white text-zinc-700 hover:border-amber-400/50 hover:text-amber-800 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:border-amber-500/40 dark:hover:text-amber-300'
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
