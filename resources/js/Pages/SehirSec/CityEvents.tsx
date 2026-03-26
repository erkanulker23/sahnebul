import SeoHead from '@/Components/SeoHead';
import { formatVenueLocationLine } from '@/lib/formatVenueLocationLine';
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
    /** Mekân ili (kart görseli üstü) */
    city_label: string | null;
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
    /** Konuma göre sıralama (ilçe filtresi değil) */
    nearLat?: number | null;
    nearLng?: number | null;
    events: { data: BubiletEvent[]; links: PaginatorLink[] };
}

function cityListHref(
    citySlug: string,
    filters: {
        kategori?: string | null;
        ilce?: string | null;
        sanat_turu?: string | null;
        near_lat?: number | null;
        near_lng?: number | null;
    },
): string {
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
    if (filters.near_lat != null && filters.near_lng != null && Number.isFinite(filters.near_lat) && Number.isFinite(filters.near_lng)) {
        params.near_lat = String(filters.near_lat);
        params.near_lng = String(filters.near_lng);
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
    nearLat = null,
    nearLng = null,
    events,
}: Readonly<Props>) {
    const desc = `${cityName} etkinlikleri — /etkinlikler ile aynı platform kaydı. İlçe, tür ve kategoriye göre süzebilirsiniz.`;
    const [geoHint, setGeoHint] = useState<string | null>(null);
    const [detectedLocation, setDetectedLocation] = useState<string | null>(null);
    const geoStarted = useRef(false);

    const nearPair =
        nearLat != null && nearLng != null && Number.isFinite(nearLat) && Number.isFinite(nearLng)
            ? { near_lat: nearLat, near_lng: nearLng }
            : {};

    useEffect(() => {
        geoStarted.current = false;
        setDetectedLocation(null);
    }, [citySlug]);

    /** Konum yalnızca near_lat/near_lng ile sunucuda sıralamada kullanılır; ilçe URL’ye yazılmaz. */
    useEffect(() => {
        if (geoStarted.current) {
            return;
        }
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            return;
        }
        if (nearLat != null && nearLng != null && Number.isFinite(nearLat) && Number.isFinite(nearLng)) {
            geoStarted.current = true;
            return;
        }
        geoStarted.current = true;
        setGeoHint('Konumunuz alınıyor…');

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                setGeoHint('Konumunuz haritada çözümleniyor…');
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                try {
                    const res = await fetch(
                        route('api.reverse-geocode', {
                            lat,
                            lng,
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
                    const data = (await res.json()) as {
                        district_label?: string | null;
                        map_label?: string | null;
                    };
                    const districtLabel = typeof data.district_label === 'string' ? data.district_label.trim() : '';
                    const mapLabel = typeof data.map_label === 'string' ? data.map_label.trim() : '';
                    const human = districtLabel || mapLabel || null;
                    if (human) {
                        setDetectedLocation(human);
                    }
                } catch {
                    /* ignore */
                } finally {
                    setGeoHint(null);
                }

                try {
                    const u = new URL(globalThis.location.href);
                    u.searchParams.set('near_lat', String(lat));
                    u.searchParams.set('near_lng', String(lng));
                    router.visit(u.pathname + u.search, { replace: true, preserveScroll: true, preserveState: true });
                } catch {
                    /* ignore */
                }
            },
            () => {
                setGeoHint(null);
            },
            { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 },
        );
    }, [citySlug, nearLat, nearLng]);

    return (
        <AppLayout>
            <SeoHead title={`${cityName} — Popüler etkinlikler`} description={desc} />

            <div className="-mx-4 -mt-5 sm:-mx-6 sm:-mt-6 lg:-mx-8">
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
                                <MapPin className="h-3.5 w-3.5 shrink-0 animate-pulse" aria-hidden />
                                {geoHint}
                            </p>
                        )}

                        {Object.keys(nearPair).length > 0 && !geoHint ? (
                            <p className="mt-4 max-w-2xl text-xs leading-relaxed text-zinc-400">
                                Liste, mekâna göre yakınlık sırasına göre sıralanır; ilçe seçimi ayrı bir filtre olarak kalır.{' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        router.visit(
                                            cityListHref(citySlug, {
                                                kategori: activeCategorySlug,
                                                ilce: activeDistrictSlug,
                                                sanat_turu: activeGenreSlug,
                                            }),
                                            { preserveScroll: true },
                                        );
                                    }}
                                    className="font-medium text-emerald-400 underline-offset-2 hover:underline"
                                >
                                    Yakınlık sıralamasını kaldır
                                </button>
                            </p>
                        ) : null}

                        {detectedLocation && !geoHint ? (
                            <p className="mt-4 max-w-2xl rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm leading-snug text-zinc-200">
                                <span className="mr-2 inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                                    Konumunuz (yaklaşık)
                                </span>
                                <span className="text-zinc-300">{detectedLocation}</span>
                            </p>
                        ) : null}

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
                                                ...nearPair,
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
                                    Konum izni verirseniz liste yakın mekânlara göre sıralanır. İlçe seçmek isterseniz listeyi daraltır; &quot;Tüm ilçeler&quot; ile sıralama korunur.
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
                                            ...nearPair,
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
                                                ...nearPair,
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
                                            ...nearPair,
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
                                                ...nearPair,
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
    const cityTop = typeof ev.city_label === 'string' ? ev.city_label.trim() : '';
    const districtTop = typeof ev.district_label === 'string' ? ev.district_label.trim() : '';
    const locationLine = formatVenueLocationLine(cityTop, districtTop);
    const showLocationTop = locationLine !== '';

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
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 from-40% via-55% to-transparent" />
                {showLocationTop ? (
                    <div className="pointer-events-none absolute left-2 right-2 top-2 z-[6] sm:left-3 sm:right-3 sm:top-3">
                        <span
                            className="inline-flex w-full max-w-full items-center gap-1.5 rounded-full bg-gradient-to-r from-zinc-800 via-zinc-900 to-amber-700 px-2.5 py-1.5 text-white shadow-lg shadow-black/40 ring-1 ring-white/20 sm:gap-2 sm:px-3 sm:py-1.5"
                            title={locationLine}
                        >
                            <MapPin className="h-3 w-3 shrink-0 text-white/95 sm:h-3.5 sm:w-3.5" aria-hidden />
                            <span className="min-w-0 flex-1 truncate text-left text-[9px] font-semibold leading-tight tracking-tight text-white sm:text-[11px]">
                                {locationLine}
                            </span>
                        </span>
                    </div>
                ) : null}
                <div className="relative z-[5] flex flex-wrap gap-1.5 p-2 sm:p-3">
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
                </div>
                <div className="relative z-[5] mt-auto flex flex-col justify-end rounded-t-2xl bg-gradient-to-t from-black/95 via-black/75 to-transparent p-2.5 pt-8 text-white ring-1 ring-black/20 backdrop-blur-[2px] sm:p-3 sm:pt-10 md:p-4">
                    <h2
                        className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base"
                        style={{ textShadow: '0 2px 12px rgb(0 0 0 / 0.85), 0 1px 2px rgb(0 0 0 / 0.9)' }}
                    >
                        {ev.title}
                    </h2>
                    {ev.dates_line && (
                        <p
                            className="mt-1 line-clamp-2 text-[11px] font-medium text-white sm:text-xs"
                            style={{ textShadow: '0 1px 8px rgb(0 0 0 / 0.9)' }}
                        >
                            {ev.dates_line}
                        </p>
                    )}
                    {ev.venue_name && (
                        <p
                            className="mt-1 line-clamp-2 text-[11px] text-zinc-200 sm:text-xs"
                            style={{ textShadow: '0 1px 8px rgb(0 0 0 / 0.85)' }}
                        >
                            {ev.venue_name}
                        </p>
                    )}
                    {ev.price_label && (
                        <p className="mt-2 text-sm font-bold text-emerald-400 sm:text-base" style={{ textShadow: '0 1px 6px rgb(0 0 0 / 0.8)' }}>
                            {ev.price_label}
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
}
