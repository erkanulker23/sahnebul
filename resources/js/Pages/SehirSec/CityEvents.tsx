import SeoHead from '@/Components/SeoHead';
import { externalDisKaynakSegment } from '@/lib/eventShowUrl';
import { sanitizeHtmlForInnerHtml } from '@/Components/SafeRichContent';
import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, MapPin, Ticket } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface BubiletEvent {
    item_key?: string;
    id: number;
    title: string;
    image_url: string | null;
    venue_name: string | null;
    dates_line: string | null;
    price_label: string | null;
    external_url: string | null;
    rank: number | null;
    city_slug: string | null;
    category_name: string | null;
    district_label: string | null;
    artist_type_label: string | null;
    /** Platformda yayınlanmış eşleşme varsa /etkinlikler/{slug}-{id} */
    internal_event_segment: string | null;
}

interface CategoryOption {
    name: string;
    slug: string;
}

interface DistrictOption {
    slug: string;
    label: string;
}

interface GenreOption {
    slug: string;
    label: string;
}

interface PaginatorLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Props {
    citySlug: string;
    cityName: string;
    categories: CategoryOption[];
    activeCategorySlug: string | null;
    districts: DistrictOption[];
    activeDistrictSlug: string | null;
    genres: GenreOption[];
    activeGenreSlug: string | null;
    events: { data: BubiletEvent[]; links: PaginatorLink[] };
}

function cityListHref(
    citySlug: string,
    filters: { kategori?: string | null; ilce?: string | null; sanat_turu?: string | null },
): string {
    // sanat_turu = sanatçı türü (genre) slug; /etkinlikler?genre= ile aynı veri kümesi
    const params: Record<string, string> = { city: citySlug };
    if (filters.kategori) {
        params.kategori = filters.kategori;
    }
    if (filters.ilce) {
        params.ilce = filters.ilce;
    }
    if (filters.sanat_turu) {
        params.sanat_turu = filters.sanat_turu;
    }
    return route('sehir-sec.city', params);
}

