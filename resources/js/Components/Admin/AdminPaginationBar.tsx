import { sanitizeHtmlForInnerHtml } from '@/Components/SafeRichContent';
import { Link } from '@inertiajs/react';

export type AdminPaginatorPayload = {
    links: Array<{ url: string | null; label: string; active?: boolean }>;
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
    total?: number;
};

/** Laravel `LengthAwarePaginator` Inertia yanıtları için özet metin + sayfa linkleri. */
export function AdminPaginationBar({
    paginator,
    noun,
    className = '',
    showSummary = true,
    showLinks = true,
}: Readonly<{
    paginator: AdminPaginatorPayload;
    /** Örn. "etkinlik" → "Toplam 42 etkinlik" */
    noun: string;
    className?: string;
    showSummary?: boolean;
    showLinks?: boolean;
}>) {
    const { total, from, to, current_page, last_page, links } = paginator;

    return (
        <div className={`space-y-3 ${className}`.trim()}>
            {showSummary && typeof total === 'number' && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Toplam{' '}
                    <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                        {total.toLocaleString('tr-TR')}
                    </span>{' '}
                    {noun}
                    {from != null && to != null && total > 0 && (
                        <>
                            {' '}
                            · bu sayfada{' '}
                            <span className="tabular-nums">
                                {from.toLocaleString('tr-TR')}–{to.toLocaleString('tr-TR')}
                            </span>
                        </>
                    )}
                    {typeof last_page === 'number' && last_page > 1 && (
                        <>
                            {' '}
                            · sayfa {current_page ?? '—'} / {last_page}
                        </>
                    )}
                </p>
            )}

            {showLinks && Array.isArray(links) && links.length > 0 && (last_page ?? 0) > 1 && (
                <div className="flex flex-wrap gap-2">
                    {links.map((link, idx) => {
                        const label = link.label
                            .replace('&laquo; Previous', 'Önceki')
                            .replace('Next &raquo;', 'Sonraki');
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
    );
}
