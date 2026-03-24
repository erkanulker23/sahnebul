import { BadgeCheck } from 'lucide-react';

type Size = 'sm' | 'md';

export default function VerifiedArtistProfileBadge({ size = 'sm', className = '' }: Readonly<{ size?: Size; className?: string }>) {
    const iconClass = size === 'md' ? 'h-5 w-5 shrink-0' : 'h-3.5 w-3.5 shrink-0';
    const textClass = size === 'md' ? 'text-xs' : 'text-[11px]';

    return (
        <span
            className={`inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300 ${textClass} ${className}`.trim()}
            title="Doğrulanmış hesap: Bu profil sanatçı veya yetkili temsilcisi tarafından yönetiliyor."
            role="status"
            aria-label="Doğrulanmış sanatçı profili"
        >
            <BadgeCheck className={iconClass} strokeWidth={2.5} aria-hidden />
            <span className="leading-none">Doğrulanmış</span>
        </span>
    );
}
