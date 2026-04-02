import { useCallback } from 'react';

export type TierRow = {
    name: string;
    description: string;
    price: string;
};

type Props = Readonly<{
    value: TierRow[];
    onChange: (rows: TierRow[]) => void;
    className?: string;
}>;

export function emptyTierRow(): TierRow {
    return { name: '', description: '', price: '' };
}

export function tiersToPayload(rows: TierRow[]): Array<{ name: string; description: string | null; price: number; sort_order: number }> {
    return rows
        .map((r, i) => ({
            name: r.name.trim(),
            description: r.description.trim() || null,
            price: parseFloat(String(r.price).replace(',', '.')) || 0,
            sort_order: i,
        }))
        .filter((r) => r.name !== '');
}

export default function TicketTiersEditor({ value, onChange, className = '' }: Props) {
    const add = useCallback(() => {
        onChange([...value, emptyTierRow()]);
    }, [value, onChange]);

    const remove = useCallback(
        (index: number) => {
            onChange(value.filter((_, j) => j !== index));
        },
        [value, onChange]
    );

    const update = useCallback(
        (index: number, field: keyof TierRow, v: string) => {
            const next = value.map((row, j) => (j === index ? { ...row, [field]: v } : row));
            onChange(next);
        },
        [value, onChange]
    );

    return (
        <div className={className}>
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Bilet kategorileri</p>
                <button
                    type="button"
                    onClick={add}
                    className="rounded-lg border border-amber-500/40 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-500/10 dark:bg-zinc-800 dark:text-amber-400 dark:hover:bg-zinc-700"
                >
                    + Kategori ekle
                </button>
            </div>
            <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-500">
                Örn: Ayakta, Bistro A, Loca — her satır için ad, isteğe bağlı açıklama (ör. 3 kişilik) ve fiyat.
            </p>
            <div className="space-y-3">
                {value.length === 0 && (
                    <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:text-zinc-500">
                        Henüz kategori yok. Tek genel fiyat için yalnızca aşağıdaki &quot;Bilet fiyatı&quot; alanını kullanabilirsiniz.
                    </p>
                )}
                {value.map((row, i) => (
                    <div
                        key={i}
                        className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-12 dark:border-white/10 dark:bg-zinc-800/50"
                    >
                        <input
                            type="text"
                            value={row.name}
                            onChange={(e) => update(i, 'name', e.target.value)}
                            placeholder="Kategori adı (Ayakta, Loca…)"
                            className="sm:col-span-4 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-white/10 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-600"
                        />
                        <input
                            type="text"
                            value={row.description}
                            onChange={(e) => update(i, 'description', e.target.value)}
                            placeholder="Açıklama (opsiyonel)"
                            className="sm:col-span-4 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-white/10 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-600"
                        />
                        <div className="flex gap-2 sm:col-span-4">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={row.price}
                                onChange={(e) => update(i, 'price', e.target.value)}
                                placeholder="₺ Fiyat"
                                className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-white/10 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-600"
                            />
                            <button
                                type="button"
                                onClick={() => remove(i)}
                                className="shrink-0 rounded-lg border border-red-500/40 bg-white px-2 text-red-600 hover:bg-red-50 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10"
                                title="Kaldır"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Açık arka planlı (admin) varyant */
export function TicketTiersEditorLight({ value, onChange, className = '' }: Props) {
    const add = useCallback(() => {
        onChange([...value, emptyTierRow()]);
    }, [value, onChange]);

    const remove = useCallback(
        (index: number) => {
            onChange(value.filter((_, j) => j !== index));
        },
        [value, onChange]
    );

    const update = useCallback(
        (index: number, field: keyof TierRow, v: string) => {
            const next = value.map((row, j) => (j === index ? { ...row, [field]: v } : row));
            onChange(next);
        },
        [value, onChange]
    );

    return (
        <div className={className}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Bilet kategorileri (yer / bölüm)</p>
                <button
                    type="button"
                    onClick={add}
                    className="rounded-lg border border-amber-500/50 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-500/10 dark:bg-zinc-800 dark:text-amber-400 dark:hover:bg-zinc-700"
                >
                    + Kategori ekle
                </button>
            </div>
            <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-500">
                Her kategori için ayrı fiyat. Boş bırakırsanız yalnızca genel &quot;Fiyat&quot; alanı kullanılır.
            </p>
            <div className="space-y-3">
                {value.length === 0 && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-500">Kategori eklemek için butona tıklayın.</p>
                )}
                {value.map((row, i) => (
                    <div
                        key={i}
                        className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-12 dark:border-zinc-700 dark:bg-zinc-800/80"
                    >
                        <input
                            type="text"
                            value={row.name}
                            onChange={(e) => update(i, 'name', e.target.value)}
                            placeholder="Kategori"
                            className="sm:col-span-4 rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600"
                        />
                        <input
                            type="text"
                            value={row.description}
                            onChange={(e) => update(i, 'description', e.target.value)}
                            placeholder="Not (ör. 3 kişilik)"
                            className="sm:col-span-4 rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600"
                        />
                        <div className="flex gap-2 sm:col-span-4">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={row.price}
                                onChange={(e) => update(i, 'price', e.target.value)}
                                placeholder="₺"
                                className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600"
                            />
                            <button
                                type="button"
                                onClick={() => remove(i)}
                                className="shrink-0 rounded border border-red-500/40 bg-white px-2 text-red-600 hover:bg-red-50 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
