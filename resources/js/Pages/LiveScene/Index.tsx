import LiveSceneHeatMap, { type LiveSceneSpot } from '@/Components/LiveScene/LiveSceneHeatMap';
import SeoHead from '@/Components/SeoHead';
import { cn } from '@/lib/cn';
import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowRight,
    Calendar,
    Flame,
    Loader2,
    MapPin,
    Navigation,
    RefreshCw,
    Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface VibeOption {
    id: string;
    title: string;
    subtitle: string;
    hint: string;
}

interface MapPayload {
    generated_at: string;
    vibe: string | null;
    spots: LiveSceneSpot[];
    popular: LiveSceneSpot[];
    stats: { venue_count: number; event_count: number };
}

interface Props {
    vibes: VibeOption[];
    initialVibe: string;
}

const VIBE_CARD_RING: Record<string, string> = {
    sahne_konser: 'from-rose-500/90 via-amber-500/80 to-orange-600/90',
    gece_kulubu: 'from-violet-600/90 via-fuchsia-500/80 to-pink-500/90',
    rahat_sosyal: 'from-emerald-500/85 via-teal-400/75 to-cyan-500/85',
    kultur: 'from-sky-600/85 via-indigo-500/75 to-violet-600/85',
    komedi: 'from-amber-500/85 via-yellow-400/70 to-lime-500/80',
    aile: 'from-orange-400/85 via-pink-400/75 to-red-400/80',
};

