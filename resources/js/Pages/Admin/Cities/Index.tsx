import { AdminDataTable, AdminPageHeader, type AdminColumn } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

interface City {
    id: number;
    name: string;
    slug: string;
    external_id: number | null;
    latitude: number | null;
    longitude: number | null;
    venues_count: number;
}

interface Props {
    cities: City[];
    turkiyeApiDocsUrl: string;
    syncFailed: boolean;
}

export default function AdminCitiesIndex({ cities, turkiyeApiDocsUrl, syncFailed }: Readonly<Props>) {
    const [syncing, setSyncing] = useState(false);

    const handleSync = () => {
        setSyncing(true);
        router.post(route('admin.cities.sync'), {}, { onFinish: () => setSyncing(false) });
    };

    const columns: AdminColumn<City>[] = useMemo(
        () => [
            {
                key: 'name',
                header: 'İl',
                mobileLabel: 'İl',
                cell: (c) => <span className="font-medium text-zinc-900 dark:text-white">{c.name}</span>,
            },
            {
                key: 'ext',
                header: 'API id',
                mobileLabel: 'API id',
                cell: (c) => <span className="tabular-nums text-zinc-600 dark:text-zinc-400">{c.external_id ?? '—'}</span>,
            },
            {
                key: 'coords',
                header: 'Koordinatlar',
                mobileLabel: 'Koordinat',
                cell: (c) => (
                    <span className="text-zinc-600 dark:text-zinc-400">
                        {c.latitude != null && c.longitude != null ? `${c.latitude}, ${c.longitude}` : '—'}
                    </span>
                ),
            },
            {
                key: 'venues',
                header: 'Sahne sayısı',
                mobileLabel: 'Sahne',
                className: 'tabular-nums',
                cell: (c) => <span className="text-zinc-700 dark:text-zinc-300">{c.venues_count}</span>,
            },
        ],
        [],
    );

    return (
        <AdminLayout>
            <SeoHead title="Şehirler - Admin | Sahnebul" description="Türkiye API ile il listesi." noindex />

            <div className="space-y-6">
                <AdminPageHeader
                    title="İller (şehirler)"
                    description={
                        <span>
                            Liste{' '}
                            <a
                                href={turkiyeApiDocsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-amber-600 underline hover:text-amber-500 dark:text-amber-400"
                            >
                                TurkiyeAPI
                            </a>{' '}
                            üzerinden gelir; veritabanında mekan seçimleri için saklanır. Manuel ekleme veya düzenleme yok — güncellemek için senkronizasyonu kullanın.
                        </span>
                    }
                    actions={
                        <button
                            type="button"
                            onClick={handleSync}
                            disabled={syncing}
                            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400 disabled:opacity-50"
                        >
                            {syncing ? 'Senkronize ediliyor…' : "API'den yenile"}
                        </button>
                    }
                />

                {syncFailed && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-200">
                        Son API isteği başarısız olmuş olabilir. Bağlantınızı kontrol edip tekrar deneyin.
                    </div>
                )}

                <AdminDataTable
                    columns={columns}
                    rows={cities}
                    getRowKey={(c) => c.id}
                    emptyMessage="Henüz il kaydı yok. Yukarıdaki «API'den yenile» ile 81 ili çekin."
                />

            </div>
        </AdminLayout>
    );
}
