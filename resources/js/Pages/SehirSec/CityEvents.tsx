import { CityPromoStories, type CityPromoStoryRing } from '@/Components/CityPromoStories';
import SeoHead from '@/Components/SeoHead';
import PublicEventTicketCard, { type PublicEventTicketCardEvent } from '@/Components/PublicEventTicketCard';
import { sanitizeHtmlForInnerHtml } from '@/Components/SafeRichContent';
import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, MapPin, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Sunucu yakınlık sıralamasında opsiyonel km */
interface CityEventsRow extends PublicEventTicketCardEvent {
    distance_km?: number;
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
    events: { data: CityEventsRow[]; links: PaginatorLink[] };
    promoStoryRings?: CityPromoStoryRing[];
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
    promoStoryRings = [],
}: Readonly<Props>) {
    const desc = `${cityName} etkinlikleri — /etkinlikler ile aynı platform kaydı. İlçe, tür ve kategoriye göre süzebilirsiniz.`;
    const [geoHint, setGeoHint] = useState<string | null>(null);
    const [detectedLocation, setDetectedLocation] = useState<string | null>(null);
    const [geoDenied, setGeoDenied] = useState(false);

    const hasServerNear =
        nearLat != null && nearLng != null && Number.isFinite(nearLat) && Number.isFinite(nearLng);

    const nearPair = hasServerNear ? { near_lat: nearLat, near_lng: nearLng } : {};

    useEffect(() => {
        setDetectedLocation(null);
        setGeoHint(null);
        setGeoDenied(false);
    }, [citySlug]);

    const requestLocationSort = () => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setGeoDenied(true);
            return;
        }
        setGeoDenied(false);
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
                setGeoDenied(true);
            },
            { enableHighAccuracy: false, timeout: 15_000, maximumAge: 0 },
        );
    };

    return (
        <AppLayout>
            <SeoHead title={`${cityName} — Popüler etkinlikler`} description={desc} />

            <div className="-mx-2.5 w-[calc(100%+1.25rem)] max-w-none sm:-mx-4 sm:w-[calc(100%+2rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]">
                <section className="relative overflow-hidden border-b border-zinc-200 bg-zinc-950 px-4 py-10 dark:border-zinc-800 sm:px-6 lg:px-8">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/40 via-zinc-950 to-zinc-950" />
                    <div className="relative z-10 mx-auto max-w-7xl">
                        <Link
                            href={
                                hasServerNear
                                    ? route('sehir-sec', { sehir: citySlug, near_lat: nearLat, near_lng: nearLng })
                                    : route('sehir-sec', { sehir: citySlug })
                            }
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

                        {!hasServerNear ? (
                            <div className="mt-5 max-w-xl rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-zinc-200">
                                <p className="leading-relaxed text-zinc-300">
                                    Yakınınızdaki mekânlara göre sıralamak için konum izni gerekir. İzin vermezseniz liste varsayılan sırayla
                                    kalır; dilediğiniz zaman tekrar deneyebilirsiniz.
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={requestLocationSort}
                                        disabled={geoHint !== null}
                                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                                        {geoHint ? 'Konum alınıyor…' : 'Konumuma göre sırala'}
                                    </button>
                                    {geoDenied && !geoHint ? (
                                        <button
                                            type="button"
                                            onClick={requestLocationSort}
                                            className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-emerald-200 hover:border-emerald-400/50"
                                        >
                                            Tekrar dene
                                        </button>
                                    ) : null}
                                </div>
                                {geoDenied && !geoHint ? (
                                    <p className="mt-2 text-xs text-zinc-500">
                                        İzin reddedildiyse tarayıcıda site ayarlarından konumu açıp yeniden deneyin.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

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

                        {(districts.length > 0 || genres.length > 0 || categories.length > 0) && (
                            <div className="mt-6 max-w-4xl">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {districts.length > 0 && (
                                        <div className="min-w-0">
                                            <label
                                                htmlFor="sehir-sec-ilce"
                                                className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500"
                                            >
                                                <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
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
                                        </div>
                                    )}

                                    {genres.length > 0 && (
                                        <div className="min-w-0">
                                            <label
                                                htmlFor="sehir-sec-sanat-turu"
                                                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                                            >
                                                Tür (sanatçı)
                                            </label>
                                            <select
                                                id="sehir-sec-sanat-turu"
                                                value={activeGenreSlug ?? ''}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    router.get(
                                                        cityListHref(citySlug, {
                                                            sanat_turu: v || null,
                                                            kategori: activeCategorySlug,
                                                            ilce: activeDistrictSlug,
                                                            ...nearPair,
                                                        }),
                                                        {},
                                                        { preserveScroll: true },
                                                    );
                                                }}
                                                className="w-full rounded-xl border border-white/20 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none ring-emerald-500/40 focus:border-emerald-500/50 focus:ring-2"
                                            >
                                                <option value="">Tüm türler</option>
                                                {genres.map((t) => (
                                                    <option key={t.slug} value={t.slug}>
                                                        {t.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {categories.length > 0 && (
                                        <div className="min-w-0">
                                            <label
                                                htmlFor="sehir-sec-kategori"
                                                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                                            >
                                                Kategori
                                            </label>
                                            <select
                                                id="sehir-sec-kategori"
                                                value={activeCategorySlug ?? ''}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    router.get(
                                                        cityListHref(citySlug, {
                                                            kategori: v || null,
                                                            ilce: activeDistrictSlug,
                                                            sanat_turu: activeGenreSlug,
                                                            ...nearPair,
                                                        }),
                                                        {},
                                                        { preserveScroll: true },
                                                    );
                                                }}
                                                className="w-full rounded-xl border border-white/20 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none ring-emerald-500/40 focus:border-emerald-500/50 focus:ring-2"
                                            >
                                                <option value="">Tüm kategoriler</option>
                                                {categories.map((c) => (
                                                    <option key={c.slug} value={c.slug}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                {districts.length > 0 && (
                                    <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-zinc-500">
                                        Konum izni verirseniz liste yakın mekânlara göre sıralanır. İlçe seçmek listeyi daraltır;
                                        &quot;Tüm ilçeler&quot; yakınlık sıralamasını korur.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-4 sm:py-10 lg:px-8">
                    <CityPromoStories rings={promoStoryRings} />
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
                        <div className="grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                            {events.data.map((ev) => (
                                <PublicEventTicketCard
                                    key={ev.id}
                                    event={ev}
                                    distanceKm={typeof ev.distance_km === 'number' ? ev.distance_km : null}
                                />
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
