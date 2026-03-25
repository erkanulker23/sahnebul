import { AdminDataTable, AdminExcelActions, AdminPageHeader, type AdminColumn } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { Link, router } from '@inertiajs/react';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { eventStatusTr } from '@/lib/statusLabels';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

interface Event {
    id: number;
    title: string;
    start_date: string;
    created_at: string;
    status: string;
    ticket_price: number | null;
    view_count?: number;
    venue: { name: string; status?: string };
    visible_on_site?: boolean;
    public_event_url?: string | null;
}

interface Props {
    events: { data: Event[]; links: unknown[] };
    venues: { id: number; name: string }[];
    filters?: { status?: string; venue_id?: string; search?: string };
}

const fieldClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white sm:w-auto';

export default function AdminEventsIndex({ events, venues, filters }: Readonly<Props>) {
    const [selectedRows, setSelectedRows] = useState<Record<number, true>>({});

    useEffect(() => {
        setSelectedRows({});
    }, [filters?.status, filters?.venue_id, filters?.search]);

    const submitFilters = useCallback((e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const search = ((fd.get('search') as string) || '').trim();
        const status = (fd.get('status') as string) || '';
        const venueId = (fd.get('venue_id') as string) || '';
        router.get(
            route('admin.events.index'),
            {
                ...(search ? { search } : {}),
                ...(status ? { status } : {}),
                ...(venueId ? { venue_id: venueId } : {}),
            },
            { preserveState: true },
        );
    }, []);

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

    const bulkPublishSelected = useCallback(() => {
        const ids = Object.keys(selectedRows).map(Number);
        if (ids.length === 0) {
            return;
        }
        if (
            !confirm(
                `Seçili ${ids.length} kayıttan yayın şartlarını sağlayan taslaklar yayınlansın mı? (Yayında olanlar ve eksik şartlı taslaklar atlanır.)`,
            )
        ) {
            return;
        }
        router.post(route('admin.events.bulk-publish'), { ids }, { preserveScroll: true });
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
                key: 'created',
                header: 'Eklenme',
                mobileLabel: 'Eklenme',
                cell: (e) => (
                    <span className="text-zinc-600 dark:text-zinc-400">{formatTurkishDateTime(e.created_at)}</span>
                ),
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
                    <span className="text-zinc-600 dark:text-zinc-400">{formatTurkishDateTime(e.start_date)}</span>
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
                                : e.status === 'cancelled'
                                  ? 'bg-red-500/15 text-red-700 dark:text-red-400'
                                  : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400'
                        }`}
                    >
                        {eventStatusTr(e.status)}
                    </span>
                ),
            },
            {
                key: 'public_site',
                header: 'Sitede gör',
                mobileLabel: 'Sitede gör',
                cell: (e) =>
                    e.visible_on_site && e.public_event_url ? (
                        <a
                            href={e.public_event_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex font-medium text-amber-600 hover:underline dark:text-amber-400"
                        >
                            Sitede gör
                        </a>
                    ) : (
                        <span className="text-zinc-400 dark:text-zinc-500">—</span>
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
                    description="Etkinlikleri oluşturun, yayınlayın ve düzenleyin. Liste en son eklenen kayıtlar üstte olacak şekilde sıralanır."
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

                <form
                    onSubmit={submitFilters}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 lg:flex-row lg:flex-wrap lg:items-end"
                >
                    <div className="min-w-0 flex-1 lg:max-w-xs">
                        <label htmlFor="evt-search" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Başlıkta ara
                        </label>
                        <input
                            id="evt-search"
                            type="search"
                            name="search"
                            placeholder="Etkinlik adı…"
                            defaultValue={filters?.search ?? ''}
                            className={fieldClass}
                        />
                    </div>
                    <div className="w-full lg:w-52">
                        <label htmlFor="evt-venue" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Mekan
                        </label>
                        <select
                            id="evt-venue"
                            name="venue_id"
                            defaultValue={filters?.venue_id ?? ''}
                            className={fieldClass}
                        >
                            <option value="">Tüm mekanlar</option>
                            {venues.map((v) => (
                                <option key={v.id} value={String(v.id)}>
                                    {v.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full lg:w-44">
                        <label htmlFor="evt-status" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Durum
                        </label>
                        <select id="evt-status" name="status" defaultValue={filters?.status ?? ''} className={fieldClass}>
                            <option value="">Tümü</option>
                            <option value="draft">Taslak</option>
                            <option value="published">Yayında</option>
                            <option value="cancelled">İptal</option>
                        </select>
                    </div>
                    <div className="flex w-full flex-wrap gap-2 lg:w-auto">
                        <button
                            type="submit"
                            className="inline-flex flex-1 items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 lg:flex-none"
                        >
                            Filtrele
                        </button>
                        <Link
                            href={route('admin.events.index')}
                            className="inline-flex flex-1 items-center justify-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800 lg:flex-none"
                        >
                            Sıfırla
                        </Link>
                    </div>
                </form>

                <div className="flex flex-wrap items-center gap-2">
                    {selectedCount > 0 && (
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={bulkPublishSelected}
                                className="inline-flex items-center justify-center rounded-lg border border-emerald-400/80 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-500/25 dark:border-emerald-600/60 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-950/80"
                            >
                                Seçilenleri yayınla ({selectedCount})
                            </button>
                            <button
                                type="button"
                                onClick={bulkDeleteSelected}
                                className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
                            >
                                Seçilenleri sil ({selectedCount})
                            </button>
                        </div>
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
