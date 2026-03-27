import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { Link } from '@inertiajs/react';

interface ProposalRow {
    id: number;
    status: string;
    created_at: string;
    user: { id: number; name: string; email: string };
    artist: { id: number; name: string; slug: string } | null;
}

interface Props {
    proposals: {
        data: ProposalRow[];
        links: { url: string | null; label: string; active: boolean }[];
    };
}

function statusTr(s: string): string {
    if (s === 'pending') return 'Bekliyor';
    if (s === 'approved') return 'Onaylandı';
    if (s === 'rejected') return 'Reddedildi';
    return s;
}

function badgeClass(s: string): string {
    if (s === 'pending') return 'bg-amber-500/15 text-amber-800 dark:text-amber-400';
    if (s === 'approved') return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400';
    return 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400';
}

export default function AdminArtistEventProposalsIndex({ proposals }: Readonly<Props>) {
    return (
        <AdminLayout>
            <SeoHead title="Sanatçı etkinlik önerileri - Admin" description="Yeni mekân + etkinlik birlikte önerileri." noindex />

            <div className="space-y-6">
                <AdminPageHeader
                    title="Sanatçı etkinlik önerileri"
                    description="Onaylı sanatçı profili olan kullanıcılar, katalogda bulamadıkları mekân için mekân bilgileri ve etkinlik taslağını birlikte gönderir. Onayda mekân oluşturulur (onaylı) ve taslak etkinlik bağlanır."
                />

                <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/80">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Tarih</th>
                                <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Sanatçı</th>
                                <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Gönderen</th>
                                <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Durum</th>
                                <th className="px-4 py-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {proposals.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                                        Kayıt yok.
                                    </td>
                                </tr>
                            ) : (
                                proposals.data.map((p) => (
                                    <tr key={p.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                                            {formatTurkishDateTime(p.created_at, { withTime: true })}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-900 dark:text-white">
                                            {p.artist ? (
                                                <Link
                                                    href={route('admin.artists.edit', p.artist.id)}
                                                    className="font-medium text-amber-700 hover:underline dark:text-amber-400"
                                                >
                                                    {p.artist.name}
                                                </Link>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                            <span className="block font-medium text-zinc-800 dark:text-zinc-200">{p.user.name}</span>
                                            <span className="text-xs">{p.user.email}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass(p.status)}`}>
                                                {statusTr(p.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={route('admin.artist-event-proposals.show', p.id)}
                                                className="font-medium text-amber-700 hover:underline dark:text-amber-400"
                                            >
                                                Detay
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {proposals.links.length > 3 ? (
                    <div className="flex flex-wrap gap-2">
                        {proposals.links.map((l, i) =>
                            l.url ? (
                                <Link
                                    key={i}
                                    href={l.url}
                                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                                        l.active
                                            ? 'border-amber-500 bg-amber-500/10 font-medium text-amber-900 dark:text-amber-200'
                                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                    }`}
                                    preserveState
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ) : (
                                <span
                                    key={i}
                                    className="rounded-lg border border-transparent px-3 py-1.5 text-sm text-zinc-400"
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ),
                        )}
                    </div>
                ) : null}
            </div>
        </AdminLayout>
    );
}
