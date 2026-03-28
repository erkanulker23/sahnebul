import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { Link, router, usePage } from '@inertiajs/react';

interface Message {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    subject: string | null;
    message: string;
    ip_address: string | null;
    user_agent: string | null;
    is_spam: boolean;
    admin_note: string | null;
    created_at: string;
    updated_at: string;
}

interface Props {
    message: Message;
}

export default function AdminContactMessageShow({ message: m }: Readonly<Props>) {
    const flash = (usePage().props as { flash?: { success?: string; error?: string } }).flash;

    const destroy = () => {
        if (!confirm('Bu mesajı kalıcı olarak silmek istediğinize emin misiniz?')) {
            return;
        }
        router.delete(route('admin.contact-messages.destroy', m.id));
    };

    const toggleSpam = () => {
        router.post(route('admin.contact-messages.toggle-spam', m.id), {}, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <SeoHead title={`İletişim mesajı #${m.id} - Admin`} description="" noindex />

            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Link
                            href={route('admin.contact-messages.index')}
                            className="text-sm text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                        >
                            ← Mesaj listesi
                        </Link>
                        <h1 className="mt-2 font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                            Mesaj #{m.id}
                        </h1>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{formatTurkishDateTime(m.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={route('admin.contact-messages.edit', m.id)}
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            Düzenle
                        </Link>
                        <button
                            type="button"
                            onClick={toggleSpam}
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            {m.is_spam ? 'Gelen kutusuna al' : 'Spam işaretle'}
                        </button>
                        <button
                            type="button"
                            onClick={destroy}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                        >
                            Sil
                        </button>
                    </div>
                </div>

                {flash?.success ? (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
                        {flash.success}
                    </p>
                ) : null}

                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-4 dark:border-white/10">
                        <p className="text-lg font-semibold text-zinc-900 dark:text-white">{m.name}</p>
                        {m.is_spam ? (
                            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
                                Spam
                            </span>
                        ) : null}
                    </div>
                    <dl className="mt-4 space-y-3 text-sm">
                        <div>
                            <dt className="font-medium text-zinc-500 dark:text-zinc-400">E-posta</dt>
                            <dd>
                                <a href={`mailto:${m.email}`} className="text-amber-600 hover:underline dark:text-amber-400">
                                    {m.email}
                                </a>
                            </dd>
                        </div>
                        {m.phone ? (
                            <div>
                                <dt className="font-medium text-zinc-500 dark:text-zinc-400">Telefon</dt>
                                <dd>
                                    <a href={`tel:${m.phone}`} className="text-amber-600 hover:underline dark:text-amber-400">
                                        {m.phone}
                                    </a>
                                </dd>
                            </div>
                        ) : null}
                        {m.subject ? (
                            <div>
                                <dt className="font-medium text-zinc-500 dark:text-zinc-400">Konu</dt>
                                <dd className="text-zinc-900 dark:text-zinc-100">{m.subject}</dd>
                            </div>
                        ) : null}
                        {m.ip_address ? (
                            <div>
                                <dt className="font-medium text-zinc-500 dark:text-zinc-400">IP</dt>
                                <dd className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{m.ip_address}</dd>
                            </div>
                        ) : null}
                        {m.user_agent ? (
                            <div>
                                <dt className="font-medium text-zinc-500 dark:text-zinc-400">User-Agent</dt>
                                <dd className="break-all text-xs text-zinc-600 dark:text-zinc-400">{m.user_agent}</dd>
                            </div>
                        ) : null}
                    </dl>
                    <div className="mt-6">
                        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Mesaj</h2>
                        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-100 bg-zinc-50/80 p-4 text-sm leading-relaxed text-zinc-800 dark:border-white/10 dark:bg-zinc-950/40 dark:text-zinc-200">
                            {m.message}
                        </p>
                    </div>
                    {m.admin_note ? (
                        <div className="mt-6">
                            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Yönetici notu</h2>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{m.admin_note}</p>
                        </div>
                    ) : null}
                </div>
            </div>
        </AdminLayout>
    );
}
