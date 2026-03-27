import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { Link, router } from '@inertiajs/react';
import { FormEvent } from 'react';

interface Row {
    id: number;
    status: string;
    message: string;
    proposed_changes?: Record<string, unknown> | null;
    submitter: string;
    created_at: string;
    entity_type: string;
    entity_name: string;
    entity_slug: string;
    entity_id: number | null;
    public_url: string;
}

function ProposedChangesBlock({ data }: Readonly<{ data: Record<string, unknown> }>) {
    const social = data.social_links;
    const manager = data.manager_info;
    const pub = data.public_contact;

    return (
        <dl className="mt-2 space-y-2 text-sm">
            {typeof data.website === 'string' && data.website.trim() !== '' && (
                <>
                    <dt className="font-medium text-zinc-600 dark:text-zinc-400">Web sitesi</dt>
                    <dd className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{data.website}</dd>
                </>
            )}
            {typeof data.bio === 'string' && data.bio.trim() !== '' && (
                <>
                    <dt className="font-medium text-zinc-600 dark:text-zinc-400">Biyografi</dt>
                    <dd className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{data.bio}</dd>
                </>
            )}
            {social !== null && typeof social === 'object' && !Array.isArray(social) && Object.keys(social).length > 0 && (
                <>
                    <dt className="font-medium text-zinc-600 dark:text-zinc-400">Sosyal medya</dt>
                    <dd>
                        <ul className="list-inside list-disc space-y-0.5 text-zinc-800 dark:text-zinc-200">
                            {Object.entries(social as Record<string, unknown>).map(([k, v]) =>
                                typeof v === 'string' && v.trim() !== '' ? (
                                    <li key={k}>
                                        <span className="font-medium">{k}</span>: {v}
                                    </li>
                                ) : null,
                            )}
                        </ul>
                    </dd>
                </>
            )}
            {manager !== null && typeof manager === 'object' && !Array.isArray(manager) && (
                <>
                    <dt className="font-medium text-zinc-600 dark:text-zinc-400">Menajer / temsilci</dt>
                    <dd className="whitespace-pre-wrap font-mono text-xs text-zinc-800 dark:text-zinc-200">
                        {JSON.stringify(manager, null, 2)}
                    </dd>
                </>
            )}
            {pub !== null && typeof pub === 'object' && !Array.isArray(pub) && (
                <>
                    <dt className="font-medium text-zinc-600 dark:text-zinc-400">Herkese açık iletişim</dt>
                    <dd className="whitespace-pre-wrap font-mono text-xs text-zinc-800 dark:text-zinc-200">
                        {JSON.stringify(pub, null, 2)}
                    </dd>
                </>
            )}
        </dl>
    );
}

interface Props {
    suggestions: { data: Row[]; links: unknown[]; meta?: { last_page: number; current_page: number } };
    filters: { status: string };
}

const fieldClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white sm:w-auto';

export default function AdminPublicEditSuggestionsIndex({ suggestions, filters }: Readonly<Props>) {
    const submitFilters = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const status = (fd.get('status') as string) || 'pending';
        router.get(route('admin.edit-suggestions.index'), { status }, { preserveState: true });
    };

    const markReviewed = (id: number) => {
        router.post(route('admin.edit-suggestions.mark-reviewed', id), {}, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <SeoHead title="Düzenleme önerileri - Admin | Sahnebul" description="Kullanıcı düzenleme önerileri." noindex />

            <div className="space-y-6">
                <AdminPageHeader
                    title="Düzenleme önerileri"
                    description="Ziyaretçilerin sanatçı ve mekân sayfalarından ilettiği bilgi düzeltme talepleri."
                />

                <form
                    onSubmit={submitFilters}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:flex-wrap sm:items-end"
                >
                    <div className="w-full sm:w-56">
                        <label htmlFor="sugg-status" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Durum
                        </label>
                        <select id="sugg-status" name="status" defaultValue={filters.status} className={fieldClass}>
                            <option value="pending">Bekleyen</option>
                            <option value="reviewed">İncelendi</option>
                            <option value="all">Tümü</option>
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
                    {suggestions.data.length === 0 ? (
                        <p className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                            Kayıt yok.
                        </p>
                    ) : (
                        suggestions.data.map((row) => (
                            <div
                                key={row.id}
                                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-zinc-900 dark:text-white">
                                            <span className="text-amber-600 dark:text-amber-400">
                                                {row.entity_type === 'artist' ? 'Sanatçı' : 'Mekân'}
                                            </span>
                                            : {row.entity_name}
                                        </p>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{row.submitter}</p>
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                                            {formatTurkishDateTime(row.created_at)}
                                            {row.status === 'reviewed' && (
                                                <span className="ml-2 rounded bg-zinc-200 px-2 py-0.5 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                                                    İncelendi
                                                </span>
                                            )}
                                        </p>
                                        {row.proposed_changes !== null &&
                                        row.proposed_changes !== undefined &&
                                        Object.keys(row.proposed_changes).length > 0 && (
                                            <div className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/90 p-3 dark:border-amber-900/50 dark:bg-amber-950/25">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                                                    Önerilen profil alanları
                                                </p>
                                                <ProposedChangesBlock data={row.proposed_changes} />
                                            </div>
                                        )}
                                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                                            {row.message?.trim() ? row.message : '— (serbest metin yok)'}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <a
                                                href={row.public_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
                                            >
                                                Sitede aç ↗
                                            </a>
                                            {row.entity_id ? (
                                                <Link
                                                    href={
                                                        row.entity_type === 'artist'
                                                            ? route('admin.artists.edit', { artist: row.entity_id })
                                                            : route('admin.venues.edit', { venue: row.entity_id })
                                                    }
                                                    className="text-sm font-medium text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400"
                                                >
                                                    Admin’de düzenle
                                                </Link>
                                            ) : null}
                                        </div>
                                    </div>
                                    {row.status === 'pending' && (
                                        <button
                                            type="button"
                                            onClick={() => markReviewed(row.id)}
                                            className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                        >
                                            İncelendi işaretle
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
