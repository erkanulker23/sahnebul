import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { Link } from '@inertiajs/react';

interface Plan {
    id: number;
    name: string;
    membership_type: 'artist' | 'venue';
    interval: 'monthly' | 'yearly';
    trial_days?: number;
    price: string;
    features?: string | null;
    is_active: boolean;
}

interface Props {
    plans: Plan[];
}

export default function AdminSubscriptions({ plans }: Readonly<Props>) {
    return (
        <AdminLayout>
            <SeoHead title="Üyelik Paketleri" description="Abonelik planlarını yönetin." noindex />
            <div className="space-y-6">
                <AdminPageHeader
                    title="Üyelik paketleri"
                    description="Sanatçı ve mekan üyelik planlarını görüntüleyin."
                    actions={
                        <Link
                            href={route('admin.subscriptions.create')}
                            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400"
                        >
                            + Yeni paket
                        </Link>
                    }
                />

                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                    {plans.length === 0 ? (
                        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">Henüz paket yok. Yeni paket ekleyin.</p>
                    ) : (
                        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800" role="list">
                            {plans.map((p) => (
                                <li
                                    key={p.id}
                                    className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium text-zinc-900 dark:text-white">{p.name}</p>
                                        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                                            {p.membership_type} / {p.interval}
                                            {(p.trial_days ?? 0) > 0 ? ` / ${p.trial_days} gün deneme` : ' / deneme yok'}
                                            {' — '}₺{Number(p.price).toLocaleString('tr-TR')}
                                        </p>
                                    </div>
                                    <span
                                        className={
                                            p.is_active
                                                ? 'inline-flex w-fit rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-400'
                                                : 'inline-flex w-fit rounded-full bg-zinc-500/15 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400'
                                        }
                                    >
                                        {p.is_active ? 'Aktif' : 'Pasif'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
