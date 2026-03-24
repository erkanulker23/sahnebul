import { useId, useMemo, useState } from 'react';

function matchesTr(haystack: string, needle: string): boolean {
    const n = needle.trim();
    if (n === '') return true;
    return haystack.toLocaleLowerCase('tr-TR').includes(n.toLocaleLowerCase('tr-TR'));
}

export interface ArtistOption {
    id: number;
    name: string;
}

interface Props {
    id?: string;
    label: string;
    artists: ArtistOption[];
    value: number[];
    onChange: (ids: number[]) => void;
    helperText?: string;
    /** İlk sıra headliner: oklarla sırayı değiştir */
    showOrderControls?: boolean;
}

export default function AdminArtistMultiSelect({
    id: propId,
    label,
    artists,
    value,
    onChange,
    helperText,
    showOrderControls = false,
}: Readonly<Props>) {
    const reactId = useId();
    const labelId = propId ?? `artist-ms-${reactId}`;
    const searchId = `${labelId}-search`;
    const [query, setQuery] = useState('');

    const idToArtist = new Map(artists.map((a) => [a.id, a]));
    const available = useMemo(() => artists.filter((a) => !value.includes(a.id)), [artists, value]);

    const availableFiltered = useMemo(
        () => available.filter((a) => matchesTr(a.name, query)),
        [available, query],
    );

    const remove = (artistId: number) => onChange(value.filter((x) => x !== artistId));

    const add = (artistId: number) => {
        if (value.includes(artistId)) return;
        onChange([...value, artistId]);
    };

    const move = (index: number, dir: -1 | 1) => {
        const n = index + dir;
        if (n < 0 || n >= value.length) return;
        const next = [...value];
        [next[index], next[n]] = [next[n], next[index]];
        onChange(next);
    };

    return (
        <fieldset className="min-w-0 border-0 p-0 sm:col-span-2">
            <legend id={labelId} className="block w-full text-sm font-medium text-zinc-400">
                {label}
            </legend>
            {helperText && <p className="mt-0.5 text-xs text-zinc-500">{helperText}</p>}

            <div className="mt-2 min-h-[2.75rem] rounded-lg border border-zinc-700 bg-zinc-800/80 px-2 py-2">
                {value.length === 0 ? (
                    <p className="px-1 py-1.5 text-sm text-zinc-500">Henüz sanatçı seçilmedi.</p>
                ) : (
                    <ul className="flex flex-wrap gap-2">
                        {value.map((artistId, index) => {
                            const name = idToArtist.get(artistId)?.name ?? `#${artistId}`;
                            return (
                                <li
                                    key={artistId}
                                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 pl-3 pr-1 py-1 text-sm text-zinc-100"
                                >
                                    {showOrderControls && (
                                        <span className="shrink-0 tabular-nums text-xs text-amber-500/90">{index + 1}.</span>
                                    )}
                                    <span className="min-w-0 truncate font-medium">{name}</span>
                                    {showOrderControls && value.length > 1 && (
                                        <span className="flex shrink-0 gap-0.5">
                                            <button
                                                type="button"
                                                disabled={index === 0}
                                                onClick={() => move(index, -1)}
                                                className="rounded p-0.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-30"
                                                aria-label={`${name} yukarı taşı`}
                                            >
                                                ↑
                                            </button>
                                            <button
                                                type="button"
                                                disabled={index === value.length - 1}
                                                onClick={() => move(index, 1)}
                                                className="rounded p-0.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-30"
                                                aria-label={`${name} aşağı taşı`}
                                            >
                                                ↓
                                            </button>
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => remove(artistId)}
                                        className="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-700 hover:text-red-300"
                                        aria-label={`${name} kaldır`}
                                    >
                                        ×
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="mt-3 space-y-2">
                <label htmlFor={searchId} className="block text-xs font-medium text-zinc-500">
                    Sanatçı ekle
                </label>
                <input
                    id={searchId}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="İsim yazın, alttan seçin…"
                    autoComplete="off"
                    disabled={available.length === 0}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="max-h-52 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800/50">
                    {available.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-zinc-500">Eklenecek sanatçı kalmadı.</p>
                    ) : availableFiltered.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-zinc-500">Aramanızla eşleşen sanatçı yok.</p>
                    ) : (
                        <ul className="divide-y divide-zinc-700/80">
                            {availableFiltered.map((a) => (
                                <li key={a.id}>
                                    <button
                                        type="button"
                                        onClick={() => add(a.id)}
                                        className="flex w-full items-center px-3 py-2.5 text-left text-sm text-zinc-100 hover:bg-zinc-700/70"
                                    >
                                        {a.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </fieldset>
    );
}
