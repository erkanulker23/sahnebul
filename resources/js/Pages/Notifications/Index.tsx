import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import UserPanelLayout from '@/Layouts/UserPanelLayout';
import { Link } from '@inertiajs/react';

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
        <UserPanelLayout>
            <SeoHead title="Bildirimler - Sahnebul" description="Hesap bildirimleriniz." noindex />

            <div className="pb-8">
                <div className="mx-auto max-w-3xl">
                    <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Bildirimler</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Hesap bildirimleriniz</p>

                    {notifications.data.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-white/5 dark:bg-zinc-900/50 dark:shadow-none">
                            <p className="text-5xl opacity-40">🔔</p>
                            <p className="mt-4 text-zinc-600 dark:text-zinc-400">Henüz bildiriminiz yok</p>
                        </div>
                    ) : (
                        <div className="mt-8 space-y-4">
                            {notifications.data.map((n) => {
                                const row = n.data as { title?: string; message?: string; url?: string };
                                const safeUrl =
                                    typeof row.url === 'string' && row.url.startsWith('/') && !row.url.startsWith('//')
                                        ? row.url
                                        : null;
                                return (
                                    <div
                                        key={n.id}
                                        className={`rounded-2xl border p-6 ${
                                            n.read_at
                                                ? 'border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900/40'
                                                : 'border-amber-300/80 bg-amber-50/90 dark:border-amber-500/30 dark:bg-amber-500/10'
                                        }`}
                                    >
                                        {row.title ? (
                                            <p className="font-semibold text-zinc-900 dark:text-white">{row.title}</p>
                                        ) : null}
                                        <p className="text-zinc-800 dark:text-zinc-300">{row.message || 'Bildirim'}</p>
                                        {safeUrl ? (
                                            <Link
                                                href={safeUrl}
                                                className="mt-3 inline-block text-sm font-medium text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                                            >
                                                Bağlantıya git →
                                            </Link>
                                        ) : null}
                                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-500">{formatTurkishDateTime(n.created_at)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </UserPanelLayout>
    );
}
