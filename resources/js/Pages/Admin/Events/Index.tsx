import { AdminDataTable, AdminExcelActions, AdminPageHeader, type AdminColumn } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { Link, router } from '@inertiajs/react';
import { eventStatusTr } from '@/lib/statusLabels';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface Event {
    id: number;
    title: string;
    start_date: string;
    status: string;
    ticket_price: number | null;
    view_count?: number;
    venue: { name: string };
}

interface Props {
    events: { data: Event[]; links: unknown[] };
    filters?: { status?: string; venue_id?: string };
}

const filterLink =
    'rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800';

export default function AdminEventsIndex({ events, filters }: Readonly<Props>) {
    const [selectedRows, setSelectedRows] = useState<Record<number, true>>({});

    useEffect(() => {
        setSelectedRows({});
    }, [filters?.status, filters?.venue_id]);

    const selectedCount = Object.keys(selectedRows).length;

    const toggleRow = useCallback((row: Event, checked: boolean) => {
        setSelectedRows((prev) => {
            const next = { ...prev };
            if (checked) {
                next[row.id] = true;
            } else {
                delete next[row.id];
            }
            return next;
        });
    }, []);

    const togglePage = useCallback(
        (checked: boolean) => {
            setSelectedRows((prev) => {
                const next = { ...prev };
                for (const e of events.data) {
                    if (checked) {
                        next[e.id] = true;
                    } else {
                        delete next[e.id];
                    }
                }
                return next;
            });
        },
        [events.data],
    );

    const bulkDeleteSelected = useCallback(() => {
        const ids = Object.keys(selectedRows).map(Number);
        if (ids.length === 0) {
            return;
        }
        if (
            !confirm(
                `${ids.length} etkinliği kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
            )
        ) {
            return;
        }
        router.post(route('admin.events.bulk-destroy'), { ids });
    }, [selectedRows]);

    const columns: AdminColumn<Event>[] = useMemo(
        () => [
            {
                key: 'title',
                header: 'Etkinlik',
                mobileLabel: 'Etkinlik',
                cell: (e) => <span className="font-medium text-zinc-900 dark:text-white">{e.title}</span>,
            },
            {
                key: 'venue',
                header: 'Mekan',
                mobileLabel: 'Mekan',
                cell: (e) => <span className="text-zinc-600 dark:text-zinc-400">{e.venue.name}</span>,
            },
            {
                key: 'start',
                header: 'Tarih',
                mobileLabel: 'Tarih',
                cell: (e) => (
                    <span className="text-zinc-600 dark:text-zinc-400">{new Date(e.start_date).toLocaleString('tr-TR')}</span>
                ),
            },
            {
                key: 'price',
                header: 'Fiyat',
                mobileLabel: 'Fiyat',
                cell: (e) => (
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                        {e.ticket_price != null ? `₺${e.ticket_price}` : '—'}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Durum',
                mobileLabel: 'Durum',
                cell: (e) => (
                    <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            e.status === 'published'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400'
                        }`}
                    >
                        {eventStatusTr(e.status)}
                    </span>
                ),
            },
            {
                key: 'views',
                header: 'Görüntülenme',
                mobileLabel: 'Görüntülenme',
                className: 'text-right tabular-nums',
                cell: (e) => (
                    <span className="text-zinc-700 dark:text-zinc-300">{(e.view_count ?? 0).toLocaleString('tr-TR')}</span>
                ),
            },
        ],
        [],
    );

    return (
        <AdminLayout>
            <SeoHead title="Etkinlikler - Admin | Sahnebul" description="Etkinlik kayıtlarını yönetin." noindex />

            <div className="space-y-6">
                <AdminPageHeader
                    title="Etkinlik Yönetimi"
                    description="Etkinlikleri oluşturun, yayınlayın ve düzenleyin."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <AdminExcelActions exportPath="/admin/etkinlikler/excel" importPath="/admin/etkinlikler/excel-ice-aktar" />
                            <Link
                                href={route('admin.events.create')}
                                className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400"
                            >
                                + Yeni etkinlik
                            </Link>
                        </div>
                    }
                />

                <div className="flex flex-wrap items-center gap-2">
                    <Link href={route('admin.events.index')} className={filterLink}>
                        Tümü
                    </Link>
                    <Link href={route('admin.events.index', { status: 'draft' })} className={filterLink}>
                        Taslak
                    </Link>
                    <Link href={route('admin.events.index', { status: 'published' })} className={filterLink}>
                        Yayında
                    </Link>
                    {selectedCount > 0 && (
                        <button
                            type="button"
                            onClick={bulkDeleteSelected}
                            className="ml-auto inline-flex items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
                        >
                            Seçilenleri sil ({selectedCount})
                        </button>
                    )}
                </div>

                <AdminDataTable
                    columns={columns}
                    rows={events.data}
                    getRowKey={(e) => e.id}
                    selection={{
                        getRowId: (e) => e.id,
                        isRowSelected: (e) => Boolean(selectedRows[e.id]),
                        onToggleRow: toggleRow,
                        onTogglePage: togglePage,
                    }}
                    actions={(event) => (
                        <>
                            {event.status === 'draft' && (
                                <button
                                    type="button"
                                    onClick={() => router.post(route('admin.events.approve', event.id))}
                                    className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                                >
                                    Yayınla
                                </button>
                            )}
                            <Link href={route('admin.events.edit', event.id)} className="text-sm font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400">
                                Düzenle
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm('Silmek istediğinize emin misiniz?')) {
                                        router.delete(route('admin.events.destroy', event.id));
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
