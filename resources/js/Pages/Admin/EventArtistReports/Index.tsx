import { AdminPageHeader } from '@/Components/Admin';
import { sanitizeHtmlForInnerHtml } from '@/Components/SafeRichContent';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { cn } from '@/lib/cn';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { safeRoute } from '@/lib/safeRoute';
import { Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface ReportRow {
    id: number;
    status: string;
    message: string;
    admin_note: string | null;
    created_at: string;
    reviewed_at: string | null;
    event: {
        id: number;
        title: string;
        slug: string;
        status: string;
        start_date: string | null;
        venue: { id: number; name: string; slug: string };
    };
    artist: { id: number; name: string; slug: string };
    user: { id: number; name: string; email: string };
}

type PaginationLink = { url: string | null; label: string; active: boolean };

interface Props {
    reports: {
        data: ReportRow[];
        links: PaginationLink[];
        last_page?: number;
    };
    filters: { status?: string | null };
}

const fieldClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white sm:w-auto';

function statusTr(s: string): string {
    switch (s) {
        case 'pending':
            return 'Bekliyor';
        case 'resolved':
            return 'Çözüldü';
        case 'dismissed':
            return 'Reddedildi';
        default:
            return s;
    }
}

function statusBadgeClass(s: string): string {
    switch (s) {
        case 'pending':
            return 'bg-amber-500/15 text-amber-800 dark:text-amber-400';
        case 'resolved':
            return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400';
        case 'dismissed':
            return 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400';
        default:
            return 'bg-zinc-500/15 text-zinc-600';
    }
}

export default function AdminEventArtistReportsIndex({ reports, filters }: Readonly<Props>) {
    const [notes, setNotes] = useState<Record<number, string>>({});

    const submitFilters = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const status = (fd.get('status') as string) || undefined;
        router.get(
            safeRoute('admin.event-artist-reports.index'),
            { ...(status ? { status } : {}) },
            { preserveState: true },
        );
    };

    const patchReport = (id: number, status: 'resolved' | 'dismissed') => {
        const admin_note = (notes[id] ?? '').trim() || null;
        router.patch(
            safeRoute('admin.event-artist-reports.update', { report: id }),
            { status, admin_note },
            { preserveScroll: true },
        );
    };

    return (
        <AdminLayout>
            <SeoHead title="Kadro raporları - Admin | Sahnebul" description="Sanatçıların etkinlik kadrosu hakkındaki bildirimleri." noindex />

            <div className="space-y-6">
                <AdminPageHeader
                    title="Kadro / etkinlik raporları"
                    description="Mekânın eklediği etkinlikte kadroda görünüp itiraz eden sanatçıların mesajları."
                />

                <form
                    onSubmit={submitFilters}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:flex-wrap sm:items-end"
                >
                    <div className="w-full sm:w-48">
                        <label htmlFor="ear-status" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Durum
                        </label>
                        <select id="ear-status" name="status" defaultValue={filters.status ?? ''} className={fieldClass}>
                            <option value="">Tümü</option>
                            <option value="pending">Bekleyen</option>
                            <option value="resolved">Çözüldü</option>
                            <option value="dismissed">Reddedildi</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 sm:w-auto"
                    >
                        Filtrele
                    </button>
                </form>

                <div className="space-y-4">
                    {reports.data.map((r) => (
                        <div
                            key={r.id}
                            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', statusBadgeClass(r.status))}>
                                            {statusTr(r.status)}
                                        </span>
                                        <span className="text-xs text-zinc-500">
                                            {formatTurkishDateTime(r.created_at)}
                                        </span>
                                    </div>
                                    <p className="font-medium text-zinc-900 dark:text-white">
                                        <Link
                                            href={route('admin.events.edit', r.event.id)}
                                            className="hover:text-amber-600 dark:hover:text-amber-400"
                                        >
                                            {r.event.title}
                                        </Link>
                                        <span className="font-normal text-zinc-500"> · {r.event.venue.name}</span>
                                    </p>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        Sanatçı:{' '}
                                        <Link
                                            href={route('admin.artists.edit', r.artist.id)}
                                            className="font-medium text-amber-700 hover:text-amber-600 dark:text-amber-400"
                                        >
                                            {r.artist.name}
                                        </Link>
                                        {' · '}
                                        Bildiren: {r.user.name} ({r.user.email})
                                    </p>
                                    <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
                                        {r.message}
                                    </div>
                                    {r.admin_note ? (
                                        <p className="text-sm text-zinc-500">
                                            <span className="font-medium text-zinc-600 dark:text-zinc-400">Yönetici notu:</span> {r.admin_note}
                                        </p>
                                    ) : null}
                                    {r.reviewed_at ? (
                                        <p className="text-xs text-zinc-400">İnceleme: {formatTurkishDateTime(r.reviewed_at)}</p>
                                    ) : null}
                                </div>
                                {r.status === 'pending' ? (
                                    <div className="flex w-full flex-col gap-2 sm:w-72">
                                        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" htmlFor={`note-${r.id}`}>
                                            Yönetici notu (isteğe bağlı)
                                        </label>
                                        <textarea
                                            id={`note-${r.id}`}
                                            rows={3}
                                            value={notes[r.id] ?? ''}
                                            onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                            className={cn(fieldClass, 'resize-y')}
                                            placeholder="Sanatçıya veya iç kayıt için kısa not…"
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => patchReport(r.id, 'resolved')}
                                                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                                            >
                                                Çözüldü
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => patchReport(r.id, 'dismissed')}
                                                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800"
                                            >
                                                Reddet
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>

                {Array.isArray(reports.links) && reports.links.length > 0 && (reports.last_page ?? 0) > 1 && (
                    <div className="flex flex-wrap gap-2">
                        {reports.links.map((link, idx) => {
                            const label = link.label.replace('&laquo; Previous', 'Önceki').replace('Next &raquo;', 'Sonraki');
                            if (!link.url) {
                                return (
                                    <span
                                        key={`${label}-${idx}`}
                                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-600"
                                    >
                                        <span dangerouslySetInnerHTML={{ __html: sanitizeHtmlForInnerHtml(label) }} />
                                    </span>
                                );
                            }

                            return (
                                <Link
                                    key={`${label}-${idx}`}
                                    href={link.url}
                                    preserveState
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                                        link.active
                                            ? 'border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-300'
                                            : 'border-zinc-300 bg-white text-zinc-800 hover:border-amber-400 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-300 dark:hover:border-amber-500/30'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtmlForInnerHtml(label) }}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
