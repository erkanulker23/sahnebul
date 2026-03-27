import { InstagramPostBlock, instagramPermalinkForEmbed, useInstagramEmbedScript } from '@/Components/InstagramPostEmbed';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

export type PromoGalleryItem = {
    embed_url?: string | null;
    video_path?: string | null;
    poster_path?: string | null;
    promo_kind?: 'story' | 'post' | null;
};

export type PublicPromoGalleryLabels = {
    storiesTitle: string;
    storiesDescription: string;
    postsTitle: string;
    postsDescription: string;
    linksTitle: string;
};

export const defaultEventPromoLabels: PublicPromoGalleryLabels = {
    storiesTitle: 'Etkinlik hikayeleri',
    storiesDescription: 'Dikey tanıtım videoları ve görselleri',
    postsTitle: 'Etkinlik gönderileri',
    postsDescription: 'Gönderi önizlemeleri. Tam boyut için görsele tıklayın.',
    linksTitle: 'Tanıtım bağlantıları',
};

export const venuePromoLabels: PublicPromoGalleryLabels = {
    storiesTitle: 'Mekân hikayeleri',
    storiesDescription: 'Mekân ve programınızla ilgili dikey tanıtım videoları.',
    postsTitle: 'Mekân gönderileri',
    postsDescription: 'Sahne ve etkinliklerinizle ilgili gönderi önizlemeleri. Tam boyut için görsele tıklayın.',
    linksTitle: 'Tanıtım bağlantıları',
};

export const artistPromoLabels: PublicPromoGalleryLabels = {
    storiesTitle: 'Sanatçı hikayeleri',
    storiesDescription: 'Sahne ve repertuarınızla ilgili dikey tanıtım videoları.',
    postsTitle: 'Sanatçı gönderileri',
    postsDescription: 'Performans ve duyurularınızla ilgili gönderi önizlemeleri. Tam boyut için görsele tıklayın.',
    linksTitle: 'Tanıtım bağlantıları',
};

function normalizePromoGalleryItem(raw: unknown): PromoGalleryItem {
    if (!raw || typeof raw !== 'object') {
        return { embed_url: null, video_path: null, poster_path: null, promo_kind: null };
    }
    const o = raw as Record<string, unknown>;
    const s = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
    const pk = o.promo_kind;
    const promo_kind = pk === 'post' || pk === 'story' ? pk : null;
    return {
        embed_url: s(o.embed_url),
        video_path: s(o.video_path),
        poster_path: s(o.poster_path),
        promo_kind,
    };
}

export function promoKindOf(it: PromoGalleryItem): 'story' | 'post' {
    if (it.video_path?.trim()) {
        return 'story';
    }
    if (it.poster_path?.trim() || it.embed_url?.includes('instagram.com')) {
        return 'post';
    }
    if (it.promo_kind === 'post') {
        return 'post';
    }
    if (it.promo_kind === 'story') {
        return 'story';
    }
    return 'story';
}

function coercePromoGalleryRows(raw: unknown): unknown[] {
    if (Array.isArray(raw)) {
        return raw;
    }
    if (raw && typeof raw === 'object') {
        const o = raw as Record<string, unknown>;
        const keys = Object.keys(o);
        if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
            return keys
                .sort((a, b) => Number(a) - Number(b))
                .map((k) => o[k]);
        }
        return Object.values(o);
    }
    return [];
}

export function promoGalleryItemsFromEntity(fields: {
    promo_gallery?: unknown;
    promo_video_path?: string | null;
    promo_embed_url?: string | null;
}): PromoGalleryItem[] {
    const rows = coercePromoGalleryRows(fields.promo_gallery);
    if (rows.length > 0) {
        return rows.map(normalizePromoGalleryItem);
    }
    if (fields.promo_video_path?.trim() || fields.promo_embed_url?.trim()) {
        return [
            normalizePromoGalleryItem({
                video_path: fields.promo_video_path,
                embed_url: fields.promo_embed_url,
                poster_path: null,
                promo_kind: 'story',
            }),
        ];
    }
    return [];
}

function filterPublicPromoItems(items: PromoGalleryItem[]): PromoGalleryItem[] {
    return items.filter((it) => {
        const hasVideo = Boolean(it.video_path?.trim());
        if (hasVideo) {
            return true;
        }
        const poster = Boolean(it.poster_path?.trim());
        if (poster) {
            return true;
        }
        const embed = it.embed_url?.trim() ?? '';
        if (embed.includes('instagram.com')) {
            return true;
        }
        return embed.length > 0;
    });
}

