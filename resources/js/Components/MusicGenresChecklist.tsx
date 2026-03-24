import { useId, useMemo, useState } from 'react';

export type MusicGenresChecklistVariant = 'admin' | 'adminCard' | 'artistPanel';

const styles: Record<
    MusicGenresChecklistVariant,
    {
        label: string;
        helper: string;
        search: string;
        listWrap: string;
        row: string;
        checkbox: string;
        empty: string;
    }
> = {
    admin: {
        label: 'block text-sm font-medium text-zinc-400',
        helper: 'mt-0.5 text-xs text-zinc-500',
        search: 'mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30',
        listWrap:
            'mt-2 max-h-64 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 sm:max-h-[min(24rem,70vh)]',
        row: 'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700/60',
        checkbox: 'rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500',
        empty: 'px-2 py-3 text-sm text-zinc-500',
    },
    adminCard: {
        label: 'text-sm font-medium text-zinc-700 dark:text-zinc-300',
        helper: 'mt-0.5 text-xs text-zinc-500',
        search:
            'mt-2 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500',
        listWrap:
            'mt-2 max-h-52 overflow-y-auto rounded border border-zinc-300 p-2 dark:border-zinc-700 sm:max-h-[min(22rem,70vh)]',
        row: 'flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800',
        checkbox:
            'rounded border-zinc-400 text-amber-600 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-amber-500',
        empty: 'px-2 py-3 text-sm text-zinc-500',
    },
    artistPanel: {
        label: 'block text-sm font-medium text-zinc-400',
        helper: 'mt-1 text-xs text-zinc-500',
        search:
            'mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-white placeholder-zinc-600 focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20',
        listWrap:
            'mt-3 max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/40 p-3 sm:max-h-[min(22rem,70vh)]',
        row: 'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-200 hover:bg-white/5',
        checkbox: 'rounded border-white/20 bg-zinc-900 text-amber-500 focus:ring-amber-500/40',
        empty: 'px-2 py-3 text-sm text-zinc-500',
    },
};

function matchesTr(haystack: string, needle: string): boolean {
    const n = needle.trim();
    if (n === '') return true;
    return haystack.toLocaleLowerCase('tr-TR').includes(n.toLocaleLowerCase('tr-TR'));
}

interface Props {
    variant: MusicGenresChecklistVariant;
    /** Boş bırakılırsa başlık üst bileşende verilir; arama kutusu için sr-only etiket kullanılır. */
    label?: string;
    helperText?: string;
    options: readonly string[];
    selected: string[];
    onToggle: (label: string) => void;
    error?: string;
}

export default function MusicGenresChecklist({
    variant,
    label,
    helperText,
    options,
    selected,
    onToggle,
    error,
}: Readonly<Props>) {
    const reactId = useId();
    const searchId = `music-genre-search-${reactId}`;
    const [query, setQuery] = useState('');
    const s = styles[variant];

    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const visible = useMemo(
        () => options.filter((o) => selectedSet.has(o) || matchesTr(o, query)),
        [options, selectedSet, query],
    );

    return (
        <div>
            {label?.trim() ? (
                <label htmlFor={searchId} className={s.label}>
                    {label}
                </label>
            ) : (
                <label htmlFor={searchId} className="sr-only">
                    Müzik türü ara
                </label>
            )}
            {helperText?.trim() ? <p className={s.helper}>{helperText}</p> : null}
            <input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Müzik türü ara…"
                autoComplete="off"
                className={s.search}
            />
            <div className={s.listWrap}>
                {visible.length === 0 ? (
                    <p className={s.empty}>Aramanızla eşleşen müzik türü yok.</p>
                ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {visible.map((opt) => (
                            <label key={opt} className={s.row}>
                                <input
                                    type="checkbox"
                                    checked={selected.includes(opt)}
                                    onChange={() => onToggle(opt)}
                                    className={s.checkbox}
                                />
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
            {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </div>
    );
}
