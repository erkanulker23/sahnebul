import { BadgeCheck } from 'lucide-react';

type Size = 'sm' | 'md';
type Variant = 'artist' | 'venue';

const COPY: Record<Variant, { title: string; aria: string; label: string }> = {
    artist: {
        title:
            'Sahnebul doğrulaması: Bu sanatçı profilinin gerçek sanatçı veya yetkili temsilciye ait olduğu platform tarafından doğrulandı. E-posta onayı veya yalnızca yayımda olmakla aynı şey değildir.',
        aria: 'Doğrulanmış sanatçı profili',
        label: 'Doğrulanmış',
    },
    venue: {
        title:
            'Sahnebul doğrulaması: Bu mekân kaydının işletmeyle eşleştiği platform tarafından doğrulandı. Yönetici onayı veya yayında olmakla tek başına aynı şey değildir.',
        aria: 'Doğrulanmış mekân',
        label: 'Doğrulanmış',
    },
};

export default function VerifiedArtistProfileBadge({
    size = 'sm',
    className = '',
    variant = 'artist',
}: Readonly<{ size?: Size; className?: string; variant?: Variant }>) {
    const iconClass = size === 'md' ? 'h-5 w-5 shrink-0' : 'h-3.5 w-3.5 shrink-0';
    const textClass = size === 'md' ? 'text-xs' : 'text-[11px]';
    const copy = COPY[variant];

    return (
        <span
            className={`inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300 ${textClass} ${className}`.trim()}
            title={copy.title}
            role="status"
            aria-label={copy.aria}
        >
            <BadgeCheck className={iconClass} strokeWidth={2.5} aria-hidden />
            <span className="leading-none">{copy.label}</span>
        </span>
    );
}
