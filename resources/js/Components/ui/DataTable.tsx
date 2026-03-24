import { cn } from '@/lib/cn';
import { type ReactNode, useEffect, useRef } from 'react';

export type DataTableColumn<T> = {
    key: string;
    header: string;
    mobileLabel?: string;
    cell: (row: T) => ReactNode;
    className?: string;
};

export type DataTableSelectionProps<T> = {
    getRowId: (row: T) => number;
    isRowSelected: (row: T) => boolean;
    onToggleRow: (row: T, checked: boolean) => void;
    onTogglePage: (checked: boolean) => void;
};

type DataTableProps<T> = {
    columns: DataTableColumn<T>[];
    rows: T[];
    getRowKey: (row: T) => string | number;
    actions?: (row: T) => ReactNode;
    selection?: DataTableSelectionProps<T>;
    emptyMessage?: string;
    className?: string;
};

/**
 * md+: tablo + yatay kaydırma · mobil: kart listesi
 */
export function DataTable<T>({
    columns,
    rows,
    getRowKey,
    actions,
    selection,
    emptyMessage = 'Kayıt bulunamadı.',
    className,
}: Readonly<DataTableProps<T>>) {
    const selectedOnPageCount = selection ? rows.filter((r) => selection.isRowSelected(r)).length : 0;
    const pageRowCount = selection ? rows.length : 0;
    const allOnPage = selection && pageRowCount > 0 && selectedOnPageCount === pageRowCount;
    const someOnPage = selection && selectedOnPageCount > 0 && selectedOnPageCount < pageRowCount;
    const selectAllRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = Boolean(someOnPage);
        }
    }, [someOnPage]);

    if (rows.length === 0) {
        return (
            <div
                className={cn(
                    'rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400',
                    className,
                )}
            >
                {emptyMessage}
            </div>
        );
    }

    return (
        <>
            <div className={cn('hidden md:block', className)}>
                <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-800">
                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                        <thead className="bg-zinc-100/90 dark:bg-zinc-900/90">
                            <tr>
                                {selection && (
                                    <th
                                        scope="col"
                                        className="w-12 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400"
                                    >
                                        <input
                                            ref={selectAllRef}
                                            type="checkbox"
                                            checked={Boolean(allOnPage)}
                                            onChange={(e) => selection.onTogglePage(e.target.checked)}
                                            className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
                                            aria-label="Bu sayfadakilerin tümünü seç"
                                        />
                                    </th>
                                )}
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        scope="col"
                                        className={cn(
                                            'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400',
                                            col.className,
                                        )}
                                    >
                                        {col.header}
                                    </th>
                                ))}
                                {actions && (
                                    <th
                                        scope="col"
                                        className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400"
                                    >
                                        İşlemler
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900/30">
                            {rows.map((row) => (
                                <tr key={getRowKey(row)} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                                    {selection && (
                                        <td className="px-3 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selection.isRowSelected(row)}
                                                onChange={(e) => selection.onToggleRow(row, e.target.checked)}
                                                className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
                                                aria-label="Satırı seç"
                                            />
                                        </td>
                                    )}
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={cn(
                                                'whitespace-nowrap px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100',
                                                col.className,
                                            )}
                                        >
                                            {col.cell(row)}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="px-4 py-3 text-right text-sm">
                                            <div className="flex flex-wrap items-center justify-end gap-2">{actions(row)}</div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ul className={cn('space-y-3 md:hidden', className)} role="list">
                {rows.map((row) => (
                    <li
                        key={getRowKey(row)}
                        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
                    >
                        {selection && (
                            <div className="mb-3 flex items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                                <input
                                    type="checkbox"
                                    checked={selection.isRowSelected(row)}
                                    onChange={(e) => selection.onToggleRow(row, e.target.checked)}
                                    className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
                                    aria-label="Kartı seç"
                                />
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Seç</span>
                            </div>
                        )}
                        <dl className="space-y-2.5">
                            {columns.map((col) => (
                                <div key={col.key} className="flex gap-3 text-sm">
                                    <dt className="w-[38%] shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                                        {col.mobileLabel ?? col.header}
                                    </dt>
                                    <dd className="min-w-0 flex-1 text-zinc-900 dark:text-zinc-100">{col.cell(row)}</dd>
                                </div>
                            ))}
                        </dl>
                        {actions && (
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">{actions(row)}</div>
                        )}
                    </li>
                ))}
            </ul>
        </>
    );
}