type PromoPostSlide =
    | { kind: 'video'; src: string; poster: string | null }
    | { kind: 'image'; src: string; poster: string | null }
    | { kind: 'instagram'; permalink: string; poster: string | null };

function resolvePromoPostSlide(it: PromoGalleryItem, resolveStorageSrc: (path: string | null) => string | null): PromoPostSlide | null {
    const videoSrc = it.video_path ? resolveStorageSrc(it.video_path) : null;
    const posterSrc = it.poster_path ? resolveStorageSrc(it.poster_path) : null;
    const embed = it.embed_url?.trim() ?? '';
    const isIg = embed.includes('instagram.com');
    if (videoSrc) {
        return { kind: 'video', src: videoSrc, poster: posterSrc };
    }
    if (isIg) {
        return { kind: 'instagram', permalink: embed, poster: posterSrc };
    }
    if (posterSrc) {
        return { kind: 'image', src: posterSrc, poster: posterSrc };
    }
    return null;
}

export function PublicPromoGallerySection({
    items,
    resolveStorageSrc,
    labels = defaultEventPromoLabels,
}: Readonly<{
    items: PromoGalleryItem[];
    resolveStorageSrc: (path: string | null) => string | null;
    labels?: PublicPromoGalleryLabels;
}>) {
    const visible = useMemo(() => filterPublicPromoItems(items), [items]);

    const storyItems = useMemo(() => visible.filter((it) => promoKindOf(it) === 'story'), [visible]);

    const postItems = useMemo(() => visible.filter((it) => promoKindOf(it) === 'post'), [visible]);

    const [postLightbox, setPostLightbox] = useState<number | null>(null);

    const postSlides = useMemo(
        () => postItems.map((it) => resolvePromoPostSlide(it, resolveStorageSrc)),
        [postItems, resolveStorageSrc],
    );

    const instagramEmbedSignatures = useMemo(() => {
        const urls = new Set<string>();
        for (const it of visible) {
            const raw = it.embed_url?.trim() ?? '';
            if (!raw.includes('instagram.com')) {
                continue;
            }
            const localVideo = it.video_path?.trim()
                ? Boolean(resolveStorageSrc(it.video_path))
                : false;
            if (localVideo) {
                continue;
            }
            urls.add(instagramPermalinkForEmbed(raw));
        }
        return Array.from(urls).sort().join('|');
    }, [visible, resolveStorageSrc]);
    useInstagramEmbedScript(instagramEmbedSignatures);

    const closePostLightbox = useCallback(() => {
        setPostLightbox(null);
    }, []);

    const goPostLightbox = useCallback(
        (delta: number) => {
            const n = postItems.length;
            if (n === 0) return;
            setPostLightbox((i) => {
                if (i === null) return null;
                return (i + delta + n) % n;
            });
        },
        [postItems.length],
    );

    useEffect(() => {
        if (postLightbox === null) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closePostLightbox();
            if (e.key === 'ArrowLeft') goPostLightbox(-1);
            if (e.key === 'ArrowRight') goPostLightbox(1);
        };
        globalThis.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            globalThis.removeEventListener('keydown', onKey);
        };
    }, [postLightbox, closePostLightbox, goPostLightbox]);

    useEffect(() => {
        if (postLightbox === null) return;
        const w = globalThis.window as Window & { instgrm?: { Embeds: { process: () => void } } };
        const id = globalThis.window.setTimeout(() => w.instgrm?.Embeds?.process(), 200);
        return () => globalThis.window.clearTimeout(id);
    }, [postLightbox]);

    const genericEmbedOnly = useMemo(
        () =>
            visible.filter((it) => {
                const hasVideo = Boolean(it.video_path && resolveStorageSrc(it.video_path));
                const poster = Boolean(it.poster_path && resolveStorageSrc(it.poster_path));
                const embed = it.embed_url?.trim() ?? '';
                return !hasVideo && !poster && embed.length > 0 && !embed.includes('instagram.com');
            }),
        [visible, resolveStorageSrc],
    );

    if (items.length === 0) {
        return null;
    }

    if (visible.length === 0 && genericEmbedOnly.length === 0) {
        return null;
    }

    const promoThreeColGrid =
        'mt-4 grid w-full max-w-full list-none grid-cols-[repeat(3,minmax(0,1fr))] gap-0.5 sm:gap-1';

    const promoPortraitTile =
        'relative aspect-[9/16] min-h-0 min-w-0 w-full max-w-full overflow-hidden rounded-sm border border-zinc-200 bg-zinc-950 dark:border-white/10';
    const storyCell = `${promoPortraitTile} shadow-sm`;
    const postCell = promoPortraitTile;

    function renderStoryCell(it: PromoGalleryItem, idx: number) {
        const videoSrc = it.video_path ? resolveStorageSrc(it.video_path) : null;
        const posterSrc = it.poster_path ? resolveStorageSrc(it.poster_path) : null;
        const embed = it.embed_url?.trim() ?? '';
        return (
            <li
                key={`story-${videoSrc ?? ''}-${posterSrc ?? ''}-${embed}-${idx}`}
                className={storyCell}
            >
                {videoSrc ? (
                    <video
                        src={videoSrc}
                        controls
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 box-border h-full w-full max-w-full object-cover"
                        poster={posterSrc ?? undefined}
                    >
                        Tarayıcınız bu videoyu oynatamıyor.
                    </video>
                ) : posterSrc ? (
                    <img
                        src={posterSrc}
                        alt=""
                        className="absolute inset-0 box-border h-full w-full max-h-full max-w-full object-cover"
                    />
                ) : null}
            </li>
        );
    }

    const nPosts = postItems.length;
    const lbIndex = postLightbox ?? 0;
    const lbSlide = postLightbox !== null ? postSlides[lbIndex] : null;

    return (
        <div className="scroll-mt-24 space-y-10">
            {storyItems.length > 0 ? (
                <section className="w-full max-w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 sm:p-6">
                    <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">{labels.storiesTitle}</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {labels.storiesDescription} ({storyItems.length}).
                    </p>
                    <ul className={promoThreeColGrid}>
                        {storyItems.map((it, idx) => renderStoryCell(it, idx))}
                    </ul>
                </section>
            ) : null}

            {postItems.length > 0 ? (
                <section className="w-full max-w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 sm:p-6">
                    <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">{labels.postsTitle}</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {labels.postsDescription} ({postItems.length}).
                    </p>
                    <ul className={promoThreeColGrid}>
                        {postItems.map((it, idx) => {
                            const slide = postSlides[idx];
                            const videoSrc = it.video_path ? resolveStorageSrc(it.video_path) : null;
                            const posterSrc = it.poster_path ? resolveStorageSrc(it.poster_path) : null;
                            const igEmbed = it.embed_url?.trim().includes('instagram.com') ?? false;
                            const canOpen = Boolean(slide);
                            return (
                                <li
                                    key={`post-${videoSrc ?? ''}-${posterSrc ?? ''}-${it.embed_url ?? ''}-${idx}`}
                                    className={postCell}
                                >
                                    {canOpen ? (
                                        <button
                                            type="button"
                                            onClick={() => setPostLightbox(idx)}
                                            className="group relative flex min-h-0 min-w-0 h-full w-full cursor-zoom-in flex-col overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
                                            aria-label={`Galeride aç — ${idx + 1} / ${nPosts}`}
                                        >
                                            {videoSrc ? (
                                                <video
                                                    src={videoSrc}
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                    className="pointer-events-none absolute inset-0 box-border h-full w-full max-h-full max-w-full object-cover transition group-hover:brightness-95"
                                                    poster={posterSrc ?? undefined}
                                                />
                                            ) : slide?.kind === 'instagram' && posterSrc ? (
                                                <img
                                                    src={posterSrc}
                                                    alt=""
                                                    className="absolute inset-0 box-border h-full w-full max-h-full max-w-full object-cover transition group-hover:brightness-95"
                                                />
                                            ) : slide?.kind === 'instagram' ? (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] px-2 text-center">
                                                    <span className="text-[11px] font-bold text-white">Instagram</span>
                                                    <span className="text-[9px] font-medium leading-tight text-white/90">Oynatmak için dokunun</span>
                                                </div>
                                            ) : posterSrc ? (
                                                <img
                                                    src={posterSrc}
                                                    alt=""
                                                    className="absolute inset-0 box-border h-full w-full max-h-full max-w-full object-cover transition group-hover:brightness-95"
                                                />
                                            ) : null}
                                            <span className="pointer-events-none absolute bottom-1 left-1 right-1 rounded bg-black/60 py-0.5 text-center text-[9px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                                                {igEmbed && !videoSrc ? 'Instagram’da oynat' : 'Büyüt'}
                                            </span>
                                        </button>
                                    ) : videoSrc ? (
                                        <video
                                            src={videoSrc}
                                            controls
                                            playsInline
                                            preload="metadata"
                                            className="absolute inset-0 box-border h-full w-full max-h-full max-w-full object-cover"
                                            poster={posterSrc ?? undefined}
                                        >
                                            Tarayıcınız bu videoyu oynatamıyor.
                                        </video>
                                    ) : posterSrc ? (
                                        <img
                                            src={posterSrc}
                                            alt=""
                                            className="absolute inset-0 box-border h-full w-full max-h-full max-w-full object-cover"
                                        />
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ) : null}

            {postLightbox !== null &&
                lbSlide &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[200] flex flex-col bg-black/94 backdrop-blur-md"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Tanıtım galerisi"
                    >
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
                            <p className="text-sm font-medium text-white">
                                {lbIndex + 1} / {nPosts}
                            </p>
                            <button
                                type="button"
                                onClick={closePostLightbox}
                                className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                            >
                                Kapat
                            </button>
                        </div>

                        <div
                            className="relative flex min-h-0 flex-1 cursor-default items-center justify-center px-2 py-3 sm:px-6 lg:px-16"
                            onClick={closePostLightbox}
                            role="presentation"
                        >
                            {nPosts > 1 ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        goPostLightbox(-1);
                                    }}
                                    className="absolute left-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-3 lg:left-6"
                                    aria-label="Önceki"
                                >
                                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            ) : null}

                            <div
                                className="relative z-10 flex max-h-full w-full max-w-[min(100vw-1rem,64rem)] flex-col items-center"
                                onClick={(e) => e.stopPropagation()}
                                role="presentation"
                            >
                                {lbSlide.kind === 'video' ? (
                                    <video
                                        src={lbSlide.src}
                                        controls
                                        playsInline
                                        autoPlay
                                        className="max-h-[min(calc(100dvh-9.5rem),calc(100vh-9.5rem))] w-full max-w-full rounded-lg object-contain shadow-2xl"
                                        poster={lbSlide.poster ?? undefined}
                                    >
                                        Tarayıcınız bu videoyu oynatamıyor.
                                    </video>
                                ) : lbSlide.kind === 'instagram' ? (
                                    <div className="max-h-[min(calc(100dvh-9.5rem),calc(100vh-9.5rem))] w-full max-w-full overflow-y-auto rounded-lg">
                                        <InstagramPostBlock permalink={lbSlide.permalink} className="min-h-[min(480px,70dvh)] w-full justify-start py-2" />
                                    </div>
                                ) : (
                                    <img
                                        src={lbSlide.src}
                                        alt=""
                                        className="max-h-[min(calc(100dvh-9.5rem),calc(100vh-9.5rem))] w-full max-w-full rounded-lg object-contain shadow-2xl"
                                    />
                                )}
                                <p className="mt-3 hidden text-center text-xs text-zinc-500 sm:block">
                                    ← → ile gezin • Esc ile kapat
                                </p>
                            </div>

                            {nPosts > 1 ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        goPostLightbox(1);
                                    }}
                                    className="absolute right-1 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-3 lg:right-6"
                                    aria-label="Sonraki"
                                >
                                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ) : null}
                        </div>

                        {nPosts > 1 ? (
                            <div className="flex shrink-0 justify-center gap-2 overflow-x-auto border-t border-white/10 px-4 py-3 sm:px-6">
                                {postItems.map((it, i) => {
                                    const thumb = it.poster_path
                                        ? resolveStorageSrc(it.poster_path)
                                        : it.video_path
                                          ? resolveStorageSrc(it.video_path)
                                          : null;
                                    const igOnly =
                                        !thumb &&
                                        Boolean(it.embed_url?.trim().includes('instagram.com'));
                                    if (!thumb && !igOnly) {
                                        return null;
                                    }
                                    return (
                                        <button
                                            key={`lb-thumb-${i}`}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPostLightbox(i);
                                            }}
                                            className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 text-[10px] font-bold sm:h-16 sm:w-16 ${
                                                igOnly
                                                    ? 'border-transparent bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white'
                                                    : ''
                                            } ${
                                                i === lbIndex ? 'border-amber-400' : 'border-transparent opacity-50 hover:opacity-90'
                                            }`}
                                        >
                                            {thumb ? (
                                                <img src={thumb} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                'IG'
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>,
                    document.body,
                )}

            {genericEmbedOnly.length > 0 ? (
                <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 sm:p-6">
                    <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">{labels.linksTitle}</h2>
                    <div className="mt-3 space-y-2">
                        {genericEmbedOnly.map((it, idx) => {
                            const embed = it.embed_url?.trim() ?? '';
                            return (
                                <a
                                    key={`${embed}-${idx}`}
                                    href={embed}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-amber-600 underline dark:text-amber-400"
                                >
                                    Tanıtım bağlantısını aç
                                </a>
                            );
                        })}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
