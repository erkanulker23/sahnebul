import type { PromoGalleryItem } from '@/Components/PublicPromoGallerySection';
import { cn } from '@/lib/cn';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

const LS_PREFIX = 'sahnebul_profile_promo_ring_v1';

function signatureFromItems(items: readonly PromoGalleryItem[]): string {
    const keys = new Set<string>();
    for (const it of items) {
        keys.add(
            [it.video_path?.trim() ?? '', it.embed_url?.trim() ?? '', it.poster_path?.trim() ?? '', it.promo_kind ?? ''].join(
                '\x1e',
            ),
        );
    }
    return [...keys].sort().join('\x1f');
}

function storageKey(entityKind: 'artist' | 'venue', entityId: number): string {
    return `${LS_PREFIX}:${entityKind}:${entityId}`;
}

export type ProfilePromoStoryAvatarWrapProps = {
    entityKind: 'artist' | 'venue';
    entityId: number;
    /** Yalnızca «hikâye / video» tanıtımları (public filtre sonrası). */
    storyPromoItems: PromoGalleryItem[];
    /** Tıklanınca kaydırılacak bölüm (örn. `sayfa-tanitim-videolari`). */
    scrollTargetId: string;
    /** Verilirse tıklanınca önce bu çağrılır (tam ekran story); kaydırma yapılmaz. */
    onActivate?: () => void;
    className?: string;
    /**
     * Dış çerçeve köşesi — hikâye halkası bu forma oturmalı (kare profil: rounded-2xl).
     * Yuvarlak avatar için `rounded-full` kullanılabilir.
     */
    frameClassName?: string;
    children: ReactNode;
};

/**
 * Profil avatarı: tanıtım videosu varsa Instagram benzeri halka — izlendiyse soluk, yeni içerikte renkli.
 */
export function ProfilePromoStoryAvatarWrap({
    entityKind,
    entityId,
    storyPromoItems,
    scrollTargetId,
    onActivate,
    className,
    frameClassName = 'rounded-2xl',
    children,
}: Readonly<ProfilePromoStoryAvatarWrapProps>) {
    const contentSig = useMemo(() => signatureFromItems(storyPromoItems), [storyPromoItems]);
    const hasStories = storyPromoItems.length > 0;

    const [seenSig, setSeenSig] = useState<string | null>(null);

    useEffect(() => {
        if (!hasStories || typeof window === 'undefined') {
            setSeenSig(null);
            return;
        }
        try {
            setSeenSig(globalThis.localStorage.getItem(storageKey(entityKind, entityId)));
        } catch {
            setSeenSig(null);
        }
    }, [entityKind, entityId, hasStories, contentSig]);

    const isUnread = hasStories && seenSig !== contentSig;

    const markSeenAndScroll = useCallback(() => {
        if (!hasStories) {
            return;
        }
        try {
            globalThis.localStorage.setItem(storageKey(entityKind, entityId), contentSig);
            setSeenSig(contentSig);
        } catch {
            /* private mode */
        }
        if (onActivate) {
            onActivate();
            return;
        }
        globalThis.requestAnimationFrame(() => {
            document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, [contentSig, entityId, entityKind, hasStories, onActivate, scrollTargetId]);

    /** Instagram benzeri okunmamış hikâye: belirgin çok renkli halka (gradient dışarıda, foto içte). */
    const ringClass = !hasStories
        ? cn(
              frameClassName,
              'bg-white/12 p-[3px] shadow-md ring-1 ring-white/35 backdrop-blur-[1px] dark:bg-white/8 dark:ring-white/25',
          )
        : isUnread
          ? cn(
                frameClassName,
                'relative isolate p-[3.5px] sm:p-1',
                'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]',
                'shadow-[0_10px_36px_-8px_rgba(238,42,123,0.55),0_4px_14px_-6px_rgba(98,40,215,0.45)]',
                'dark:shadow-[0_12px_40px_-8px_rgba(238,42,123,0.5),0_4px_16px_-6px_rgba(98,40,215,0.5)]',
            )
          : cn(
                frameClassName,
                'bg-zinc-500/50 p-[3px] ring-[2.5px] ring-zinc-300/90 dark:bg-zinc-600/70 dark:ring-zinc-500/70',
            );

    const ringShell = (
        <div
            className={cn('inline-flex shrink-0', ringClass)}
            title={hasStories ? 'Tanıtım videolarını göster' : undefined}
        >
            {children}
        </div>
    );

    if (!hasStories) {
        return <div className={cn('inline-flex shrink-0', className)}>{ringShell}</div>;
    }

    return (
        <button
            type="button"
            onClick={markSeenAndScroll}
            className={cn(
                'inline-flex shrink-0 touch-manipulation border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 dark:focus-visible:ring-offset-zinc-900',
                className,
            )}
            aria-label="Tanıtım videolarına git"
        >
            {ringShell}
        </button>
    );
}
