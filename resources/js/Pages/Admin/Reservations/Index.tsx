import { AdminDataTable, AdminPageHeader, type AdminColumn } from '@/Components/Admin';
import { formatTurkishDateTimeFromParts } from '@/lib/formatTurkishDateTime';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { Link, router } from '@inertiajs/react';
import { FormEvent, useMemo } from 'react';

interface Reservation {
    id: number;
    reservation_date: string;
    reservation_time: string;
    status: string;
    total_amount: number;
    reservation_type: string;
    guest_name: string | null;
    guest_phone: string | null;
    user: { name: string; email: string };
    venue: { name: string };
}

interface Props {
    reservations: { data: Reservation[]; links: unknown[] };
    stats: Record<string, number>;
    filters: { status?: string; date_from?: string; date_to?: string };
}

const fieldClass =
    'w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white sm:w-auto';

function reservationStatusClass(status: string): string {
    if (status === 'confirmed' || status === 'completed') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
    if (status === 'pending') return 'bg-amber-500/15 text-amber-800 dark:text-amber-400';
    return 'bg-red-500/15 text-red-700 dark:text-red-400';
}

export default function AdminReservationsIndex({ reservations, stats, filters }: Readonly<Props>) {
    const columns: AdminColumn<Reservation>[] = useMemo(
        () => [
            {
                key: 'customer',
                header: 'Müşteri',
                mobileLabel: 'Müşteri',
                cell: (r) => (
                    <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-white">{r.user.name}</p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{r.user.email}</p>
                        {(r.guest_name || r.guest_phone) && (
                            <p className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-500">
                                Form: {[r.guest_name, r.guest_phone].filter(Boolean).join(' · ')}
                            </p>
                        )}
                    </div>
                ),
            },
            {
                key: 'venue',
                header: 'Sahne',
                mobileLabel: 'Sahne',
                cell: (r) => <span className="text-zinc-600 dark:text-zinc-400">{r.venue.name}</span>,
            },
            {
                key: 'when',
                header: 'Tarih / Saat',
                mobileLabel: 'Tarih',
                cell: (r) => (
                    <span className="text-zinc-600 dark:text-zinc-400">
                        {formatTurkishDateTimeFromParts(r.reservation_date, r.reservation_time)}
                    </span>
                ),
            },
            {
                key: 'amount',
                header: 'Tutar',
                mobileLabel: 'Tutar',
                cell: (r) => (
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                        ₺{Number(r.total_amount).toLocaleString('tr-TR')}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Durum',
                mobileLabel: 'Durum',
                cell: (r) => (
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${reservationStatusClass(r.status)}`}>
                        {r.status}
                    </span>
                ),
            },
        ],
        [],
    );

    const onFilterSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const date_from = (fd.get('date_from') as string) || undefined;
        const date_to = (fd.get('date_to') as string) || undefined;
        const status = (fd.get('status') as string) || undefined;
        router.get(
            route('admin.reservations.index'),
            {
                ...(date_from ? { date_from } : {}),
                ...(date_to ? { date_to } : {}),
                ...(status ? { status } : {}),
            },
            { preserveState: true },
        );
    };

    return (
        <AdminLayout>
            <SeoHead title="Rezervasyonlar - Admin | Sahnebul" description="Tüm rezervasyonlar." noindex />

            <div className="space-y-6">
                <AdminPageHeader title="Rezervasyon Yönetimi" description="Rezervasyonları filtreleyin ve detayları görüntüleyin." />

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Toplam</p>
                        <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{stats.total}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Bekleyen</p>
                        <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Onaylı</p>
                        <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.confirmed}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">İptal</p>
                        <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">{stats.cancelled}</p>
                    </div>
                    <div className="col-span-2 rounded-xl border border-zinc-200 bg-white p-4 sm:col-span-1 lg:col-span-1 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Toplam gelir</p>
                        <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                            ₺{Number(stats.total_revenue).toLocaleString('tr-TR')}
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={onFilterSubmit}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:flex-wrap sm:items-end"
                >
                    <div className="min-w-0 sm:w-40">
                        <label htmlFor="res-date-from" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Başlangıç
                        </label>
                        <input id="res-date-from" type="date" name="date_from" defaultValue={filters.date_from} className={fieldClass} />
                    </div>
                    <div className="min-w-0 sm:w-40">
                        <label htmlFor="res-date-to" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Bitiş
                        </label>
                        <input id="res-date-to" type="date" name="date_to" defaultValue={filters.date_to} className={fieldClass} />
                    </div>
                    <div className="min-w-0 sm:min-w-[11rem]">
                        <label htmlFor="res-status" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Durum
                        </label>
                        <select id="res-status" name="status" defaultValue={filters.status ?? ''} className={fieldClass}>
                            <option value="">Tüm durumlar</option>
                            <option value="pending">Bekleyen</option>
                            <option value="confirmed">Onaylı</option>
                            <option value="cancelled">İptal</option>
                            <option value="completed">Tamamlandı</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 sm:w-auto"
                    >
                        Filtrele
                    </button>
                </form>

                <AdminDataTable
                    columns={columns}
                    rows={reservations.data}
                    getRowKey={(r) => r.id}
                    actions={(r) => (
                        <Link
                            href={route('admin.reservations.show', r.id)}
                            className="text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
                        >
                            Detay
                        </Link>
                    )}
                />
            </div>
        </AdminLayout>
    );
}
