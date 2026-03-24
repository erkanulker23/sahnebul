import { sanitizeHtmlForInnerHtml } from '@/Components/SafeRichContent';
import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { Link } from '@inertiajs/react';

interface Venue {
    id: number;
    name: string;
    slug: string;
    status: string;
    view_count?: number;
    review_count: number;
    reservations_count?: number;
    published_events_count?: number;
    city: { name: string };
    category: { name: string };
}

interface PaginatorLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedVenues {
    data: Venue[];
    links: PaginatorLink[];
    last_page?: number;
}

interface Props {
    venues: PaginatedVenues;
    analyticsTotals: { views: number };
}

function formatInt(n: number | undefined): string {
    return (n ?? 0).toLocaleString('tr-TR');
}

export default function ArtistVenuesIndex({ venues, analyticsTotals }: Readonly<Props>) {
    return (
        <ArtistLayout>
            <SeoHead title="Mekanlarım - Sahnebul" description="Bağlı mekanlarınızı yönetin." noindex />

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-white">Mekanlarım</h1>
                    <p className="mt-1 text-sm text-zinc-500">Görüntülenme ve etkileşim özeti (genel liste + mekan detay sayfası)</p>
                </div>
                <Link href={route('artist.venues.create')} className="rounded-xl bg-amber-500 px-6 py-2 font-medium text-zinc-950 hover:bg-amber-400">
                    + Mekan Ekle
                </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-5">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Toplam görüntülenme</p>
                    <p className="mt-2 font-display text-3xl font-bold text-amber-400">{formatInt(analyticsTotals.views)}</p>
                    <p className="mt-1 text-xs text-zinc-600">Tüm mekanlarınızın detay sayfası açılışları</p>
                </div>
                <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900/30 p-5">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Not</p>
                    <p className="mt-2 text-sm text-zinc-400">
                        Her mekan satırında görüntülenme, yorum, rezervasyon ve yayında etkinlik sayıları listelenir.
                    </p>
                </div>
            </div>

            <div className="mt-10 space-y-4">
                {venues.data.map((v) => (
                    <div
                        key={v.id}
                        className="rounded-xl border border-white/5 bg-zinc-900/50 p-6"
                    >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                                <h3 className="font-semibold text-white">{v.name}</h3>
                                <p className="mt-1 text-sm text-zinc-500">
                                    {v.city.name} • {v.category.name}
                                </p>
                                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Görüntülenme</p>
                                        <p className="mt-0.5 text-lg font-semibold text-amber-400">{formatInt(v.view_count)}</p>
                                    </div>
                                    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Yorum</p>
                                        <p className="mt-0.5 text-lg font-semibold text-zinc-200">{formatInt(v.review_count)}</p>
                                    </div>
                                    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Rezervasyon</p>
                                        <p className="mt-0.5 text-lg font-semibold text-zinc-200">{formatInt(v.reservations_count)}</p>
                                    </div>
                                    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Yayında etkinlik</p>
                                        <p className="mt-0.5 text-lg font-semibold text-emerald-400">{formatInt(v.published_events_count)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-3 lg:flex-col lg:items-end">
                                <span
                                    className={`rounded-full px-3 py-1 text-sm ${
                                        v.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                                    }`}
                                >
                                    {v.status}
                                </span>
                                <div className="flex gap-3">
                                    <Link
                                        href={route('venues.show', v.slug)}
                                        className="text-sm text-zinc-400 underline-offset-2 hover:text-white hover:underline"
                                    >
                                        Sayfayı gör
                                    </Link>
                                    <Link href={route('artist.venues.edit', v.id)} className="text-sm font-medium text-amber-400 hover:text-amber-300">
                                        Düzenle
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {venues.last_page && venues.last_page > 1 && venues.links && (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-1">
                    {venues.links.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url || '#'}
                            preserveState
                            preserveScroll
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