function formatUpdated(iso: string | null): string {
    if (!iso) {
        return '—';
    }
    try {
        return new Intl.DateTimeFormat('tr-TR', {
            dateStyle: 'short',
            timeStyle: 'medium',
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

export default function LiveSceneIndex({ vibes, initialVibe }: Readonly<Props>) {
    const [vibe, setVibe] = useState(() => (initialVibe && vibes.some((v) => v.id === initialVibe) ? initialVibe : ''));
    const [payload, setPayload] = useState<MapPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [highlightVenueId, setHighlightVenueId] = useState<number | null>(null);

    const replaceUrlVibe = useCallback((next: string) => {
        if (typeof window === 'undefined') {
            return;
        }
        const u = new URL(window.location.href);
        if (next) {
            u.searchParams.set('vibe', next);
        } else {
            u.searchParams.delete('vibe');
        }
        window.history.replaceState({}, '', u.toString());
    }, []);

    const fetchMap = useCallback(async (vibeParam: string) => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get<MapPayload>(route('api.live-scene'), {
                params: vibeParam ? { vibe: vibeParam } : {},
            });
            setPayload(data);
        } catch {
            setError('Harita verisi yüklenemedi. Bağlantınızı kontrol edip yenileyin.');
            setPayload(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchMap(vibe);
    }, [vibe, fetchMap]);

    useEffect(() => {
        const t = window.setInterval(() => {
            void fetchMap(vibe);
        }, 90_000);
        return () => window.clearInterval(t);
    }, [vibe, fetchMap]);

    const selectVibe = useCallback(
        (id: string) => {
            const next = vibe === id ? '' : id;
            setVibe(next);
            replaceUrlVibe(next);
            setHighlightVenueId(null);
        },
        [vibe, replaceUrlVibe]
    );

    const spots = payload?.spots ?? [];
    const popular = payload?.popular ?? [];
    const stats = payload?.stats ?? { venue_count: 0, event_count: 0 };

    const browseWeekHref = useMemo(() => {
        const params: Record<string, string> = { period: 'week' };
        if (vibe === 'sahne_konser') {
            params.event_type = 'konser';
        } else if (vibe === 'kultur') {
            params.event_type = 'tiyatro';
        } else if (vibe === 'komedi') {
            params.event_type = 'stand-up';
        } else if (vibe === 'aile') {
            params.event_type = 'cocuk-aktiviteleri';
        }
        return route('events.index', params);
    }, [vibe]);

    const browseTodayHref = useMemo(() => {
        const params: Record<string, string> = { period: 'today' };
        if (vibe === 'sahne_konser') {
            params.event_type = 'konser';
        } else if (vibe === 'kultur') {
            params.event_type = 'tiyatro';
        } else if (vibe === 'komedi') {
            params.event_type = 'stand-up';
        } else if (vibe === 'aile') {
            params.event_type = 'cocuk-aktiviteleri';
        }
        return route('events.index', params);
    }, [vibe]);

    return (
        <AppLayout>
            <SeoHead
                title="Nereye mi gidelim? — Yakındaki etkinlikler, canlı harita | Sahnebul"
                description="Yakınınızdaki konser ve etkinlikleri haritada keşfedin; tarza göre süzün, yoğun bölgeleri görün, etkinliğe veya yol tarifine geçin."
            />

            <div className="isolate min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
                <section className="relative isolate ml-[calc(50%-50vw)] w-screen max-w-[100vw] overflow-hidden border-b border-zinc-200/80 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-3 py-16 text-white sm:px-5 sm:py-20 lg:px-8 lg:py-24">
                    <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-amber-500/25 blur-3xl" />
                    <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                    <div className="relative mx-auto max-w-7xl">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/95">
                            <Sparkles className="h-4 w-4" aria-hidden />
                            Yakındaki etkinlikler
                        </div>
                        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                            Nereye mi{' '}
                            <span className="text-transparent bg-gradient-to-r from-amber-300 via-amber-400 to-orange-300 bg-clip-text">gidelim?</span>
                        </h1>
                        <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
                            Harita <strong className="font-semibold text-zinc-100">bugünden itibaren 7 gün</strong> içindeki etkinlikleri gösterir;{' '}
                            <strong className="font-semibold text-zinc-100">bugünkü olanlar</strong> listede ve işaretçi açılır penceresinde öne çıkar. Yoğunluk,
                            seçtiğiniz tarza göre bu penceredeki etkinlik sayısına göre hesaplanır.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href={browseWeekHref}
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300"
                            >
                                7 günlük etkinlik listesi
                                <ArrowRight className="h-4 w-4" aria-hidden />
                            </Link>
                            <Link
                                href={browseTodayHref}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                            >
                                <Calendar className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                                Sadece bugün
                            </Link>
                            <button
                                type="button"
                                onClick={() => void fetchMap(vibe)}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
                            >
                                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
                                Yenile
                            </button>
                        </div>
                    </div>
                </section>

                <div className="mx-auto max-w-7xl px-3 py-10 sm:px-5 lg:px-8 lg:py-14">
                    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Tarzını seç</h2>
                            <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                                Her kart haritayı ve listeyi daraltır (7 günlük pencerede); «Tümü» ile aynı tarih aralığında genel yoğunluğu görürsün.
                            </p>
                        </div>
                        {payload?.generated_at ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-500">Son güncelleme: {formatUpdated(payload.generated_at)}</p>
                        ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <button
                            type="button"
                            onClick={() => selectVibe('')}
                            className={cn(
                                'group relative overflow-hidden rounded-2xl border p-5 text-left transition',
                                vibe === ''
                                    ? 'border-amber-500/70 bg-amber-500/10 ring-2 ring-amber-500/30'
                                    : 'border-zinc-200 bg-white hover:border-amber-400/40 dark:border-white/10 dark:bg-zinc-900/50 dark:hover:border-amber-500/30'
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Genel</p>
                                    <p className="mt-1 font-display text-lg font-bold text-zinc-900 dark:text-white">Tüm etkinlikler</p>
                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Filtresiz canlı yoğunluk</p>
                                </div>
                                <MapPin className="h-8 w-8 shrink-0 opacity-40 group-hover:opacity-70" aria-hidden />
                            </div>
                        </button>
                        {vibes.map((v) => {
                            const active = vibe === v.id;
                            const grad = VIBE_CARD_RING[v.id] ?? 'from-amber-500/80 via-orange-500/70 to-rose-500/80';
                            return (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => selectVibe(v.id)}
                                    className={cn(
                                        'relative overflow-hidden rounded-2xl border p-5 text-left transition',
                                        active
                                            ? 'border-transparent bg-zinc-900 text-white ring-2 ring-amber-400/60 dark:ring-amber-400/40'
                                            : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900/40 dark:hover:border-white/20'
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'pointer-events-none absolute inset-0 opacity-20',
                                            active ? `bg-gradient-to-br ${grad}` : 'bg-gradient-to-br from-zinc-500/0 to-zinc-500/10'
                                        )}
                                    />
                                    <div className="relative">
                                        <p
                                            className={cn(
                                                'text-xs font-semibold uppercase tracking-wider',
                                                active ? 'text-amber-200' : 'text-amber-700 dark:text-amber-400'
                                            )}
                                        >
                                            {v.hint}
                                        </p>
                                        <p className={cn('mt-1 font-display text-lg font-bold', active ? 'text-white' : 'text-zinc-900 dark:text-white')}>
                                            {v.title}
                                        </p>
                                        <p className={cn('mt-1 text-sm', active ? 'text-zinc-200' : 'text-zinc-600 dark:text-zinc-400')}>{v.subtitle}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-10 grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900/50">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Canlı mekân</p>
                            <p className="mt-1 font-display text-3xl font-bold text-zinc-900 dark:text-white">{stats.venue_count}</p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900/50">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Etkinlik (7 gün)</p>
                            <p className="mt-1 font-display text-3xl font-bold text-zinc-900 dark:text-white">{stats.event_count}</p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900/50">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Yoğunluk göstergesi</p>
                            <ul className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
                                <li className="inline-flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
                                    Sakin
                                </li>
                                <li className="inline-flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" aria-hidden />
                                    Hareketli
                                </li>
                                <li className="inline-flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" aria-hidden />
                                    Kalabalık
                                </li>
                                <li className="inline-flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden />
                                    Çok yoğun
                                </li>
                            </ul>
                        </div>
                    </div>

                    {error ? (
                        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-200">
                            {error}
                        </div>
                    ) : null}

                    <div className="mt-10 grid items-start gap-8 lg:grid-cols-5">
                        <div className="lg:col-span-3">
                            <div className="mb-3 flex items-center gap-2">
                                <Flame className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
                                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">Canlı ısı haritası</h2>
                            </div>
                            <div className="relative h-[min(68vh,560px)] overflow-hidden rounded-2xl border border-zinc-200 shadow-lg dark:border-white/10 dark:shadow-none">
                                {loading && spots.length === 0 ? (
                                    <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-3 bg-zinc-100/90 text-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-300">
                                        <Loader2 className="h-10 w-10 animate-spin text-amber-600" aria-hidden />
                                        <p className="text-sm font-medium">Harita hazırlanıyor…</p>
                                    </div>
                                ) : null}
                                <LiveSceneHeatMap spots={spots} highlightVenueId={highlightVenueId} className="h-full" />
                            </div>
                            <p className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-500">
                                Marker boyutu ve renk — seçili 7 günlük pencerede o mekândaki etkinlik sayısına göre ölçeklenir (yoğunluk görecelidir).
                            </p>
                        </div>

                        <aside className="flex min-h-0 flex-col lg:col-span-2">
                            <div className="mb-3 shrink-0 flex gap-2">
                                <Navigation className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                                <div>
                                    <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">Yoğun mekânlar</h2>
                                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                                        Önce bugünkü etkinliği olanlar, sonra önümüzdeki günler.
                                    </p>
                                </div>
                            </div>
                            {popular.length === 0 && !loading ? (
                                <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-400">
                                    Bu seçimle haritada gösterilecek etkinlik yok. Farklı bir tarz deneyin veya{' '}
                                    <button
                                        type="button"
                                        className="font-semibold text-amber-700 underline dark:text-amber-400"
                                        onClick={() => router.get(route('events.index', { period: 'week' }))}
                                    >
                                        yakın tarihleri
                                    </button>{' '}
                                    açın.
                                </div>
                            ) : (
                                <div
                                    className="max-h-[min(68vh,560px)] min-h-0 overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]"
                                    role="region"
                                    aria-label="Yoğun mekânlar listesi"
                                >
                                <ul className="space-y-2 pb-1">
                                    {popular.map((p, idx) => {
                                        const prev = idx > 0 ? popular[idx - 1] : null;
                                        const todayN = p.today_event_count ?? 0;
                                        let sectionTitle: string | null = null;
                                        if (idx === 0) {
                                            sectionTitle = todayN > 0 ? 'Bugün' : 'Önümüzdeki 7 gün';
                                        } else if (prev && (prev.today_event_count ?? 0) > 0 && todayN === 0) {
                                            sectionTitle = 'Önümüzdeki günler';
                                        }
                                        return (
                                            <li key={p.venue_id} className="space-y-2">
                                                {sectionTitle ? (
                                                    <p className="pt-2 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                                        {sectionTitle}
                                                    </p>
                                                ) : null}
                                                <button
                                                type="button"
                                                onClick={() => setHighlightVenueId(p.venue_id === highlightVenueId ? null : p.venue_id)}
                                                className={cn(
                                                    'flex w-full flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition',
                                                    highlightVenueId === p.venue_id
                                                        ? 'border-amber-500/70 bg-amber-500/10 ring-1 ring-amber-500/25'
                                                        : 'border-zinc-200 bg-white hover:border-amber-400/40 dark:border-white/10 dark:bg-zinc-900/40 dark:hover:border-amber-500/25'
                                                )}
                                            >
                                                <span className="flex items-baseline justify-between gap-2">
                                                    <span className="min-w-0 font-semibold text-zinc-900 dark:text-white">
                                                        <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="align-middle">{p.name}</span>
                                                    </span>
                                                    <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                                                        {todayN > 0 ? (
                                                            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-zinc-950">
                                                                {todayN} bugün
                                                            </span>
                                                        ) : null}
                                                        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                                                            {p.event_count} / 7 gün
                                                        </span>
                                                    </span>
                                                </span>
                                                {(p.city_name || p.category_name) && (
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                        {[p.category_name, p.city_name].filter(Boolean).join(' · ')}
                                                    </span>
                                                )}
                                            </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
