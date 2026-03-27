import { RichOrPlainContent } from '@/Components/SafeRichContent';
import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { eventStatusTr, reservationStatusTr, venueArtistStatusTr } from '@/lib/statusLabels';
import { Link, usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

interface Venue {
    id: number;
    name: string;
    slug: string;
    status: string;
    city: { name: string };
}

interface Reservation {
    id: number;
    reservation_date: string;
    status: string;
    total_amount: number;
    user: { name: string };
    venue: { name: string };
}

interface ActiveSubscription {
    ends_at: string;
    starts_at: string;
    plan: {
        name: string;
        slug: string;
        membership_type: 'artist' | 'venue' | 'manager';
        interval: 'monthly' | 'yearly';
        features: string | null;
    };
}

interface TopEventRow {
    id: number;
    title: string;
    view_count: number;
    start_date: string | null;
    status: string;
    venue_name?: string | null;
    public_url_segment: string | null;
}

interface EventPerformance {
    total_views: number;
    events_total: number;
    published_total: number;
    top_events: TopEventRow[];
}

interface Props {
    stats: { venues_count: number; pending_reservations: number; total_revenue: number };
    eventPerformance: EventPerformance;
    venues: Venue[];
    recentReservations: Reservation[];
    activeSubscription?: ActiveSubscription | null;
}

function formatInt(n: number | undefined): string {
    return (n ?? 0).toLocaleString('tr-TR');
}

function membershipTypeLabel(t: ActiveSubscription['plan']['membership_type']): string {
    if (t === 'artist') {
        return 'Sanatçı üyeliği';
    }
    if (t === 'manager') {
        return 'Organizatör üyeliği';
    }

    return 'Mekan üyeliği';
}

function intervalLabel(i: ActiveSubscription['plan']['interval']): string {
    return i === 'yearly' ? 'Yıllık' : 'Aylık';
}

function subscriptionIndexType(t: ActiveSubscription['plan']['membership_type']): 'artist' | 'venue' | 'manager' {
    if (t === 'artist') {
        return 'artist';
    }
    if (t === 'manager') {
        return 'manager';
    }

    return 'venue';
}

function defaultCapabilities(type: ActiveSubscription['plan']['membership_type']): string[] {
    if (type === 'artist') {
        return [
            'Mekan panelinden mekan ve etkinlik yönetimi',
            'Rezervasyonları görüntüleme ve durum güncelleme',
            'Sanatçı profilinizi bağlama ve düzenleme (onaylı profil)',
        ];
    }
    if (type === 'manager') {
        return [
            'Bağlı sanatçıların müsaitlik takvimini görüntüleme',
            'Müsaitlik ve etkinlik için sanatçıya istek gönderme',
        ];
    }

    return [
        'Onaylı mekanlarınızı ekleme ve düzenleme',
        'Etkinlik oluşturma, taslak ve yayın yönetimi',
        'Mekan rezervasyonlarını takip etme',
    ];
}

export default function ArtistDashboard({
    stats,
    eventPerformance,
    venues,
    recentReservations,
    activeSubscription = null,
}: Readonly<Props>) {
    const featuresRaw = activeSubscription?.plan.features?.trim() ?? '';
    const showVenueNav = (usePage<PageProps>().props.auth?.artist_panel_show_venue_nav ?? true) === true;
    const panelSeoTitle = showVenueNav ? 'Mekan Paneli - Sahnebul' : 'Sanatçı Paneli - Sahnebul';
    const panelSeoDescription = showVenueNav
        ? 'Mekan ve etkinlik özetiniz; Sahnebul mekan paneli.'
        : 'Sanatçı paneli özeti ve etkinlik performansı; Sahnebul.';

    return (
        <ArtistLayout>
            <SeoHead title={panelSeoTitle} description={panelSeoDescription} noindex />

            <h1 className="font-display mb-2 text-2xl font-bold text-zinc-900 dark:text-white">Panel</h1>
            <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-500">
                Özet ve son işlemler. Profil ayarları için sol menüden{' '}
                <span className="text-zinc-700 dark:text-zinc-400">Profil</span> sayfasını kullanın.
            </p>

            {activeSubscription ? (
                <section className="mb-8 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-zinc-50 p-6 dark:border-amber-500/25 dark:from-amber-500/10 dark:via-zinc-900/40 dark:to-zinc-900/60">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400/90">Aktif paketiniz</p>
                            <h2 className="mt-1 font-display text-xl font-bold text-zinc-900 dark:text-white">{activeSubscription.plan.name}</h2>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                {membershipTypeLabel(activeSubscription.plan.membership_type)} · {intervalLabel(activeSubscription.plan.interval)}
                            </p>
                            <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                                <span className="text-zinc-600 dark:text-zinc-500">Bitiş tarihi: </span>
                                <time dateTime={activeSubscription.ends_at} className="font-medium text-amber-800 dark:text-amber-200">
                                    {formatTurkishDateTime(activeSubscription.ends_at)}
                                </time>
                            </p>
                            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-500">
                                Başlangıç:{' '}
                                {formatTurkishDateTime(activeSubscription.starts_at)}
                            </p>
                        </div>
                        <Link
                            href={route('subscriptions.index', { type: subscriptionIndexType(activeSubscription.plan.membership_type) })}
                            className="shrink-0 self-start rounded-xl border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-200 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25"
                        >
                            Paketleri görüntüle
                        </Link>
                    </div>
                    <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-white/10">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Bu paketle neler yapabilirsiniz?</p>
                        {featuresRaw ? (
                            <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                                <RichOrPlainContent
                                    content={featuresRaw}
                                    richClassName="prose prose-sm max-w-none text-zinc-700 prose-p:my-2 prose-ul:my-2 prose-headings:text-zinc-900 prose-a:text-amber-700 dark:prose-invert dark:text-zinc-300 dark:prose-headings:text-white dark:prose-a:text-amber-400"
                                    plainParagraphClassName="mb-2 text-zinc-700 last:mb-0 dark:text-zinc-300"
                                />
                            </div>
                        ) : (
                            <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                                {defaultCapabilities(activeSubscription.plan.membership_type).map((line, idx) => (
                                    <li key={`${idx}-${line.slice(0, 24)}`}>{line}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            ) : (
                <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-500/25 dark:bg-emerald-500/5">
                    <p className="text-sm font-medium text-emerald-900 dark:text-white">Ücretsiz panel erişimi</p>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-400">
                        Mekan ve etkinlik yönetimi ücretsizdir. Sol menüden mekân ekleyebilir, etkinlik oluşturabilir ve rezervasyonları
                        takip edebilirsiniz.
                    </p>
                </section>
            )}

            <div className="mb-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900/50 dark:shadow-none">
                    <p className="text-sm text-zinc-600 dark:text-zinc-500">Mekanlarım</p>
                    <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{stats.venues_count}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900/50 dark:shadow-none">
                    <p className="text-sm text-zinc-600 dark:text-zinc-500">Bekleyen Rezervasyon</p>
                    <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending_reservations}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900/50 dark:shadow-none">
                    <p className="text-sm text-zinc-600 dark:text-zinc-500">Toplam Gelir</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-green-400">
                        ₺{Number(stats.total_revenue).toLocaleString('tr-TR')}
                    </p>
                </div>
            </div>

            <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/40 dark:shadow-none">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Etkinlik performansı</h2>
                        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-500">
                            Her etkinlik için sayaç, yalnızca yayındayken açılan kamu detay sayfası ziyaretlerinden artar. Taslak
                            etkinlikler listelenmez; görüntülenme birikmez.
                        </p>
                    </div>
                    <Link
                        href={route('artist.events.index')}
                        className="shrink-0 text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        Tüm etkinlikler →
                    </Link>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                        <p className="text-xs font-medium uppercase tracking-wide text-amber-900 dark:text-amber-200/80">Toplam görüntülenme</p>
                        <p className="mt-1 font-display text-2xl font-bold text-amber-800 dark:text-amber-300">{formatInt(eventPerformance.total_views)}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950/40">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-500">Etkinlik kaydı</p>
                        <p className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-white">{formatInt(eventPerformance.events_total)}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950/40">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-500">Yayında</p>
                        <p className="mt-1 font-display text-2xl font-bold text-emerald-700 dark:text-emerald-400/90">
                            {formatInt(eventPerformance.published_total)}
                        </p>
                    </div>
                </div>
                <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-white/10">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">En çok görüntülenen etkinlikler</h3>
                    {eventPerformance.top_events.length === 0 ? (
                        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-500">Henüz etkinlik yok.</p>
                    ) : (
                        <ul className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-white/10 dark:border-white/10">
                            {eventPerformance.top_events.map((ev) => (
                                <li key={ev.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="font-medium text-zinc-900 dark:text-white">{ev.title}</p>
                                        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-500">
                                            {ev.venue_name ?? '—'} ·{' '}
                                            {ev.start_date ? formatTurkishDateTime(ev.start_date) : 'Tarih yok'}
                                            {' · '}
                                            <span className="text-zinc-500 dark:text-zinc-400">{eventStatusTr(ev.status)}</span>
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-4">
                                        <span className="text-sm tabular-nums text-amber-800 dark:text-amber-300">
                                            {formatInt(ev.view_count)} görüntülenme
                                        </span>
                                        {ev.public_url_segment ? (
                                            <Link
                                                href={route('events.show', { event: ev.public_url_segment })}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                                            >
                                                Sayfayı aç
                                            </Link>
                                        ) : null}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            <div className="grid gap-8 lg:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-white/5 dark:bg-zinc-900/50 dark:shadow-none">
                    <div className="border-b border-zinc-200 px-6 py-4 dark:border-white/5">
                        <h2 className="font-semibold text-zinc-900 dark:text-white">Mekanlarım</h2>
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-white/5">
                        {venues.length === 0 ? (
                            <div className="p-6">
                                <Link
                                    href={route('artist.venues.create')}
                                    className="text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                                >
                                    + İlk mekanını ekle
                                </Link>
                            </div>
                        ) : (
                            venues.map((v) => (
                                <Link
                                    key={v.id}
                                    href={route('artist.venues.edit', v.id)}
                                    className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-white/5"
                                >
                                    <span className="font-medium text-zinc-900 dark:text-white">{v.name}</span>
                                    <span
                                        className={`rounded px-2 py-0.5 text-xs ${
                                            v.status === 'approved'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-green-500/20 dark:text-green-400'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                                        }`}
                                    >
                                        {venueArtistStatusTr(v.status)}
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-white/5 dark:bg-zinc-900/50 dark:shadow-none">
                    <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-white/5">
                        <h2 className="font-semibold text-zinc-900 dark:text-white">Son Rezervasyonlar</h2>
                        <Link href={route('artist.reservations.index')} className="text-sm text-amber-700 dark:text-amber-400">
                            Tümü →
                        </Link>
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-white/5">
                        {recentReservations.length === 0 ? (
                            <p className="p-6 text-zinc-600 dark:text-zinc-500">Henüz rezervasyon yok</p>
                        ) : (
                            recentReservations.map((r) => (
                                <div key={r.id} className="flex items-center justify-between px-6 py-4">
                                    <div>
                                        <p className="font-medium text-zinc-900 dark:text-white">{r.user.name}</p>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-500">{r.venue.name}</p>
                                    </div>
                                    <span
                                        className={`rounded px-2 py-0.5 text-xs ${
                                            r.status === 'pending'
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                                                : 'bg-emerald-100 text-emerald-800 dark:bg-green-500/20 dark:text-green-400'
                                        }`}
                                    >
                                        {reservationStatusTr(r.status)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </ArtistLayout>
    );
}
