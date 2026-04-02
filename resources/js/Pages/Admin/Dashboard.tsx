import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { safeRoute } from '@/lib/safeRoute';
import {
    eventStatusTr,
    stageEventCreatorLabel,
    stageManagementArtistLabel,
    type StageUserRef,
    venueArtistStatusTr,
} from '@/lib/statusLabels';
import { Link } from '@inertiajs/react';

interface Venue {
    id: number;
    name: string;
    slug: string;
    status: string;
    city: { name: string };
    category: { name: string };
}

interface Reservation {
    id: number;
    reservation_date: string;
    status: string;
    total_amount: number;
    user: { name: string };
    venue: { name: string };
}

interface RecentArtistRow {
    id: number;
    name: string;
    slug: string;
    genre: string | null;
    status: string;
    created_at: string;
    managed_by?: StageUserRef | null;
}

interface RecentEventAddedRow {
    id: number;
    title: string;
    start_date: string;
    status: string;
    created_at: string;
    venue: { name: string; slug: string };
    created_by?: StageUserRef | null;
}

interface Props {
    stats: Record<string, number>;
    recentVenues: Venue[];
    recentArtists: RecentArtistRow[];
    recentEventsAdded: RecentEventAddedRow[];
    recentReservations: Reservation[];
    popularVenues: { id: number; name: string; slug: string; review_count: number; rating_avg: number }[];
    usersChart: { date: string; count: number }[];
    pendingArtists: { id: number; name: string; slug: string; genre: string | null; created_at: string }[];
    upcomingEvents: { id: number; title: string; start_date: string; status: string; venue: { name: string; slug: string } }[];
    topViewedArtists: { id: number; name: string; slug: string; view_count: number }[];
    topViewedEvents: { id: number; title: string; view_count: number; venue: { name: string; slug: string } | null }[];
}

