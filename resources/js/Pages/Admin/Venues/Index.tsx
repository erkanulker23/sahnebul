import { AdminDataTable, AdminExcelActions, AdminPageHeader, type AdminColumn } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { venueArtistStatusTr } from '@/lib/statusLabels';
import { Link, router } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface Venue {
    id: number;
    name: string;
    slug: string;
    status: string;
    is_featured?: boolean;
    view_count?: number;
    events_count?: number;
    city: { name: string };
    category: { name: string };
}

interface Props {
    venues: { data: Venue[]; links: unknown[] };
    filters?: { search?: string; status?: string };
}

const inputClass =
    'min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white sm:max-w-md';

const filterBtn =
    'rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800';

function statusBadgeClass(status: string): string {
    if (status === 'approved') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
    if (status === 'pending') return 'bg-amber-500/15 text-amber-800 dark:text-amber-400';
    return 'bg-red-500/15 text-red-700 dark:text-red-400';
}

type RowSelectionMeta = Record<number, { events_count: number }>;

export default function AdminVenuesIndex({ venues, filters }: Readonly<Props>) {
    const [search, setSearch] = useState(filters?.search ?? '');
    const [selectedRows, setSelectedRows] = useState<RowSelectionMeta>({});

    useEffect(() => {
        setSearch(filters?.search ?? '');
    }, [filters?.search]);

    useEffect(() => {
        setSelectedRows({});
    }, [filters?.search, filters?.status]);

    const goList = (status?: string) => {
        const q: Record<string, string> = {};
        const s = search.trim();
        if (s) q.search = s;
        if (status) q.status = status;
        router.get(route('admin.venues.index'), q, { preserveState: true });
    };

    const selectedCount = Object.keys(selectedRows).length;

    const toggleRow = useCallback((venue: Venue, checked: boolean) => {
        setSelectedRows((prev) => {
            const next = { ...prev };
            if (checked) {
                next[venue.id] = { events_count: venue.events_count ?? 0 };
            } else {
                delete next[venue.id];
            }
            return next;
        });
    }, []);

    const togglePage = useCallback(
        (checked: boolean) => {
            setSelectedRows((prev) => {
                const next = { ...prev };
                for (const v of venues.data) {
                    if (checked) {
                        next[v.id] = { events_count: v.events_count ?? 0 };
                    } else {
                        delete next[v.id];
                    }
                }
                return next;
            });
        },
        [venues.data],
    );

    const bulkDeleteSelected = useCallback(() => {
        const ids = Object.keys(selectedRows).map(Number);
        if (ids.length === 0) {
            return;
        }
        const withEvents = ids.filter((id) => (selectedRows[id]?.events_count ?? 0) > 0).length;
        const sumEvents = ids.reduce((s, id) => s + (selectedRows[id]?.events_count ?? 0), 0);
        const msg =
            withEvents > 0
                ? `Seçilen ${ids.length} mekandan ${withEvents} tanesinin etkinliği var (toplam ${sumEvents} etkinlik). Mekanları silmek bu etkinlikleri de kalıcı olarak siler. Devam etmek istiyor musunuz?`
                : `${ids.length} mekanı silmek istediğinize emin misiniz?`;
        if (!confirm(msg)) {
            return;
        }
        router.post(route('admin.venues.bulk-destroy'), { ids });
    }, [selectedRows]);

    const columns: AdminColumn<Venue>[] = useMemo(
        () => [
            {
                key: 'name',
                header: 'Mekan',
                mobileLabel: 'Mekan',
                cell: (v) => (
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={route('admin.venues.edit', { venue: v.id })}
                            className="font-medium text-sky-700 hover:underline dark:text-sky-400"
                        >
                            {v.name}
                        </Link>
                        {v.is_featured && (
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                                Öne çıkan
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: 'loc',
                header: 'Şehir / Kategori',
                mobileLabel: 'Konum',
                cell: (v) => (
                    <span className="text-zinc-600 dark:text-zinc-400">
                        {v.city.name} / {v.category.name}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Durum',
                mobileLabel: 'Durum',
                cell: (v) => (
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(v.status)}`}>
                        {venueArtistStatusTr(v.status)}
                    </span>
                ),
            },
            {
                key: 'views',
                header: 'Görüntülenme',
                mobileLabel: 'Görüntülenme',
                className: 'text-right tabular-nums',
                cell: (v) => <span className="text-zinc-700 dark:text-zinc-300">{(v.view_count ?? 0).toLocaleString('tr-TR')}</span>,
            },
        ],
        [],
    );

    return (
        <AdminLayout>
            <SeoHead title="Mekanlar - Admin | Sahnebul" description="Mekan kayıtlarını yönetin." noindex />

            <div className="space-y-6">
                <AdminPageHeader
                    title="Mekan Yönetimi"
                    description="Mekanları onaylayın, düzenleyin veya kaldırın."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <AdminExcelActions exportPath="/admin/mekanlar/excel" importPath="/admin/mekanlar/excel-ice-aktar" />
                            <Link
                                href={route('admin.venues.create')}
                                className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400"
                            >
                                + Yeni mekan
                            </Link>
                        </div>
                    }
                />

                <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <label htmlFor="venue-search" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                Ara
                            </label>
                            <input
                                id="venue-search"
                                className={inputClass}
                                placeholder="Mekan adı, slug, adres, şehir veya telefon…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') goList(filters?.status);
                                }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => goList(filters?.status)}
                            className="shrink-0 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                        >
                            Ara
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => goList()} className={filterBtn}>
                        Tümü
                    </button>
                    <button type="button" onClick={() => goList('pending')} className={filterBtn}>
                        Onay Bekleyen
                    </button>
                    <button type="button" onClick={() => goList('approved')} className={filterBtn}>
                        Onaylı
                    </button>
                </div>

                {selectedCount > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            <span className="font-semibold tabular-nums">{selectedCount.toLocaleString('tr-TR')}</span> kayıt seçili
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedRows({})}
                                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                                Seçimi temizle
                            </button>
                            <button
                                type="button"
                                onClick={bulkDeleteSelected}
                                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
                            >
                                Seçilenleri sil
                            </button>
                        </div>
                    </div>
                )}

                <AdminDataTable
                    columns={columns}
                    rows={venues.data}
                    getRowKey={(v) => v.id}
                    selection={{
                        getRowId: (v) => v.id,
                        isRowSelected: (v) => Boolean(selectedRows[v.id]),
                        onToggleRow: toggleRow,
                        onTogglePage: togglePage,
                    }}
                    actions={(venue) => (
                        <>
                            {venue.status === 'pending' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => router.post(route('admin.venues.approve', { venue: venue.id }))}
                                        className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                                    >
                                        Onayla
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => router.post(route('admin.venues.reject', { venue: venue.id }))}
                                        className="text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
                                    >
                                        Reddet
                                    </button>
                                </>
                            )}
                            <Link
                                href={route('admin.venues.edit', { venue: venue.id })}
                                className="text-sm font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400"
                            >
                                Düzenle
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    const n = venue.events_count ?? 0;
                                    const msg =
                                        n > 0
                                            ? `Bu mekana ait ${n} etkinlik kaydı var. Mekanı silmek bu etkinlikleri de kalıcı olarak siler. Devam etmek istiyor musunuz?`
                                            : 'Bu mekanı silmek istediğinize emin misiniz?';
                                    if (confirm(msg)) {
                                        router.delete(route('admin.venues.destroy', { venue: venue.id }));
                                    }
                                }}
                                className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                            >
                                Sil
                            </button>
                        </>
                    )}
                />
            </div>
        </AdminLayout>
    );
}
