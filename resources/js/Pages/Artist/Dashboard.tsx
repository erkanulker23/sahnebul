import { RichOrPlainContent } from '@/Components/SafeRichContent';
import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { reservationStatusTr, venueArtistStatusTr } from '@/lib/statusLabels';
import { Link } from '@inertiajs/react';

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
        membership_type: 'artist' | 'venue';
        interval: 'monthly' | 'yearly';
        features: string | null;
    };
}

interface Props {
    stats: { venues_count: number; pending_reservations: number; total_revenue: number };
    venues: Venue[];
    recentReservations: Reservation[];
    activeSubscription?: ActiveSubscription | null;
}

function membershipTypeLabel(t: ActiveSubscription['plan']['membership_type']): string {
    return t === 'artist' ? 'Sanatçı üyeliği' : 'Mekan üyeliği';
}

function intervalLabel(i: ActiveSubscription['plan']['interval']): string {
    return i === 'yearly' ? 'Yıllık' : 'Aylık';
}

function defaultCapabilities(type: ActiveSubscription['plan']['membership_type']): string[] {
    if (type === 'artist') {
        return [
            'Mekan panelinden mekan ve etkinlik yönetimi',
            'Rezervasyonları görüntüleme ve durum güncelleme',
            'Sanatçı profilinizi bağlama ve düzenleme (onaylı profil)',
        ];
    }
    return [
        'Onaylı mekanlarınızı ekleme ve düzenleme',
        'Etkinlik oluşturma, taslak ve yayın yönetimi',
        'Mekan rezervasyonlarını takip etme',
    ];
}

export default function ArtistDashboard({ stats, venues, recentReservations, activeSubscription = null }: Readonly<Props>) {
    const featuresRaw = activeSubscription?.plan.features?.trim() ?? '';

    return (
        <ArtistLayout>
            <SeoHead title="Mekan Paneli - Sahnebul" description="Mekan ve etkinlik özetiniz; Sahnebul mekan paneli." noindex />

            <h1 className="font-display mb-2 text-2xl font-bold text-white">Panel</h1>
            <p className="mb-8 text-sm text-zinc-500">Özet ve son işlemler. Profil ayarları için sol menüden <span className="text-zinc-400">Profil</span> sayfasını kullanın.</p>

            {activeSubscription ? (
                <section className="mb-8 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-zinc-900/40 to-zinc-900/60 p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">Aktif paketiniz</p>
                            <h2 className="mt-1 font-display text-xl font-bold text-white">{activeSubscription.plan.name}</h2>
                            <p className="mt-1 text-sm text-zinc-400">
                                {membershipTypeLabel(activeSubscription.plan.membership_type)} · {intervalLabel(activeSubscription.plan.interval)}
                            </p>
                            <p className="mt-3 text-sm text-zinc-300">
                                <span className="text-zinc-500">Bitiş tarihi: </span>
                                <time dateTime={activeSubscription.ends_at} className="font-medium text-amber-200">
                                    {new Date(activeSubscription.ends_at).toLocaleString('tr-TR', {
                                        dateStyle: 'long',
                                        timeStyle: 'short',
                                    })}
                                </time>
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                                Başlangıç:{' '}
                                {new Date(activeSubscription.starts_at).toLocaleDateString('tr-TR', { dateStyle: 'long' })}
                            </p>
                        </div>
                        <Link
                            href={route('subscriptions.index', { type: activeSubscription.plan.membership_type === 'artist' ? 'artist' : 'venue' })}
                            className="shrink-0 self-start rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/25"
                        >
                            Paketleri görüntüle
                        </Link>
                    </div>
                    <div className="mt-6 border-t border-white/10 pt-6">
                        <p className="text-sm font-semibold text-white">Bu paketle neler yapabilirsiniz?</p>
                        {featuresRaw ? (
                            <div className="mt-3 text-sm text-zinc-300">
                                <RichOrPlainContent
                                    content={featuresRaw}
                                    richClassName="prose prose-sm prose-invert max-w-none text-zinc-300 prose-p:my-2 prose-ul:my-2 prose-headings:text-white prose-a:text-amber-400"
                                    plainParagraphClassName="mb-2 text-zinc-300 last:mb-0"
                                />
                            </div>
                        ) : (
                            <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-300">
                                {defaultCapabilities(activeSubscription.plan.membership_type).map((line, idx) => (
                                    <li key={`${idx}-${line.slice(0, 24)}`}>{line}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            ) : (
                <section className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
                    <p className="text-sm font-medium text-white">Aktif üyelik paketi yok</p>
                    <p className="mt-1 text-sm text-zinc-500">
                        Mekan ve etkinlik yönetimi için bir paket seçmeniz gerekir.
                    </p>
                    <Link
                        href={route('subscriptions.index', { type: 'venue' })}
                        className="mt-4 inline-flex rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                    >
                        Paketleri incele
                    </Link>
                </section>
            )}

            <div className="mb-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6">
                    <p className="text-sm text-zinc-500">Mekanlarım</p>
                    <p className="mt-1 text-2xl font-bold text-white">{stats.venues_count}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6">
                    <p className="text-sm text-zinc-500">Bekleyen Rezervasyon</p>
                    <p className="mt-1 text-2xl font-bold text-amber-400">{stats.pending_reservations}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6">
                    <p className="text-sm text-zinc-500">Toplam Gelir</p>
                    <p className="mt-1 text-2xl font-bold text-green-400">₺{Number(stats.total_revenue).toLocaleString('tr-TR')}</p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-zinc-900/50">
                    <div className="border-b border-white/5 px-6 py-4">
                        <h2 className="font-semibold text-white">Mekanlarım</h2>
                    </div>
                    <div className="divide-y divide-white/5">
                        {venues.length === 0 ? (
                            <div className="p-6">
                                <Link href={route('artist.venues.create')} className="text-amber-400 hover:text-amber-300">+ İlk mekanını ekle</Link>
                            </div>
                        ) : (
                            venues.map((v) => (
                                <Link key={v.id} href={route('artist.venues.edit', v.id)} className="flex items-center justify-between px-6 py-4 hover:bg-white/5">
                                    <span className="font-medium text-white">{v.name}</span>
                                    <span className={`rounded px-2 py-0.5 text-xs ${v.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {venueArtistStatusTr(v.status)}
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-zinc-900/50">
                    <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                        <h2 className="font-semibold text-white">Son Rezervasyonlar</h2>
                        <Link href={route('artist.reservations.index')} className="text-sm text-amber-400">Tümü →</Link>
                    </div>
                    <div className="divide-y divide-white/5">
                        {recentReservations.length === 0 ? (
                            <p className="p-6 text-zinc-500">Henüz rezervasyon yok</p>
                        ) : (
                            recentReservations.map((r) => (
                                <div key={r.id} className="flex items-center justify-between px-6 py-4">
                                    <div>
                                        <p className="font-medium text-white">{r.user.name}</p>
                                        <p className="text-sm text-zinc-500">{r.venue.name}</p>
                                    </div>
                                    <span className={`rounded px-2 py-0.5 text-xs ${r.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
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