export default function AdminDashboard({
    stats,
    recentVenues,
    recentArtists,
    recentEventsAdded,
    recentReservations,
    popularVenues,
    usersChart,
    pendingArtists,
    upcomingEvents,
    topViewedArtists,
    topViewedEvents,
}: Readonly<Props>) {
    return (
        <AdminLayout>
            <SeoHead title="Yönetim paneli - Admin | Sahnebul" description="Sahnebul yönetim özeti." noindex />

            <div className="space-y-6">
                <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">Yönetim paneli</h1>

                {/* Stats Grid */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Toplam Kullanıcı" value={stats.users_count} />
                    <StatCard label="Toplam Mekan" value={stats.venues_count} />
                    <StatCard label="Onay Bekleyen Mekan" value={stats.pending_venues} highlight />
                    <StatCard label="Onay Bekleyen Sanatçı" value={stats.pending_artists ?? 0} highlight={(stats.pending_artists ?? 0) > 0} />
                    <StatCard label="Taslak Etkinlik" value={stats.draft_events ?? 0} highlight={(stats.draft_events ?? 0) > 0} />
                    <StatCard label="Bugünkü Rezervasyon" value={stats.reservations_today} />
                    <StatCard label="Onay Bekleyen Yorum" value={stats.reviews_pending ?? 0} highlight={stats.reviews_pending > 0} />
                    <StatCard label="Yaklaşan Etkinlik" value={stats.events_upcoming ?? 0} />
                    <StatCard label="Toplam Gelir (₺)" value={Number(stats.total_revenue ?? 0).toLocaleString('tr-TR')} />
                    <StatCard label="Bu Hafta Yeni Üye" value={stats.new_users_week ?? 0} />
                </div>

                <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Genel bakış — son eklenenler</h2>
                    <div className="grid gap-6 lg:grid-cols-3">
                        <SectionCard title="Son eklenen sanatçılar" link={route('admin.artists.index')} linkLabel="Tümü">
                            {recentArtists.length === 0 ? (
                                <p className="p-4 text-zinc-500">Henüz sanatçı yok.</p>
                            ) : (
                                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {recentArtists.map((a) => {
                                        const orgLabel = stageManagementArtistLabel(a.managed_by ?? null);
                                        return (
                                            <Link
                                                key={a.id}
                                                href={route('admin.artists.edit', a.id)}
                                                className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                            >
                                                <p className="font-medium text-zinc-900 dark:text-white">{a.name}</p>
                                                <p className="text-sm text-zinc-500">
                                                    {a.genre ?? 'Sanatçı'} • {formatTurkishDateTime(a.created_at)}
                                                </p>
                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                    <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                                                        {venueArtistStatusTr(a.status)}
                                                    </span>
                                                    {orgLabel ? (
                                                        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-800 dark:text-violet-300">
                                                            {orgLabel}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </SectionCard>

                        <SectionCard title="Son eklenen mekanlar" link={route('admin.venues.index')} linkLabel="Tümü">
                            {recentVenues.length === 0 ? (
                                <p className="p-4 text-zinc-500">Henüz mekan yok.</p>
                            ) : (
                                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {recentVenues.map((v) => (
                                        <Link
                                            key={v.id}
                                            href={route('admin.venues.edit', v.id)}
                                            className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                        >
                                            <div>
                                                <p className="font-medium text-zinc-900 dark:text-white">{v.name}</p>
                                                <p className="text-sm text-zinc-500">
                                                    {v.city.name} • {v.category.name}
                                                </p>
                                            </div>
                                            <StatusBadge status={v.status} />
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </SectionCard>

                        <SectionCard title="Son eklenen etkinlikler" link={route('admin.events.index')} linkLabel="Tümü">
                            {recentEventsAdded.length === 0 ? (
                                <p className="p-4 text-zinc-500">Henüz etkinlik yok.</p>
                            ) : (
                                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {recentEventsAdded.map((e) => {
                                        const creator = stageEventCreatorLabel(e.created_by ?? null);
                                        return (
                                            <Link
                                                key={e.id}
                                                href={route('admin.events.edit', e.id)}
                                                className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                            >
                                                <p className="font-medium text-zinc-900 dark:text-white">{e.title}</p>
                                                <p className="text-sm text-zinc-500">{e.venue.name}</p>
                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                    <span className="text-xs text-zinc-500">
                                                        {formatTurkishDateTime(e.created_at)}
                                                    </span>
                                                    <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                                                        {eventStatusTr(e.status)}
                                                    </span>
                                                    {creator ? (
                                                        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-800 dark:text-sky-300">
                                                            {creator}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </SectionCard>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    <SectionCard title="Hızlı İşlemler">
                        <div className="grid gap-3 p-4 sm:grid-cols-2">
                            <Link
                                href={route('admin.venues.index', { status: 'pending' })}
                                className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-800 transition hover:bg-amber-500/25 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                            >
                                Onay bekleyen mekanlar ({stats.pending_venues})
                            </Link>
                            <Link
                                href={route('admin.artists.index', { status: 'pending' })}
                                className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-800 transition hover:bg-amber-500/25 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                            >
                                Onay bekleyen sanatçılar ({stats.pending_artists ?? 0})
                            </Link>
                            <Link
                                href={route('admin.events.index', { status: 'draft' })}
                                className="rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm text-zinc-800 transition hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                                Taslak etkinlikleri incele ({stats.draft_events ?? 0})
                            </Link>
                            <Link
                                href={route('admin.reviews.index')}
                                className="rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm text-zinc-800 transition hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                                Yorum moderasyonu ({stats.reviews_pending ?? 0})
                            </Link>
                            <Link
                                href={safeRoute('admin.notifications.broadcast')}
                                className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900 transition hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-900/50"
                            >
                                Üye bildirimi gönder
                            </Link>
                        </div>
                    </SectionCard>

                    <SectionCard title="Onay Bekleyen Sanatçılar" link={route('admin.artists.index', { status: 'pending' })} linkLabel="Tümü">
                        {pendingArtists.length === 0 ? (
                            <p className="p-4 text-zinc-500">Onay bekleyen sanatçı yok.</p>
                        ) : (
                            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {pendingArtists.map((a) => (
                                    <Link key={a.id} href={route('admin.artists.index', { status: 'pending' })} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                        <div>
                                            <p className="font-medium text-zinc-900 dark:text-white">{a.name}</p>
                                            <p className="text-sm text-zinc-500">{a.genre ?? 'Sanatçı'} • {formatTurkishDateTime(a.created_at)}</p>
                                        </div>
                                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-400">
                                            Onay bekliyor
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* Son Rezervasyonlar */}
                    <SectionCard title="Son Rezervasyonlar" link={route('admin.reservations.index')} linkLabel="Tümü">
                        {recentReservations?.length === 0 ? (
                            <p className="p-4 text-zinc-500">Henüz rezervasyon yok.</p>
                        ) : (
                            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {recentReservations?.map((r) => (
                                    <Link
                                        key={r.id}
                                        href={route('admin.reservations.show', r.id)}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                    >
                                        <div>
                                            <p className="font-medium text-zinc-900 dark:text-white">{r.user.name}</p>
                                            <p className="text-sm text-zinc-500">{r.venue.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                                ₺{Number(r.total_amount).toLocaleString('tr-TR')}
                                            </p>
                                            <StatusBadge status={r.status} />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="En Çok Görüntülenen Sanatçılar" link={route('admin.artists.index')} linkLabel="Tümü">
                        {topViewedArtists.length === 0 ? (
                            <p className="p-4 text-zinc-500">Veri yok.</p>
                        ) : (
                            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {topViewedArtists.map((a) => (
                                    <Link
                                        key={a.id}
                                        href={route('admin.artists.edit', a.id)}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                    >
                                        <p className="font-medium text-zinc-900 dark:text-white">{a.name}</p>
                                        <span className="text-sm tabular-nums text-amber-700 dark:text-amber-400">
                                            {Number(a.view_count).toLocaleString('tr-TR')} görüntülenme
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="En Çok Görüntülenen Etkinlikler" link={route('admin.events.index')} linkLabel="Tümü">
                        {topViewedEvents.length === 0 ? (
                            <p className="p-4 text-zinc-500">Veri yok.</p>
                        ) : (
                            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {topViewedEvents.map((e) => (
                                    <Link
                                        key={e.id}
                                        href={route('admin.events.edit', e.id)}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                    >
                                        <div>
                                            <p className="font-medium text-zinc-900 dark:text-white">{e.title}</p>
                                            {e.venue && <p className="text-sm text-zinc-500">{e.venue.name}</p>}
                                        </div>
                                        <span className="shrink-0 text-sm tabular-nums text-amber-700 dark:text-amber-400">
                                            {Number(e.view_count).toLocaleString('tr-TR')} görüntülenme
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* Popüler Mekanlar */}
                    <SectionCard title="En Çok Değerlendirilen Mekanlar" link={route('admin.venues.index')} linkLabel="Tümü">
                        {popularVenues?.length === 0 ? (
                            <p className="p-4 text-zinc-500">Veri yok.</p>
                        ) : (
                            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {popularVenues?.map((v) => (
                                    <div key={v.id} className="flex items-center justify-between px-4 py-3">
                                        <p className="font-medium text-zinc-900 dark:text-white">{v.name}</p>
                                        <span className="text-sm text-zinc-500">
                                            ★ {v.rating_avg || '-'} ({v.review_count} yorum)
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* Kullanıcı Grafiği */}
                    <SectionCard title="Son 14 Gün - Yeni Üye Sayısı">
                        {usersChart?.length === 0 ? (
                            <p className="p-4 text-zinc-500">Henüz veri yok.</p>
                        ) : (
                            <div className="flex h-40 items-end gap-1 p-4">
                                {usersChart?.map((d) => (
                                    <div
                                        key={d.date}
                                        className="flex flex-1 flex-col items-center"
                                        title={`${d.date}: ${d.count}`}
                                    >
                                        <div
                                            className="w-full min-w-[8px] rounded-t bg-amber-500/60 transition hover:bg-amber-500"
                                            style={{ height: `${Math.max((d.count / Math.max(...usersChart.map((x) => x.count), 1)) * 100, 8)}%` }}
                                        />
                                        <span className="mt-1 text-center text-[9px] leading-tight text-zinc-500">
                                            {formatTurkishDateTime(d.date, { withTime: false })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="Yaklaşan Etkinlikler" link={route('admin.events.index', { status: 'published' })} linkLabel="Tümü">
                        {upcomingEvents.length === 0 ? (
                            <p className="p-4 text-zinc-500">Yaklaşan etkinlik bulunamadı.</p>
                        ) : (
                            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {upcomingEvents.map((e) => (
                                    <Link key={e.id} href={route('admin.events.index', { status: 'published' })} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                        <div>
                                            <p className="font-medium text-zinc-900 dark:text-white">{e.title}</p>
                                            <p className="text-sm text-zinc-500">{e.venue.name}</p>
                                        </div>
                                        <span className="text-sm text-amber-700 dark:text-amber-400">
                                            {formatTurkishDateTime(e.start_date)}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                </div>
            </div>
        </AdminLayout>
    );
}

function StatCard({ label, value, highlight }: Readonly<{ label: string; value: string | number; highlight?: boolean }>) {
    return (
        <div
            className={`rounded-lg border p-6 ${
                highlight
                    ? 'border-amber-500/40 bg-amber-500/10 dark:border-amber-500/50 dark:bg-amber-500/10'
                    : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
            }`}
        >
            <p className="text-sm text-zinc-500 dark:text-zinc-500">{label}</p>
            <p
                className={`mt-1 text-2xl font-bold ${
                    highlight ? 'text-amber-800 dark:text-amber-400' : 'text-zinc-900 dark:text-white'
                }`}
            >
                {value}
            </p>
        </div>
    );
}

function SectionCard({ title, children, link, linkLabel }: Readonly<{ title: string; children: React.ReactNode; link?: string; linkLabel?: string }>) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <h2 className="font-semibold text-zinc-900 dark:text-white">{title}</h2>
                {link && linkLabel && (
                    <Link
                        href={link}
                        className="text-sm text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        {linkLabel} →
                    </Link>
                )}
            </div>
            {children}
        </div>
    );
}

function adminStatusLabelTr(status: string): string {
    const map: Record<string, string> = {
        approved: 'Onaylı',
        pending: 'Onay bekliyor',
        rejected: 'Reddedildi',
        draft: 'Taslak',
        published: 'Yayında',
        confirmed: 'Onaylandı',
        completed: 'Tamamlandı',
        cancelled: 'İptal',
        paid: 'Ödendi',
        refunded: 'İade',
    };

    return map[status] ?? status;
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
    const colors: Record<string, string> = {
        approved: 'bg-green-500/20 text-green-800 dark:text-green-400',
        confirmed: 'bg-green-500/20 text-green-800 dark:text-green-400',
        completed: 'bg-blue-500/20 text-blue-800 dark:text-blue-400',
        pending: 'bg-amber-500/20 text-amber-800 dark:text-amber-400',
        cancelled: 'bg-red-500/20 text-red-800 dark:text-red-400',
        rejected: 'bg-red-500/20 text-red-800 dark:text-red-400',
    };
    return (
        <span
            className={`rounded-full px-2 py-0.5 text-xs ${colors[status] || 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400'}`}
        >
            {adminStatusLabelTr(status)}
        </span>
    );
}
