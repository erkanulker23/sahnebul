import SeoHead from '@/Components/SeoHead';
import { externalDisKaynakSegment } from '@/lib/eventShowUrl';
import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';
import { MapPin, Ticket } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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
    city_label: string | null;
    internal_event_segment: string | null;
}

interface CitySection {
    slug: string;
    name: string;
    events: BubiletEvent[];
}

interface Props {
    citySections: CitySection[];
    initialSlug: string | null;
}

export default function SehirSec({ citySections, initialSlug }: Readonly<Props>) {
    const [activeSlug, setActiveSlug] = useState<string>(initialSlug ?? citySections[0]?.slug ?? '');
    const didScrollRef = useRef(false);

    const scrollToCity = useCallback((slug: string) => {
        const el = document.getElementById(`sehir-${slug}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setActiveSlug(slug);
        const url = new URL(globalThis.location.href);
        url.searchParams.set('sehir', slug);
        globalThis.history.replaceState({}, '', url.toString());
    }, []);

    useEffect(() => {
        if (didScrollRef.current || !initialSlug) {
            return;
        }
        didScrollRef.current = true;
        const id = `sehir-${initialSlug}`;
        const t = globalThis.setTimeout(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' });
        }, 100);
        return () => globalThis.clearTimeout(t);
    }, [initialSlug]);

    return (
        <AppLayout>
            <SeoHead
                title="Şehrini seç"
                description="Şehrine göre Sahnebul etkinlikleri — /etkinlikler ile aynı yayınlanmış program."
            />

            <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
                <section className="relative min-h-[min(52vh,28rem)] overflow-hidden">
                    <img
                        src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=2400&auto=format&fit=crop"
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/72 to-black/88" />
                    <div className="relative z-10 flex flex-col items-center px-4 pb-28 pt-14 text-center md:pb-32 md:pt-20">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Keşfet</p>
                        <h1 className="max-w-3xl text-3xl font-bold leading-tight text-white md:text-5xl">
                            Şehrin tadını{' '}
                            <span className="inline-flex items-center gap-2 text-emerald-400">
                                <Ticket className="h-7 w-7 shrink-0 md:h-10 md:w-10" aria-hidden />
                                Sahnebul
                            </span>{' '}
                            ile çıkar!
                        </h1>
                        <p className="mt-5 max-w-lg text-sm text-white/90 md:text-base">
                            Şehrindeki etkinlikleri görmek için bulunduğun şehre tıkla veya aşağı kaydır
                        </p>

                        <div className="mt-10 flex max-w-4xl flex-wrap justify-center gap-2">
                            {citySections.map((c) => (
                                <button
                                    key={c.slug}
                                    type="button"
                                    onClick={() => scrollToCity(c.slug)}
                                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition md:text-base ${
                                        activeSlug === c.slug
                                            ? 'border-emerald-400 bg-emerald-500/25 text-white shadow-lg shadow-emerald-500/10'
                                            : 'border-white/35 bg-black/25 text-white backdrop-blur-sm hover:border-emerald-400/50'
                                    }`}
                                >
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                                    {c.name}
                                </button>
                            ))}
                        </div>

                        {citySections.length === 0 && (
                            <p className="mt-8 max-w-md text-sm text-white/80">
                                Bu sayfada henüz şehir bazlı öne çıkan liste yok. Platformdaki etkinliklere{' '}
                                <Link href={route('events.index')} className="font-medium text-emerald-300 underline-offset-2 hover:underline">
                                    Etkinlikler
                                </Link>{' '}
                                üzerinden göz atabilirsiniz.
                            </p>
                        )}
                    </div>
                </section>

                <div className="relative -mt-12 rounded-t-3xl bg-white px-4 pb-16 pt-10 shadow-[0_-12px_48px_rgba(0,0,0,0.12)] dark:bg-zinc-900 dark:shadow-black/40 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <p className="mb-10 text-sm text-zinc-600 dark:text-zinc-400">
                            Aşağıda her şehir için popüler etkinlikler ayrı bölümde listelenir.
                        </p>

                        {citySections.map((section, index) => (
                            <section
                                key={section.slug}
                                id={`sehir-${section.slug}`}
                                className={`scroll-mt-28 ${index > 0 ? 'mt-10 border-t border-zinc-200 pt-10 dark:border-zinc-700' : ''}`}
                            >
                                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl md:text-3xl">
                                        {section.name}
                                        &apos;daki popüler etkinlikler
                                    </h2>
                                    {section.events.length > 0 ? (
                                        <Link
                                            href={route('sehir-sec.city', { city: section.slug })}
                                            className="shrink-0 text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                                        >
                                            Tümünü görüntüle →
                                        </Link>
                                    ) : null}
                                </div>

                                {section.events.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                                        Bu şehir için henüz öne çıkan etkinlik listelenmiyor. Tüm etkinliklere{' '}
                                        <Link
                                            href={route('events.index')}
                                            className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                                        >
                                            buradan
                                        </Link>{' '}
                                        ulaşabilirsiniz.
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                            {section.events.map((ev) => (
                                                <BubiletEventCard
                                                    key={ev.item_key ?? `${section.slug}-${ev.id}`}
                                                    ev={ev}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        ))}

                        <p className="mt-12 text-center text-xs text-zinc-500 dark:text-zinc-500">
                            Kartlar, platformda yayınlanmış etkinlik kayıtlarıdır (/etkinlikler ile aynı kaynak).
                        </p>
                    </div>
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
    const districtTop = typeof ev.district_label === 'string' ? ev.district_label.trim() : '';
    const cityTop = typeof ev.city_label === 'string' ? ev.city_label.trim() : '';
    const showLocationTop = districtTop !== '' || cityTop !== '';
    const locationTitle = [districtTop, cityTop].filter(Boolean).join(', ');

    return (
        <Link
            href={bubiletEventDetailHref(ev)}
            className="group relative block w-[192px] shrink-0 snap-start scroll-ml-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
            {ev.rank != null && (
                <span
                    className="pointer-events-none absolute left-0 top-1/2 z-0 -translate-y-1/2 select-none text-[180px] font-black leading-none text-transparent sm:text-[220px]"
                    style={{ WebkitTextStroke: '2px rgba(16, 185, 129, 0.5)' }}
                    aria-hidden
                >
                    {ev.rank}
                </span>
            )}
            <div className="relative z-[2] flex h-[272px] w-[192px] flex-col overflow-hidden rounded-2xl bg-zinc-800 shadow-lg transition duration-300 group-hover:scale-[1.03] group-hover:shadow-2xl">
                {ev.image_url ? (
                    <img src={ev.image_url} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-110" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/45 to-transparent" />
                {showLocationTop ? (
                    <div className="pointer-events-none absolute left-2 right-2 top-2 z-[6] md:left-3 md:right-3 md:top-3">
                        <span
                            className="inline-flex w-full max-w-full items-start gap-1 rounded-lg bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 px-2 py-1.5 text-white shadow-lg shadow-fuchsia-900/30 ring-1 ring-white/25"
                            title={locationTitle}
                        >
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-white/95" aria-hidden />
                            <span className="min-w-0 flex-1 text-left">
                                {districtTop !== '' ? (
                                    <span className="block text-pretty break-words text-[8px] font-bold leading-snug text-white/95">
                                        {districtTop}
                                    </span>
                                ) : null}
                                {cityTop !== '' ? (
                                    <span
                                        className={`block text-pretty break-words font-bold leading-snug ${
                                            districtTop !== '' ? 'mt-0.5 text-[9px] text-white' : 'text-[9px]'
                                        }`}
                                    >
                                        {cityTop}
                                    </span>
                                ) : null}
                            </span>
                        </span>
                    </div>
                ) : null}
                {ev.category_name && (
                    <div className="relative z-[5] p-3 pb-0 md:p-4 md:pb-0">
                        <span className="inline-block max-w-[90%] truncate rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 backdrop-blur-sm">
                            {ev.category_name}
                        </span>
                    </div>
                )}
                <div className="relative z-[5] mt-auto flex flex-col justify-end p-3 text-white md:p-4">
                    <h3 className="line-clamp-2 text-base font-semibold leading-snug">{ev.title}</h3>
                    {ev.dates_line && <p className="mt-1 line-clamp-2 text-xs text-slate-200">{ev.dates_line}</p>}
                    {ev.venue_name && <p className="line-clamp-2 text-xs text-slate-300">{ev.venue_name}</p>}
                    {ev.price_label && <p className="mt-2 text-base font-bold text-emerald-400">{ev.price_label}</p>}
                </div>
            </div>
        </Link>
    );
}
