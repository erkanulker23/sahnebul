type Props = Readonly<{
    value: boolean;
    onChange: (paid: boolean) => void;
    variant: 'admin' | 'artist';
    idPrefix?: string;
}>;

/** Etkinlik formları: giriş ücretli / ücretsiz seçimi */
export default function EventEntryPaidField({ value, onChange, variant, idPrefix = 'entry' }: Props) {
    const isArtist = variant === 'artist';
    const wrap = isArtist
        ? 'rounded-xl border border-white/10 bg-zinc-800/40 p-4'
        : 'rounded-lg border border-zinc-700 bg-zinc-800/80 p-4';
    const legend = isArtist ? 'text-sm font-medium text-zinc-300' : 'text-sm font-medium text-zinc-200';
    const hint = 'mt-1 text-xs text-zinc-500';
    const label = 'ml-2 text-sm text-zinc-200';

    return (
        <fieldset className={wrap}>
            <legend className={legend}>Giriş ücretli mi?</legend>
            <p className={hint}>Ücretsiz etkinlik seçildiğinde bilet fiyatı ve kategorileri kaydedilmez.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-6">
                <label className="inline-flex cursor-pointer items-center">
                    <input
                        id={`${idPrefix}_paid_yes`}
                        type="radio"
                        name={`${idPrefix}_entry_is_paid`}
                        checked={value}
                        onChange={() => onChange(true)}
                        className="h-4 w-4 border-zinc-500 text-amber-500 focus:ring-amber-500/40"
                    />
                    <span className={label}>Evet — ücretli giriş / bilet</span>
                </label>
                <label className="inline-flex cursor-pointer items-center">
                    <input
                        id={`${idPrefix}_paid_no`}
                        type="radio"
                        name={`${idPrefix}_entry_is_paid`}
                        checked={!value}
                        onChange={() => onChange(false)}
                        className="h-4 w-4 border-zinc-500 text-amber-500 focus:ring-amber-500/40"
                    />
                    <span className={label}>Hayır — ücretsiz giriş</span>
                </label>
            </div>
        </fieldset>
    );
}
