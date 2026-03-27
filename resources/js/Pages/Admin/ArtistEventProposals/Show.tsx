import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface Proposal {
    id: number;
    status: string;
    venue_payload: Record<string, unknown>;
    event_payload: Record<string, unknown>;
    admin_message: string | null;
    created_at: string;
    reviewed_at: string | null;
    user: { id: number; name: string; email: string };
    artist: { id: number; name: string; slug: string } | null;
    reviewed_by: { id: number; name: string } | null;
    created_venue: { id: number; name: string; slug: string; status: string } | null;
    created_event: { id: number; title: string; status: string; slug: string } | null;
}

interface Props {
    proposal: Proposal;
}

function JsonBlock({ title, data }: Readonly<{ title: string; data: unknown }>) {
    const text = JSON.stringify(data, null, 2);

    return (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
            <h3 className="mb-2 font-semibold text-zinc-900 dark:text-white">{title}</h3>
            <pre className="max-h-[28rem] overflow-auto rounded-lg bg-white p-3 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">{text}</pre>
        </section>
    );
}

export default function AdminArtistEventProposalsShow({ proposal }: Readonly<Props>) {
    const rejectForm = useForm({ message: '' });

    const submitReject = (e: FormEvent) => {
        e.preventDefault();
        rejectForm.post(route('admin.artist-event-proposals.reject', proposal.id), {
            preserveScroll: true,
        });
    };

    const isPending = proposal.status === 'pending';

    return (
        <AdminLayout>
            <SeoHead title={`Öneri #${proposal.id} - Admin`} description="Sanatçı mekân ve etkinlik önerisi detayı." noindex />

            <div className="space-y-6">
                <AdminPageHeader
                    title={`Etkinlik önerisi #${proposal.id}`}
                    description="Gönderilen mekân ve etkinlik verilerinin tamamı aşağıdadır. Onaylandığında mekân onaylı kayıt ve taslak etkinlik oluşturulur."
                    actions={
                        <Link
                            href={route('admin.artist-event-proposals.index')}
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            ← Listeye dön
                        </Link>
                    }
                />

                <div className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:grid-cols-2">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Durum</p>
                        <p className="mt-1 font-semibold text-zinc-900 dark:text-white">{proposal.status}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Gönderim</p>
                        <p className="mt-1 text-zinc-800 dark:text-zinc-200">{formatTurkishDateTime(proposal.created_at, { withTime: true })}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sanatçı</p>
                        <p className="mt-1 text-zinc-800 dark:text-zinc-200">
                            {proposal.artist ? (
                                <Link href={route('admin.artists.edit', proposal.artist.id)} className="font-medium text-amber-700 hover:underline dark:text-amber-400">
                                    {proposal.artist.name}
                                </Link>
                            ) : (
                                '—'
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Kullanıcı</p>
                        <p className="mt-1 text-zinc-800 dark:text-zinc-200">
                            {proposal.user.name} — {proposal.user.email}
                        </p>
                    </div>
                    {proposal.reviewed_at ? (
                        <div className="sm:col-span-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">İnceleme</p>
                            <p className="mt-1 text-zinc-800 dark:text-zinc-200">
                                {formatTurkishDateTime(proposal.reviewed_at, { withTime: true })}
                                {proposal.reviewed_by ? ` — ${proposal.reviewed_by.name}` : null}
                            </p>
                            {proposal.admin_message ? (
                                <p className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                    {proposal.admin_message}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                    {proposal.created_venue ? (
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Oluşan mekân</p>
                            <Link
                                href={route('admin.venues.edit', proposal.created_venue.id)}
                                className="mt-1 inline-block font-medium text-amber-700 hover:underline dark:text-amber-400"
                            >
                                {proposal.created_venue.name} ({proposal.created_venue.status})
                            </Link>
                        </div>
                    ) : null}
                    {proposal.created_event ? (
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Oluşan etkinlik</p>
                            <Link
                                href={route('admin.events.edit', proposal.created_event.id)}
                                className="mt-1 inline-block font-medium text-amber-700 hover:underline dark:text-amber-400"
                            >
                                {proposal.created_event.title} ({proposal.created_event.status})
                            </Link>
                        </div>
                    ) : null}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <JsonBlock title="Önerilen mekân (venue_payload)" data={proposal.venue_payload} />
                    <JsonBlock title="Önerilen etkinlik (event_payload)" data={proposal.event_payload} />
                </div>

                {isPending ? (
                    <div className="flex flex-col gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 dark:bg-amber-500/10 sm:flex-row sm:items-start">
                        <Link
                            href={route('admin.artist-event-proposals.approve', proposal.id)}
                            method="post"
                            as="button"
                            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                        >
                            Onayla (mekân + taslak etkinlik oluştur)
                        </Link>
                        <form onSubmit={submitReject} className="min-w-0 flex-1 space-y-2">
                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Reddet — not (isteğe bağlı)</label>
                            <textarea
                                value={rejectForm.data.message}
                                onChange={(e) => rejectForm.setData('message', e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                            />
                            <button
                                type="submit"
                                disabled={rejectForm.processing}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                            >
                                Reddet
                            </button>
                        </form>
                    </div>
                ) : null}
            </div>
        </AdminLayout>
    );
}
