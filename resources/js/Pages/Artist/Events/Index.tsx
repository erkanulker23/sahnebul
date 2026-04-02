import { EventListingHeroPlaceholder } from '@/Components/EventListingHeroPlaceholder';
import { sanitizeHtmlForInnerHtml } from '@/Components/SafeRichContent';
import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { resolveEventCardVisual } from '@/lib/eventListingVisual';
import { eventStatusTr } from '@/lib/statusLabels';
import { Link, router } from '@inertiajs/react';
import { Building2, CalendarDays, Eye, MapPin, Ticket, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface PaginatorLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Event {
    id: number;
    title: string;
    start_date: string | null;
    end_date?: string | null;
    event_type?: string | null;
    status: string;
    cover_image?: string | null;
    listing_image?: string | null;
    ticket_price?: number | string | null;
    entry_is_paid?: boolean;
    view_count?: number;
    min_price?: number | null;
    public_url_segment?: string | null;
    panel_can_edit?: boolean;
    panel_can_edit_artist_profile_promo?: boolean;
    artist_report?: { status: string; id: number } | null;
    venue: { name: string; slug: string };
    artists?: { id: number; name: string }[];
}

interface PaginatedEvents {
    data: Event[];
    links: PaginatorLink[];
    last_page?: number;
}

type ListFilter = 'all' | 'upcoming' | 'past' | 'draft';

interface Props {
    events: PaginatedEvents;
    canCreateEvent?: boolean;
    stats: { total: number; upcoming: number; past: number; drafts: number };
    filter: ListFilter;
    /** Backend: hesapta mekân satırı varsa liste yalnızca bu mekânlara ait etkinlikleri gösterir. */
    listsOnlyOwnedVenueEvents?: boolean;
}

function formatInt(n: number | undefined): string {
    return (n ?? 0).toLocaleString('tr-TR');
}

function formatTry(n: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

function imageSrc(path: string | null | undefined): string | null {
    const p = path?.trim();
    if (!p) return null;
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    return `/storage/${p}`;
}

function reportStatusHint(status: string): string {
    switch (status) {
        case 'pending':
            return 'Raporunuz inceleniyor.';
        case 'resolved':
            return 'Raporunuz sonuçlandı.';
        case 'dismissed':
            return 'Raporunuz kapatıldı.';
        default:
            return '';
    }
}

function displayPrice(ev: Event): string | null {
    if (ev.entry_is_paid === false) {
        return 'Ücretsiz giriş';
    }
    if (ev.min_price != null && ev.min_price > 0) {
        return formatTry(ev.min_price);
    }
    const tp = ev.ticket_price;
    if (tp != null && tp !== '') {
        const n = typeof tp === 'string' ? Number.parseFloat(tp) : tp;
        if (!Number.isNaN(n) && n > 0) return formatTry(n);
    }
    return null;
}

function lineupLabel(artists: Event['artists']): string | null {
    if (!artists?.length) return null;
    return artists.map((a) => a.name).join(' · ');
}

const filterTabs: { key: ListFilter; label: string; countKey: keyof Props['stats'] }[] = [
    { key: 'all', label: 'Tümü', countKey: 'total' },
    { key: 'upcoming', label: 'Yaklaşan', countKey: 'upcoming' },
    { key: 'past', label: 'Geçmiş', countKey: 'past' },
    { key: 'draft', label: 'Taslak', countKey: 'drafts' },
];

export default function ArtistEventsIndex({
    events,
    canCreateEvent = false,
    stats,
    filter,
    listsOnlyOwnedVenueEvents = false,
}: Readonly<Props>) {
    const [openReportForId, setOpenReportForId] = useState<number | null>(null);
    const [reportMessage, setReportMessage] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);

    const submitReport = (e: FormEvent, eventId: number) => {
        e.preventDefault();
        setReportSubmitting(true);
        router.post(
            route('artist.events.report', eventId),
            { message: reportMessage },
            {
                preserveScroll: true,
                onFinish: () => setReportSubmitting(false),
                onSuccess: () => {
                    setOpenReportForId(null);
                    setReportMessage('');
                },
            },
        );
    };

    const filterHref = (key: ListFilter) =>
        key === 'all' ? route('artist.events.index') : `${route('artist.events.index')}?filter=${key}`;

    return (
        <ArtistLayout>
            <SeoHead title="Etkinlikler - Sahnebul" description="Mekan paneli etkinlik listesi." noindex />

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">Etkinlikler</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                        {listsOnlyOwnedVenueEvents
                            ? 'Hesabınıza kayıtlı mekân(lar)ınızda yer alan etkinlikler burada listelenir. Başka mekânlarda kadroda olduğunuz etkinlikler bu sayfada gösterilmez.'
                            : 'Mekânınıza ait etkinlikleri buradan yönetin; sanatçı olarak davet edildiğiniz etkinlikler de listelenir — düzenleme yetkisi yalnızca mekân sahibindedir.'}
                    </p>
                </div>
                {canCreateEvent ? (
                    <Link
                        href={route('artist.events.create')}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/10 transition hover:bg-amber-400"
                    >
                        + Etkinlik ekle
                    </Link>
                ) : null}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Toplam kayıt', value: stats.total, hint: 'Listede gördüğünüz tüm etkinlikler', accent: 'text-zinc-100' },
                    { label: 'Yaklaşan', value: stats.upcoming, hint: 'Tarihi gelmemiş', accent: 'text-emerald-400' },
                    { label: 'Geçmiş', value: stats.past, hint: 'Tarihi geçmiş', accent: 'text-zinc-300' },
                    { label: 'Taslak', value: stats.drafts, hint: 'Yayında değil', accent: 'text-amber-400' },
                ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{s.label}</p>
                        <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${s.accent}`}>{formatInt(s.value)}</p>
                        <p className="mt-1 text-xs text-zinc-600">{s.hint}</p>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
                {filterTabs.map((tab) => {
                    const active = filter === tab.key;
                    const count = stats[tab.countKey];
                    return (
                        <Link
                            key={tab.key}
                            href={filterHref(tab.key)}
                            preserveState
                            preserveScroll
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                                active
                                    ? 'bg-amber-500 text-zinc-950'
                                    : 'border border-white/10 bg-zinc-900/40 text-zinc-300 hover:border-amber-500/30 hover:text-white'
                            }`}
                        >
                            {tab.label}
                            <span
                                className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                                    active ? 'bg-zinc-950/15 text-zinc-900' : 'bg-black/30 text-zinc-400'
                                }`}
                            >
                                {count}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {events.data.length === 0 ? (
                <div className="mt-12 rounded-2xl border border-dashed border-white/15 bg-zinc-900/30 px-6 py-16 text-center">
                    <CalendarDays className="mx-auto h-12 w-12 text-zinc-600" aria-hidden />
                    <p className="mt-4 font-medium text-zinc-300">Bu görünümde etkinlik yok</p>
                    <p className="mt-2 text-sm text-zinc-500">
                        Filtreyi değiştirin veya {canCreateEvent ? 'yeni bir etkinlik oluşturun.' : 'mekân sahibi hesabınızla etkinlik ekleyin.'}
                    </p>
                    {canCreateEvent ? (
                        <Link
                            href={route('artist.events.create')}
                            className="mt-6 inline-flex rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                        >
                            Etkinlik oluştur
                        </Link>
                    ) : null}
                </div>
            ) : (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {events.data.map((ev) => {
                        const { src: cover, objectFit } = resolveEventCardVisual({
                            listing_image: ev.listing_image,
                            cover_image: ev.cover_image,
                            imageSrc,
                        });
                        const coverFit = objectFit === 'contain' ? 'object-contain object-center' : 'object-cover';
                        const priceLabel = displayPrice(ev);
                        const lineup = lineupLabel(ev.artists);
                        const when = ev.start_date ? formatTurkishDateTime(ev.start_date) : 'Tarih atanmadı';

                        return (
                            <article
                                key={ev.id}
                                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 shadow-lg shadow-black/20 transition hover:border-amber-500/25"
                            >
                                <div className="relative aspect-[16/10] overflow-hidden bg-zinc-800">
                                    {cover ? (
                                        <img
                                            src={cover}
                                            alt=""
                                            className={`h-full w-full ${coverFit} transition duration-300 group-hover:scale-[1.02]`}
                                        />
                                    ) : (
                                        <EventListingHeroPlaceholder
                                            eventId={ev.id}
                                            slug={ev.public_url_segment?.trim() ? ev.public_url_segment : `id-${ev.id}`}
                                            eventType={ev.event_type}
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                    ev.status === 'published' ? 'bg-emerald-500/90 text-white' : 'bg-zinc-600/90 text-zinc-100'
                                                }`}
                                            >
                                                {eventStatusTr(ev.status)}
                                            </span>
                                            {ev.panel_can_edit ? (
                                                <span className="rounded-full bg-amber-500/90 px-2.5 py-0.5 text-xs font-semibold text-zinc-950">
                                                    Mekânınız
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-violet-500/25 px-2.5 py-0.5 text-xs font-medium text-violet-200">
                                                    Kadroda
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="mt-2 line-clamp-2 font-display text-lg font-bold leading-snug text-white">{ev.title}</h2>
                                    </div>
                                </div>

                                <div className="flex flex-1 flex-col gap-3 p-4">
                                    <Link
                                        href={route('venues.show', ev.venue.slug)}
                                        className="inline-flex items-start gap-2 text-sm text-zinc-400 transition hover:text-amber-400"
                                    >
                                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                                        <span className="min-w-0">{ev.venue.name}</span>
                                    </Link>
                                    <p className="flex items-start gap-2 text-sm text-zinc-300">
                                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/80" aria-hidden />
                                        <span>{when}</span>
                                    </p>
                                    {lineup ? (
                                        <p className="flex items-start gap-2 text-xs leading-relaxed text-zinc-500">
                                            <Users className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
                                            <span className="line-clamp-2">{lineup}</span>
                                        </p>
                                    ) : null}
                                    <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-white/5 pt-3 text-xs text-zinc-500">
                                        <span className="inline-flex items-center gap-1 tabular-nums">
                                            <Eye className="h-3.5 w-3.5" aria-hidden />
                                            {formatInt(ev.view_count)} görüntülenme
                                        </span>
                                        {priceLabel ? (
                                            <span className="inline-flex items-center gap-1 font-medium text-emerald-400/90">
                                                <Ticket className="h-3.5 w-3.5" aria-hidden />
                                                {priceLabel}
                                            </span>
                                        ) : null}
                                    </div>

                                    {ev.panel_can_edit === false && ev.artist_report?.status === 'pending' ? (
                                        <p className="text-xs text-amber-200/90">{reportStatusHint('pending')}</p>
                                    ) : null}
                                    {ev.panel_can_edit === false && ev.artist_report && ev.artist_report.status !== 'pending' ? (
                                        <p className="text-xs text-zinc-500">{reportStatusHint(ev.artist_report.status)}</p>
                                    ) : null}

                                    {openReportForId === ev.id ? (
                                        <form onSubmit={(e) => submitReport(e, ev.id)} className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
                                            <label htmlFor={`report-msg-${ev.id}`} className="block text-xs font-medium text-zinc-400">
                                                Yöneticilere not (en az 10 karakter)
                                            </label>
                                            <textarea
                                                id={`report-msg-${ev.id}`}
                                                required
                                                minLength={10}
                                                maxLength={2000}
                                                rows={3}
                                                value={reportMessage}
                                                onChange={(e) => setReportMessage(e.target.value)}
                                                className="w-full rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                                                placeholder="Örn. Bu etkinlikte yer almıyorum…"
                                            />
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={reportSubmitting}
                                                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                                                >
                                                    Gönder
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOpenReportForId(null);
                                                        setReportMessage('');
                                                    }}
                                                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
                                                >
                                                    Vazgeç
                                                </button>
                                            </div>
                                        </form>
                                    ) : null}

                                    <div className="flex flex-wrap gap-2">
                                        {ev.public_url_segment ? (
                                            <Link
                                                href={route('events.show', { event: ev.public_url_segment })}
                                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-200 sm:flex-none"
                                            >
                                                <Building2 className="h-4 w-4 opacity-80" aria-hidden />
                                                Sayfayı aç
                                            </Link>
                                        ) : null}
                                        {ev.panel_can_edit === true ? (
                                            <Link
                                                href={route('artist.events.edit', ev.id)}
                                                className="inline-flex flex-1 items-center justify-center rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 sm:flex-none"
                                            >
                                                Düzenle
                                            </Link>
                                        ) : (
                                            <span className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/5 px-3 py-2 text-xs text-zinc-500 sm:flex-none">
                                                Düzenleme: mekân sahibi
                                            </span>
                                        )}
                                        {ev.panel_can_edit_artist_profile_promo ? (
                                            <Link
                                                href={route('artist.events.artist-profile-promo.edit', ev.id)}
                                                className="inline-flex flex-1 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-500/20 sm:flex-none"
                                            >
                                                Sanatçı profil tanıtımı
                                            </Link>
                                        ) : null}
                                    </div>
                                    {ev.panel_can_edit === false && ev.artist_report?.status !== 'pending' && openReportForId !== ev.id ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOpenReportForId(ev.id);
                                                setReportMessage('');
                                            }}
                                            className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20"
                                        >
                                            Sorun bildir
                                        </button>
                                    ) : null}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {events.last_page && events.last_page > 1 && events.links && (
                <div className="mt-10 flex flex-wrap items-center justify-center gap-1">
                    {events.links.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url || '#'}
                            preserveState
                            className={`min-w-[2.25rem] rounded-lg px-3 py-2 text-sm ${
                                link.active
                                    ? 'bg-amber-500 font-semibold text-zinc-950'
                                    : 'border border-white/10 bg-zinc-900/50 text-zinc-400 hover:bg-white/5 hover:text-white'
                            } ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtmlForInnerHtml(link.label) }}
                        />
                    ))}
                </div>
            )}
        </ArtistLayout>
    );
}
