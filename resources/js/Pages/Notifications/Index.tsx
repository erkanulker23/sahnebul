import AccountQuickNav from '@/Components/AccountQuickNav';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

interface Notification {
    id: string;
    type: string;
    data: Record<string, unknown>;
    read_at: string | null;
    created_at: string;
}

interface Props {
    notifications: { data: Notification[] };
}

export default function NotificationsIndex({ notifications }: Props) {
    return (
        <AuthenticatedLayout
            header={<h2 className="font-display text-xl font-semibold text-zinc-900 dark:text-white">Bildirimler</h2>}
        >
            <SeoHead title="Bildirimler - Sahnebul" description="Hesap bildirimleriniz." noindex />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <AccountQuickNav className="mb-6" />
                    {notifications.data.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-white/5 dark:bg-zinc-900/50 dark:shadow-none">
                            <p className="text-5xl opacity-40">🔔</p>
                            <p className="mt-4 text-zinc-600 dark:text-zinc-400">Henüz bildiriminiz yok</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notifications.data.map((n) => (
                                <div
                                    key={n.id}
                                    className={`rounded-xl border p-6 ${
                                        n.read_at
                                            ? 'border-zinc-200 bg-zinc-50 dark:border-white/5 dark:bg-zinc-900/30'
                                            : 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5'
                                    }`}
                                >
                                    <p className="text-zinc-800 dark:text-zinc-300">
                                        {(n.data as { message?: string })?.message || 'Bildirim'}
                                    </p>
                                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-500">{formatTurkishDateTime(n.created_at)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
