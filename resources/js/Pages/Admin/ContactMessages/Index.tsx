import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { Link } from '@inertiajs/react';

interface Row {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    subject: string | null;
    message: string;
    ip_address: string | null;
    created_at: string;
}

interface Props {
    messages: { data: Row[]; links: unknown[] };
}

function stripTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
}

export default function AdminContactMessagesIndex({ messages }: Readonly<Props>) {
    return (
        <AdminLayout>
            <SeoHead title="İletişim mesajları - Admin | Sahnebul" description="İletişim formu kayıtları." noindex />

            <div className="space-y-6">
                <AdminPageHeader
                    title="İletişim mesajları"
                    description="Sitedeki iletişim formundan gelen mesajlar veritabanında saklanır; ayarlardaki iletişim e-postasına ve admin hesaplarına da bildirim gider."
                />

                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    <Link href={route('contact')} className="font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400">
                        İletişim sayfasından
                    </Link>{' '}
                    gönderilen tüm kayıtlar burada listelenir.
                </p>

                <div className="space-y-4">
                    {messages.data.length === 0 ? (
                        <p className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                            Henüz mesaj yok.
                        </p>
                    ) : (
                        messages.data.map((row) => (
                            <article
                                key={row.id}
                                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-3 dark:border-white/10">
                                    <div>
                                        <p className="font-semibold text-zinc-900 dark:text-white">{row.name}</p>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                            <a href={`mailto:${row.email}`} className="text-amber-600 hover:underline dark:text-amber-400">
                                                {row.email}
                                            </a>
                                            {row.phone ? (
                                                <>
                                                    {' · '}
                                                    <a href={`tel:${row.phone}`} className="text-amber-600 hover:underline dark:text-amber-400">
                                                        {row.phone}
                                                    </a>
                                                </>
                                            ) : null}
                                        </p>
                                    </div>
                                    <time className="text-xs text-zinc-500 dark:text-zinc-400" dateTime={row.created_at}>
                                        {formatTurkishDateTime(row.created_at)}
                                    </time>
                                </div>
                                {row.subject ? (
                                    <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">Konu: {row.subject}</p>
                                ) : null}
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{row.message}</p>
                                {row.ip_address ? (
                                    <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">IP: {row.ip_address}</p>
                                ) : null}
                            </article>
                        ))
                    )}
                </div>

                {messages.data.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                        {(messages.links as { url: string | null; label: string; active?: boolean }[]).map((link, i) =>
                            link.url ? (
                                <Link
                                    key={i}
                                    href={link.url}
                                    className={`rounded-lg px-3 py-1.5 text-sm ${
                                        link.active
                                            ? 'bg-amber-500 text-zinc-950'
                                            : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-white/5'
                                    }`}
                                >
                                    {stripTags(link.label)}
                                </Link>
                            ) : (
                                <span key={i} className="rounded-lg px-3 py-1.5 text-sm text-zinc-400">
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
