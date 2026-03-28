import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/cn';

interface Row {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    subject: string | null;
    message: string;
    ip_address: string | null;
    is_spam: boolean;
    created_at: string;
}

interface Props {
    messages: { data: Row[]; links: { url: string | null; label: string; active?: boolean }[] };
    filter: 'inbox' | 'spam' | 'all';
    counts: { inbox: number; spam: number; all: number };
}

function stripTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
}

function excerpt(text: string, max = 140): string {
    const t = text.replace(/\s+/g, ' ').trim();
    if (t.length <= max) {
        return t;
    }
    return `${t.slice(0, max)}…`;
}

export default function AdminContactMessagesIndex({ messages, filter, counts }: Readonly<Props>) {
    const flash = (usePage().props as { flash?: { success?: string; error?: string } }).flash;

    const tabs: { id: typeof filter; label: string; count: number }[] = [
        { id: 'inbox', label: 'Gelen kutusu', count: counts.inbox },
        { id: 'spam', label: 'Spam', count: counts.spam },
        { id: 'all', label: 'Tümü', count: counts.all },
    ];

    return (
        <AdminLayout>
            <SeoHead title="İletişim mesajları - Admin | Sahnebul" description="İletişim formu kayıtları." noindex />

            <div className="space-y-6">
                <AdminPageHeader
                    title="İletişim mesajları"
                    description="Her mesajı ayrı sayfada görüntüleyebilir, düzenleyebilir veya silebilirsiniz. Spam işaretli kayıtlar gelen kutusunda listelenmez."
                />

                {flash?.success ? (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
                        {flash.success}
                    </p>
                ) : null}
                {flash?.error ? (
                    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">{flash.error}</p>
                ) : null}

                <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900/40">
                    {tabs.map((t) => (
                        <Link
                            key={t.id}
                            href={route('admin.contact-messages.index', { filter: t.id === 'inbox' ? undefined : t.id })}
                            className={cn(
                                'rounded-lg px-4 py-2 text-sm font-medium transition',
                                filter === t.id
                                    ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-white dark:ring-zinc-600'
                                    : 'text-zinc-600 hover:bg-white/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200',
                            )}
                        >
                            {t.label}
                            <span className="ml-1.5 tabular-nums text-zinc-500 dark:text-zinc-500">({t.count})</span>
                        </Link>
                    ))}
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    <Link href={route('contact')} className="font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400">
                        İletişim formu
                    </Link>{' '}
                    için sınırlama: aynı IP’den dakikada en fazla 8 gönderim; aynı e-posta + metin 15 dakika içinde tekrarlanırsa sessizce kabul bildirimi (çift kayıt oluşmaz).
                </p>

                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
                    {messages.data.length === 0 ? (
                        <p className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Bu görünümde mesaj yok.</p>
                    ) : (
                        <ul className="divide-y divide-zinc-100 dark:divide-white/10">
                            {messages.data.map((row) => (
                                <li key={row.id}>
                                    <Link
                                        href={route('admin.contact-messages.show', row.id)}
                                        className="block px-4 py-4 transition hover:bg-zinc-50 dark:hover:bg-white/5"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-zinc-900 dark:text-white">{row.name}</p>
                                                <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">{row.email}</p>
                                            </div>
                                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                                {row.is_spam ? (
                                                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
                                                        Spam
                                                    </span>
                                                ) : null}
                                                <time className="text-xs text-zinc-500" dateTime={row.created_at}>
                                                    {formatTurkishDateTime(row.created_at)}
                                                </time>
                                            </div>
                                        </div>
                                        {row.subject ? (
                                            <p className="mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">Konu: {row.subject}</p>
                                        ) : null}
                                        <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{excerpt(row.message)}</p>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {messages.data.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                        {messages.links.map((link, i) =>
                            link.url ? (
                                <Link
                                    key={link.url}
                                    href={link.url}
                                    className={cn(
                                        'rounded-lg px-3 py-1.5 text-sm',
                                        link.active
                                            ? 'bg-amber-500 text-zinc-950'
                                            : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-white/5',
                                    )}
                                >
                                    {stripTags(link.label)}
                                </Link>
                            ) : (
                                <span key={`e-${i}`} className="rounded-lg px-3 py-1.5 text-sm text-zinc-400">
                                    {stripTags(link.label)}
                                </span>
                            ),
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
