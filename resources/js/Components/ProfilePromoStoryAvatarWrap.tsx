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
    className?: string;
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
    className,
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
        globalThis.requestAnimationFrame(() => {
            document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, [contentSig, entityId, entityKind, hasStories, scrollTargetId]);

    const ringClass = !hasStories
        ? 'rounded-full bg-zinc-200 p-[3px] shadow-sm dark:bg-zinc-700'
        : isUnread
          ? 'rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-[3px] shadow-[0_10px_40px_-10px_rgba(238,42,123,0.45)] dark:shadow-[0_12px_42px_-12px_rgba(98,40,215,0.5)]'
          : 'rounded-full bg-zinc-300/95 p-[3px] ring-1 ring-zinc-400/60 dark:bg-zinc-600 dark:ring-zinc-500/50';

    const ringShell = (
        <div className={cn('inline-flex shrink-0', ringClass)} title={hasStories ? 'Tanıtım videolarını göster' : undefined}>
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
                'inline-flex shrink-0 border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 dark:focus-visible:ring-offset-zinc-900',
                className,
            )}
            aria-label="Tanıtım videolarına git"
        >
            {ringShell}
        </button>
    );
}
