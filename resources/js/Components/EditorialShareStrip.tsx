import { Link2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

export type EditorialShareStripVariant = 'article' | 'heroDark';

type Props = {
    shareUrl: string;
    shareTitle: string;
    variant?: EditorialShareStripVariant;
    className?: string;
};

/**
 * Blog detay ile aynı: PAYLAş etiketi, dikey şerit (masaüstü), X / Facebook / bağlantı kopyala.
 * `heroDark`: koyu kahraman bölümü (etkinlik üst görsel) için kontrastlı düğmeler.
 */
export function EditorialShareStrip({
    shareUrl,
    shareTitle,
    variant = 'article',
    className = '',
}: Readonly<Props>) {
    const [copied, setCopied] = useState(false);

    const effectiveUrl = useMemo(() => shareUrl.trim().split('#')[0] ?? '', [shareUrl]);

    const copyLink = useCallback(async () => {
        const u = effectiveUrl || (typeof window !== 'undefined' ? window.location.href.split('#')[0] : '');
        if (!u || !navigator.clipboard?.writeText) {
            return;
        }
        try {
            await navigator.clipboard.writeText(u);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    }, [effectiveUrl]);

    const shareTwitter = useCallback(() => {
        const url = encodeURIComponent(effectiveUrl || (typeof window !== 'undefined' ? window.location.href.split('#')[0] : ''));
        const t = encodeURIComponent(shareTitle);
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${t}`, '_blank', 'noopener,noreferrer');
    }, [effectiveUrl, shareTitle]);

    const shareFacebook = useCallback(() => {
        const url = encodeURIComponent(effectiveUrl || (typeof window !== 'undefined' ? window.location.href.split('#')[0] : ''));
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer');
    }, [effectiveUrl]);

    if (!effectiveUrl.trim()) {
        return null;
    }

    const isHero = variant === 'heroDark';

    const asideClass = isHero
        ? 'relative flex shrink-0 flex-row items-center justify-center gap-3 py-1 lg:w-14 lg:flex-col lg:justify-start lg:border-r lg:border-white/10 lg:py-0 lg:pr-6'
        : 'relative flex shrink-0 flex-row items-center justify-center gap-3 border-y border-zinc-200 py-4 dark:border-zinc-800 lg:w-14 lg:flex-col lg:justify-start lg:border-y-0 lg:border-r lg:py-0 lg:pr-6';

    const labelClass = 'hidden text-[10px] font-bold uppercase tracking-widest text-zinc-400 lg:block';

    const btnClass = isHero
        ? 'flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-zinc-900/70 text-zinc-100 shadow-sm transition hover:border-amber-400/45 hover:bg-white/10 hover:text-amber-200'
        : 'flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-amber-600/50 dark:hover:text-amber-400';

    const copiedClass = isHero
        ? 'absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-emerald-300 lg:bottom-auto lg:left-auto lg:right-0 lg:top-full lg:mt-1 lg:translate-x-0 lg:text-center'
        : 'absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 lg:bottom-auto lg:left-auto lg:right-0 lg:top-full lg:mt-1 lg:translate-x-0 lg:text-center';

    return (
        <aside className={`${asideClass} ${className}`.trim()} aria-label="Paylaş">
            <span className={labelClass}>Paylaş</span>
            <div className="flex flex-row gap-2 lg:flex-col lg:gap-3">
                <button
                    type="button"
                    onClick={shareTwitter}
                    className={btnClass}
                    aria-label="X (Twitter) ile paylaş"
                >
                    <span className="text-xs font-bold" aria-hidden>
                        𝕏
                    </span>
                </button>
                <button
                    type="button"
                    onClick={shareFacebook}
                    className={btnClass}
                    aria-label="Facebook ile paylaş"
                >
                    <span className="text-[11px] font-bold text-[#1877F2]" aria-hidden>
                        f
                    </span>
                </button>
                <button type="button" onClick={copyLink} className={btnClass} aria-label="Bağlantıyı kopyala">
                    <Link2 className="h-4 w-4" strokeWidth={2} />
                </button>
            </div>
            {copied ? <span className={copiedClass}>Kopyalandı</span> : null}
        </aside>
    );
}
