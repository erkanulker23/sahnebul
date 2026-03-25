import { AdminDataTable, AdminExcelActions, AdminPageHeader, type AdminColumn } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import { sanitizeHtmlForInnerHtml } from '@/Components/SafeRichContent';
import { venueArtistStatusTr } from '@/lib/statusLabels';
import SeoHead from '@/Components/SeoHead';
import { Link, router } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface Artist {
    id: number;
    name: string;
    slug: string;
    genre: string | null;
    status: string;
    view_count?: number;
    events_count?: number;
}

type PaginationLink = { url: string | null; label: string; active: boolean };

interface Props {
    artists: {
        data: Artist[];
        links: PaginationLink[];
        current_page?: number;
        last_page?: number;
        from?: number | null;
        to?: number | null;
        total?: number;
        per_page?: number;
    };
    filters?: { search?: string; status?: string };
}

const inputClass =
    'min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white sm:max-w-xs';

const filterBtn =
    'rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800';

function statusBadgeClass(status: string): string {
    if (status === 'approved') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
    if (status === 'pending') return 'bg-amber-500/15 text-amber-800 dark:text-amber-400';
    return 'bg-red-500/15 text-red-700 dark:text-red-400';
}

type RowSelectionMeta = Record<number, { events_count: number }>;

export default function AdminArtistsIndex({ artists, filters }: Readonly<Props>) {
    const [search, setSearch] = useState(filters?.search ?? '');
    const [selectedRows, setSelectedRows] = useState<RowSelectionMeta>({});

    useEffect(() => {
        setSearch(filters?.search ?? '');
    }, [filters?.search]);

    useEffect(() => {
        setSelectedRows({});
    }, [filters?.search, filters?.status]);

    const columns: AdminColumn<Artist>[] = useMemo(
        () => [
            {
                key: 'name',
                header: 'Sanatçı',
                mobileLabel: 'Sanatçı',
                cell: (a) => <span className="font-medium text-zinc-900 dark:text-white">{a.name}</span>,
            },
            {
                key: 'genre',
                header: 'Müzik türleri',
                mobileLabel: 'Müzik',
                cell: (a) => <span className="text-zinc-600 dark:text-zinc-400">{a.genre ?? '—'}</span>,
            },
            {
                key: 'status',
                header: 'Durum',
                mobileLabel: 'Durum',
                cell: (a) => (
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(a.status)}`}>
                        {venueArtistStatusTr(a.status)}
                    </span>
                ),
            },
            {
                key: 'views',
                header: 'Görüntülenme',
                mobileLabel: 'Görüntülenme',
                className: 'text-right tabular-nums',
                cell: (a) => (
                    <span className="text-zinc-700 dark:text-zinc-300">{(a.view_count ?? 0).toLocaleString('tr-TR')}</span>
                ),
            },
        ],
        [],
    );

    const goList = (status?: string) => {
        const q: Record<string, string> = {};
        const s = search.trim();
        if (s) q.search = s;
        if (status) q.status = status;
        router.get(route('admin.artists.index'), q, { preserveState: true });
    };

    const selectedCount = Object.keys(selectedRows).length;

    const toggleRow = useCallback((artist: Artist, checked: boolean) => {
        setSelectedRows((prev) => {
            const next = { ...prev };
            if (checked) {
                next[artist.id] = { events_count: artist.events_count ?? 0 };
            } else {
                delete next[artist.id];
            }
            return next;
        });
    }, []);

    const togglePage = useCallback(
        (checked: boolean) => {
            setSelectedRows((prev) => {
                const next = { ...prev };
                for (const a of artists.data) {
                    if (checked) {
                        next[a.id] = { events_count: a.events_count ?? 0 };
                    } else {
                        delete next[a.id];
                    }
                }
                return next;
            });
        },
        [artists.data],
    );

    const bulkDeleteSelected = useCallback(() => {
        const ids = Object.keys(selectedRows).map(Number);
        if (ids.length === 0) {
            return;
        }
        const withEvents = ids.filter((id) => (selectedRows[id]?.events_count ?? 0) > 0).length;
        const sumEvents = ids.reduce((s, id) => s + (selectedRows[id]?.events_count ?? 0), 0);

        if (withEvents > 0) {
            if (
                confirm(
                    `Seçilen ${ids.length} sanatçıdan ${withEvents} tanesinin etkinliği var (toplam ${sumEvents} etkinlik). Bu etkinlikleri de silmek istiyor musunuz?`,
                )
            ) {
                router.post(route('admin.artists.bulk-destroy'), { ids, delete_related_events: true });
                return;
            }
            if (
                !confirm(
                    'Yalnızca sanatçılar silinsin mi? Etkinlik kayıtları kalır; seçilen sanatçılar etkinliklerden çıkarılır.',
                )
            ) {
                return;
            }
            router.post(route('admin.artists.bulk-destroy'), { ids, delete_related_events: false });
            return;
        }
        if (!confirm(`${ids.length} sanatçıyı silmek istediğinize emin misiniz?`)) {
            return;
        }
        router.post(route('admin.artists.bulk-destroy'), { ids, delete_related_events: false });
    }, [selectedRows]);

    return (
        <AdminLayout>
            <SeoHead title="Sanatçılar - Admin | Sahnebul" description="Sanatçı kayıtlarını yönetin." noindex />

            <div className="space-y-6">
                <AdminPageHeader
                    title="Sanatçı Yönetimi"
                    description="Profilleri onaylayın, düzenleyin veya kaldırın."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <AdminExcelActions exportRoute="admin.artists.excel-export" importRoute="admin.artists.excel-import" />
                            <Link
                                href={route('admin.artists.create')}
                                className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400"
                            >
                                + Yeni sanatçı
                            </Link>
                        </div>
                    }
                />

                <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <label htmlFor="artist-search" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                Ara
                            </label>
                            <input
                                id="artist-search"
                                className={inputClass}
                                placeholder="İsim ile ara…"
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
                        Bekleyen
                    </button>
                    <button type="button" onClick={() => goList('approved')} className={filterBtn}>
                        Onaylı
                    </button>
                    <button type="button" onClick={() => goList('rejected')} className={filterBtn}>
                        Reddedilen
                    </button>
                </div>

                {typeof artists.total === 'number' && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Toplam{' '}
                        <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                            {artists.total.toLocaleString('tr-TR')}
                        </span>{' '}
                        sanatçı
                        {artists.from != null && artists.to != null && artists.total > 0 && (
                            <>
                                {' '}
                                · bu sayfada{' '}
                                <span className="tabular-nums">
                                    {artists.from.toLocaleString('tr-TR')}–{artists.to.toLocaleString('tr-TR')}
                                </span>
                            </>
                        )}
                        {typeof artists.last_page === 'number' && artists.last_page > 1 && (
                            <>
                                {' '}
                                · sayfa {artists.current_page ?? '—'} / {artists.last_page}
                            </>
                        )}
                    </p>
                )}

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
                    rows={artists.data}
                    getRowKey={(a) => a.id}
                    selection={{
                        getRowId: (a) => a.id,
                        isRowSelected: (a) => Boolean(selectedRows[a.id]),
                        onToggleRow: toggleRow,
                        onTogglePage: togglePage,
                    }}
                    actions={(artist) => (
                        <>
                            {artist.status === 'pending' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => router.post(route('admin.artists.approve', artist.id))}
                                        className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                                    >
                                        Onayla
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => router.post(route('admin.artists.reject', artist.id))}
                                        className="text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
                                    >
                                        Reddet
                                    </button>
                                </>
                            )}
                            <Link href={route('admin.artists.edit', artist.id)} className="text-sm font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400">
                                Düzenle
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    const n = artist.events_count ?? 0;
                                    if (n > 0) {
                                        if (
                                            confirm(
                                                `Bu sanatçıya bağlı ${n} etkinlik var. Bu etkinlikleri de silmek istiyor musunuz?`,
                                            )
                                        ) {
                                            router.delete(route('admin.artists.destroy', artist.id), {
                                                data: { delete_related_events: true },
                                            });
                                            return;
                                        }
                                        if (
                                            !confirm(
                                                'Yalnızca sanatçı silinsin mi? Etkinlik kayıtları kalır; bu sanatçı etkinliklerden çıkarılır.',
                                            )
                                        ) {
                                            return;
                                        }
                                    } else if (!confirm('Bu sanatçıyı silmek istediğinize emin misiniz?')) {
                                        return;
                                    }
                                    router.delete(route('admin.artists.destroy', artist.id));
                                }}
                                className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                            >
                                Sil
                            </button>
                        </>
                    )}
                />

                {Array.isArray(artists.links) && artists.links.length > 0 && (artists.last_page ?? 0) > 1 && (
                    <div className="flex flex-wrap gap-2">
                        {artists.links.map((link, idx) => {
                            const label = link.label
                                .replace('&laquo; Previous', 'Önceki')
                                .replace('Next &raquo;', 'Sonraki');
                            if (!link.url) {
                                return (
                                    <span
                                        key={`${label}-${idx}`}
                                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-600"
                                    >
                                        <span dangerouslySetInnerHTML={{ __html: sanitizeHtmlForInnerHtml(label) }} />
                                    </span>
                                );
                            }

                            return (
                                <Link
                                    key={`${label}-${idx}`}
                                    href={link.url}
                                    preserveState
                                    preserveScroll
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                                        link.active
                                            ? 'border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-300'
                                            : 'border-zinc-300 bg-white text-zinc-800 hover:border-amber-400 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-300 dark:hover:border-amber-500/30'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtmlForInnerHtml(label) }}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