export default function SehirSecCityEvents({
    citySlug,
    cityName,
    categories,
    activeCategorySlug,
    districts,
    activeDistrictSlug,
    genres,
    activeGenreSlug,
    events,
}: Readonly<Props>) {
    const desc = `${cityName} etkinlikleri — /etkinlikler ile aynı platform kaydı. İlçe, tür ve kategoriye göre süzebilirsiniz.`;
    const [geoHint, setGeoHint] = useState<string | null>(null);
    const geoStarted = useRef(false);

    useEffect(() => {
        if (geoStarted.current) {
            return;
        }
        if (activeDistrictSlug) {
            return;
        }
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            return;
        }
        geoStarted.current = true;
        setGeoHint('Konumunuza göre yakın ilçe aranıyor…');

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const res = await fetch(
                        route('api.reverse-geocode', {
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            city: citySlug,
                        }),
                        {
                            credentials: 'same-origin',
                            headers: {
                                Accept: 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                        },
                    );
                    const data = (await res.json()) as { district_slug?: string | null };
                    const slug = data.district_slug;
                    if (slug) {
                        router.get(
                            cityListHref(citySlug, {
                                ilce: slug,
                                kategori: activeCategorySlug,
                                sanat_turu: activeGenreSlug,
                            }),
                            {},
                            { replace: true, preserveScroll: true },
                        );
                    }
                } catch {
                    /* ignore */
                } finally {
                    setGeoHint(null);
                }
            },
            () => {
                setGeoHint(null);
            },
            { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 },
        );
    }, [citySlug, activeDistrictSlug, activeCategorySlug, activeGenreSlug]);

    return (
        <AppLayout>
            <SeoHead title={`${cityName} — Popüler etkinlikler`} description={desc} />

            <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
                <section className="relative overflow-hidden border-b border-zinc-200 bg-zinc-950 px-4 py-10 dark:border-zinc-800 sm:px-6 lg:px-8">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/40 via-zinc-950 to-zinc-950" />
                    <div className="relative z-10 mx-auto max-w-7xl">
                        <Link
                            href={route('sehir-sec', { sehir: citySlug })}
                            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400/95 hover:text-emerald-300"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden />
                            Şehir seç
                        </Link>
                        <div className="mt-6 flex flex-wrap items-end gap-3">
                            <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
                                {cityName}
                                <span className="block text-lg font-normal text-zinc-400 sm:mt-1 sm:inline sm:text-xl">
                                    {' '}
                                    · Popüler etkinlikler
                                </span>
                            </h1>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                                <Ticket className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                                Sahnebul etkinlikleri
                            </span>
                        </div>

                        {geoHint && (
                            <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                {geoHint}
                            </p>
                        )}

                        {districts.length > 0 && (
                            <div className="mt-6 max-w-md">
                                <label htmlFor="sehir-sec-ilce" className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                    <MapPin className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                                    İlçe
                                </label>
                                <select
                                    id="sehir-sec-ilce"
                                    value={activeDistrictSlug ?? ''}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        router.get(
                                            cityListHref(citySlug, {
                                                ilce: v || null,
                                                kategori: activeCategorySlug,
                                                sanat_turu: activeGenreSlug,
                                            }),
                                            {},
                                            { preserveScroll: true },
                                        );
                                    }}
                                    className="w-full rounded-xl border border-white/20 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none ring-emerald-500/40 focus:border-emerald-500/50 focus:ring-2"
                                >
                                    <option value="">Tüm ilçeler</option>
                                    {districts.map((d) => (
                                        <option key={d.slug} value={d.slug}>
                                            {d.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1.5 text-[11px] text-zinc-500">
                                    Konum izni verirseniz uygun ilçe otomatik seçilir; mekânın kayıtlı ilçesi bu ada eşleşiyorsa listelenir.
                                </p>
                            </div>
                        )}

                        {genres.length > 0 && (
                            <div className="mt-8">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Tür (sanatçı)</p>
                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        href={cityListHref(citySlug, {
                                            kategori: activeCategorySlug,
                                            ilce: activeDistrictSlug,
                                            sanat_turu: null,
                                        })}
                                        preserveScroll
                                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                            activeGenreSlug === null
                                                ? 'border-emerald-400 bg-emerald-500/20 text-white'
                                                : 'border-white/20 text-zinc-300 hover:border-emerald-400/40 hover:text-white'
                                        }`}
                                    >
                                        Tümü
                                    </Link>
                                    {genres.map((t) => (
                                        <Link
                                            key={t.slug}
                                            href={cityListHref(citySlug, {
                                                kategori: activeCategorySlug,
                                                ilce: activeDistrictSlug,
                                                sanat_turu: t.slug,
                                            })}
                                            preserveScroll
                                            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                                activeGenreSlug === t.slug
                                                    ? 'border-emerald-400 bg-emerald-500/20 text-white'
                                                    : 'border-white/20 text-zinc-300 hover:border-emerald-400/40 hover:text-white'
                                            }`}
                                        >
                                            {t.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {categories.length > 0 && (
                            <div className="mt-8">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Kategori</p>
                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        href={cityListHref(citySlug, {
                                            ilce: activeDistrictSlug,
                                            sanat_turu: activeGenreSlug,
                                            kategori: null,
                                        })}
                                        preserveScroll
                                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                            activeCategorySlug === null
                                                ? 'border-emerald-400 bg-emerald-500/20 text-white'
                                                : 'border-white/20 text-zinc-300 hover:border-emerald-400/40 hover:text-white'
                                        }`}
                                    >
                                        Tümü
                                    </Link>
                                    {categories.map((c) => (
                                        <Link
                                            key={c.slug}
                                            href={cityListHref(citySlug, {
                                                kategori: c.slug,
                                                ilce: activeDistrictSlug,
                                                sanat_turu: activeGenreSlug,
                                            })}
                                            preserveScroll
                                            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                                activeCategorySlug === c.slug
                                                    ? 'border-emerald-400 bg-emerald-500/20 text-white'
                                                    : 'border-white/20 text-zinc-300 hover:border-emerald-400/40 hover:text-white'
                                            }`}
                                        >
                                            {c.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <div className="mx-auto max-w-7xl px-0 py-8 sm:px-4 sm:py-10 lg:px-8">
                    {events.data.length === 0 && (
                        <p className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                            Bu şehir ve seçili filtrelere uygun etkinlik yok. Tüm şehirler ve filtreler için{' '}
                            <Link href={route('events.index')} className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                                Etkinlikler
                            </Link>{' '}
                            sayfasına göz atabilirsiniz.
                        </p>
                    )}
                    {events.data.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 lg:gap-6">
                            {events.data.map((ev) => (
                                <BubiletEventCard key={ev.item_key ?? `evt-${ev.id}`} ev={ev} />
                            ))}
                        </div>
                    )}

                    {events.links && events.links.length > 3 && (
                        <nav className="mt-10 flex flex-wrap items-center justify-center gap-1.5" aria-label="Sayfalama">
                            {events.links.map((link, i) => {
                                if (link.url === null) {
                                    return (
                                        <span
                                            key={`p-${link.label}-${i}`}
                                            className="min-w-[2.25rem] px-2.5 py-1.5 text-center text-xs text-zinc-400 dark:text-zinc-500"
                                            dangerouslySetInnerHTML={{ __html: sanitizeHtmlForInnerHtml(link.label) }}
                                        />
                                    );
                                }
                                return (
                                    <Link
                                        key={link.url}
                                        href={link.url}
                                        preserveScroll
                                        className={`min-w-[2.25rem] rounded-full px-3 py-1.5 text-center text-xs font-semibold transition ${
                                            link.active
                                                ? 'bg-emerald-600 text-white'
                                                : 'border border-zinc-300 text-zinc-700 hover:border-emerald-500 hover:text-emerald-700 dark:border-zinc-600 dark:text-zinc-200 dark:hover:border-emerald-500 dark:hover:text-emerald-400'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtmlForInnerHtml(link.label) }}
                                    />
                                );
                            })}
                        </nav>
                    )}

                    <p className="mt-12 text-center text-xs text-zinc-500 dark:text-zinc-500">
                        Liste, /etkinlikler ile aynı yayınlanmış etkinlik kayıtlarından üretilir.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}

function bubiletEventDetailHref(ev: BubiletEvent): string {
    const eventParam = ev.internal_event_segment ?? externalDisKaynakSegment(ev.id);
    return route('events.show', { event: eventParam });
}

function BubiletEventCard({ ev }: Readonly<{ ev: BubiletEvent }>) {
    return (
        <Link
            href={bubiletEventDetailHref(ev)}
            className="group relative block w-full max-w-[220px] justify-self-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:max-w-none"
        >
            {ev.rank != null && (
                <span
                    className="pointer-events-none absolute -left-1 top-1/2 z-0 hidden -translate-y-1/2 select-none text-[100px] font-black leading-none text-transparent sm:block"
                    style={{ WebkitTextStroke: '2px rgba(16, 185, 129, 0.35)' }}
                    aria-hidden
                >
                    {ev.rank}
                </span>
            )}
            <div className="relative z-[2] flex aspect-[3/4] w-full flex-col overflow-hidden rounded-2xl bg-zinc-800 shadow-lg transition duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl">
                {ev.image_url ? (
                    <img
                        src={ev.image_url}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-110"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/45 to-transparent" />
                <div className="relative z-[5] flex flex-wrap gap-1 p-2 sm:p-3">
                    {ev.artist_type_label && (
                        <span className="inline-block max-w-full truncate rounded-full bg-violet-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200 backdrop-blur-sm">
                            {ev.artist_type_label}
                        </span>
                    )}
                    {ev.category_name && (
                        <span className="inline-block max-w-full truncate rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 backdrop-blur-sm">
                            {ev.category_name}
                        </span>
                    )}
                    {ev.district_label && (
                        <span className="inline-block max-w-full truncate rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/95 backdrop-blur-sm">
                            {ev.district_label}
                        </span>
                    )}
                </div>
                <div className="relative z-[5] mt-auto flex flex-col justify-end p-2.5 text-white sm:p-3 md:p-4">
                    <h2 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{ev.title}</h2>
                    {ev.dates_line && <p className="mt-1 line-clamp-2 text-[11px] text-slate-200 sm:text-xs">{ev.dates_line}</p>}
                    {ev.venue_name && <p className="line-clamp-2 text-[11px] text-slate-300 sm:text-xs">{ev.venue_name}</p>}
                    {ev.price_label && <p className="mt-2 text-sm font-bold text-emerald-400 sm:text-base">{ev.price_label}</p>}
                </div>
            </div>
        </Link>
    );
}
