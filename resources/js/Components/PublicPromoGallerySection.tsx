import { InstagramPromoPreviewOnly } from '@/Components/InstagramPostEmbed';
import { router } from '@inertiajs/react';
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

/** Sunucuda MP4 yoksa /p/ ve /reel/ için Instagram embed iframe (kendi oynatıcıları); hikâye bağlantılarında embed yok. */
export function instagramPostOrReelEmbedIframeSrc(embedUrl: string): string | null {
    const raw = embedUrl.trim();
    if (raw === '' || !raw.includes('instagram.com')) {
        return null;
    }
    try {
        const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
        if (!u.hostname.toLowerCase().endsWith('instagram.com') && u.hostname.toLowerCase() !== 'instagram.com') {
            return null;
        }
        const share = u.pathname.match(/^\/share\/(p|reel)\/([^/?#]+)\/?$/i);
        if (share) {
            const kind = share[1].toLowerCase();
            return `https://www.instagram.com/${kind}/${encodeURIComponent(share[2])}/embed/captioned/`;
        }
        const m = u.pathname.match(/^\/(p|reel)\/([^/?#]+)\/?$/i);
        if (!m) {
            return null;
        }
        const kind = m[1].toLowerCase();
        const code = encodeURIComponent(m[2]);
        return `https://www.instagram.com/${kind}/${code}/embed/captioned/`;
    } catch {
        return null;
    }
}

export const defaultEventPromoLabels: PublicPromoGalleryLabels = {
    storiesTitle: 'Tanıtım videoları',
    storiesDescription:
        'Öncelik sunucudaki MP4/WebM. Instagram gönderi veya Reels bağlantısında video diske inmediyse gömülü Instagram oynatıcısı gösterilir; hikâyelerde yalnızca kapak veya Instagram’da aç.',
    postsTitle: 'Gönderi görselleri',
    postsDescription:
        'Kare önizleme: sosyal gönderi bağlantısından veya yüklenen görselden oluşan kapaklar. Karta dokunarak büyütün.',
    linksTitle: 'Diğer tanıtım bağlantıları',
};

export const venuePromoLabels: PublicPromoGalleryLabels = {
    storiesTitle: 'Tanıtım videoları',
    storiesDescription:
        'MP4/WebM veya (indirilmediyse) gönderi/Reels için gömülü Instagram oynatıcısı; hikâyelerde kapak veya Instagram’da aç.',
    postsTitle: 'Gönderi görselleri',
    postsDescription:
        'Etkinlik ve mekân duyuruları için kare önizleme; bağlantı veya yüklenen görsel. Dokunarak büyütün.',
    linksTitle: 'Diğer tanıtım bağlantıları',
};

export const artistPromoLabels: PublicPromoGalleryLabels = {
    storiesTitle: 'Tanıtım videoları',
    storiesDescription:
        'MP4/WebM veya gönderi/Reels için gömülü oynatıcı; hikâyelerde kapak veya Instagram’da aç.',
    postsTitle: 'Gönderi görselleri',
    postsDescription:
        'Duyuru ve paylaşımların kare önizlemesi; bağlantı veya yüklenen görsel. Dokunarak büyütün.',
    linksTitle: 'Diğer tanıtım bağlantıları',
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
    if (it.promo_kind === 'story') {
        return 'story';
    }
    if (it.promo_kind === 'post') {
        return 'post';
    }
    if (it.poster_path?.trim() || it.embed_url?.includes('instagram.com')) {
        return 'post';
    }
    return 'story';
}

/** JSON / Inertia bazen `{ "0": {...} }` nesnesi döndürür; `Array.isArray` false olur. */
export function coercePromoGalleryRows(raw: unknown): unknown[] {
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
    const legacyVp = fields.promo_video_path?.trim() ?? '';
    const legacyEu = fields.promo_embed_url?.trim() ?? '';

    if (rows.length > 0) {
        const mapped = rows.map(normalizePromoGalleryItem);
        /** Galeri satırlarında yoksa eski tek alan (promo_video_path) üstte tanıtım videosu olarak eklenir — Inertia yalnızca JSON gönderdiğinde videolar kaybolmasın. */
        if (legacyVp !== '' && !mapped.some((it) => (it.video_path?.trim() ?? '') === legacyVp)) {
            return [
                normalizePromoGalleryItem({
                    video_path: legacyVp,
                    embed_url: legacyEu !== '' ? legacyEu : null,
                    poster_path: null,
                    promo_kind: 'story',
                }),
                ...mapped,
            ];
        }
        return mapped;
    }
    if (legacyVp !== '' || legacyEu !== '') {
        return [
            normalizePromoGalleryItem({
                video_path: legacyVp !== '' ? legacyVp : null,
                embed_url: legacyEu !== '' ? legacyEu : null,
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

function promoVideoSrcLooksLikeWebm(src: string): boolean {
    return /\.webm(\?|#|$)/i.test(src);
}

function iosLikeUserAgent(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

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

    useEffect(() => {
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        const remove = router.on('start', () => {
            document.body.style.overflow = '';
        });
        return remove;
    }, []);

    const postSlides = useMemo(
        () => postItems.map((it) => resolvePromoPostSlide(it, resolveStorageSrc)),
        [postItems, resolveStorageSrc],
    );

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

    /** Gönderi kapakları: sanatçı «Galeri» ile aynı — kare önizleme, görsel oranı bozulmaz (object-cover). Mobilde 4 sütun. */
    const promoPostGrid =
        'mt-4 grid w-full max-w-full list-none grid-cols-4 gap-0.5 sm:grid-cols-3 sm:gap-1 md:grid-cols-4';

    const promoPortraitTile =
        'relative aspect-[9/16] min-h-0 min-w-0 w-full max-w-full overflow-hidden rounded-sm border border-zinc-200 bg-zinc-950 dark:border-white/10';
    const storyCell = `${promoPortraitTile} shadow-sm`;
    const postCell =
        'relative aspect-square min-h-0 min-w-0 w-full max-w-full overflow-hidden rounded-sm border border-zinc-200 bg-zinc-950 shadow-sm dark:border-white/10';

    function renderStoryCell(it: PromoGalleryItem, idx: number) {
        const videoSrc = it.video_path ? resolveStorageSrc(it.video_path) : null;
        const posterSrc = it.poster_path ? resolveStorageSrc(it.poster_path) : null;
        const embed = it.embed_url?.trim() ?? '';
        const webmOnIos = Boolean(videoSrc && promoVideoSrcLooksLikeWebm(videoSrc) && iosLikeUserAgent());
        const igEmbed = embed.includes('instagram.com');
        const isStoryPermalink = igEmbed && embed.includes('/stories/');
        const igIframeSrc = !videoSrc && igEmbed && !isStoryPermalink ? instagramPostOrReelEmbedIframeSrc(embed) : null;
        return (
            <li
                key={`story-${videoSrc ?? ''}-${posterSrc ?? ''}-${embed}-${idx}`}
                className={storyCell}
            >
                {videoSrc ? (
                    <>
                        <video
                            controls
                            playsInline
                            preload="metadata"
                            className="absolute inset-0 box-border h-full w-full max-w-full object-cover"
                            poster={posterSrc ?? undefined}
                        >
                            <source src={videoSrc} type={promoVideoSrcLooksLikeWebm(videoSrc) ? 'video/webm' : 'video/mp4'} />
                            Tarayıcınız bu videoyu oynatamıyor.
                        </video>
                        {webmOnIos ? (
                            <p className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-black/75 px-1.5 py-1 text-center text-[9px] font-medium leading-tight text-amber-100">
                                iPhone/iPad Safari WebM desteklemez. MP4 yükleyin veya Chrome deneyin.
                            </p>
                        ) : null}
                    </>
                ) : igIframeSrc ? (
                    <div className="absolute inset-0 overflow-hidden bg-zinc-950">
                        <iframe
                            src={igIframeSrc}
                            title="Instagram gönderisi veya Reels"
                            className="pointer-events-auto absolute left-1/2 top-1/2 h-[118%] w-[min(104%,42rem)] max-w-none -translate-x-1/2 -translate-y-1/2 border-0"
                            allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                        />
                    </div>
                ) : posterSrc ? (
                    <>
                        <img
                            src={posterSrc}
                            alt=""
                            className="absolute inset-0 box-border h-full w-full max-h-full max-w-full object-cover"
                        />
                        {igEmbed ? (
                            <a
                                href={embed}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-x-0 bottom-0 z-[1] flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent px-2 pb-2.5 pt-10 text-center"
                            >
                                <span className="text-[10px] font-semibold leading-tight text-amber-300 underline">
                                    Videoyu Instagram’da aç
                                </span>
                            </a>
                        ) : null}
                    </>
                ) : isStoryPermalink ? (
                    <a
                        href={embed}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-800 to-zinc-950 p-4 text-center text-xs font-medium text-amber-400 underline"
                    >
                        Hikâyeyi Instagram’da aç
                    </a>
                ) : igEmbed ? (
                    <a
                        href={embed}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#833AB4]/25 via-[#FD1D1D]/15 to-[#F77737]/20 p-3 text-center"
                    >
                        <span className="text-[11px] font-bold uppercase tracking-wide text-white/90">Instagram</span>
                        <span className="text-[11px] font-semibold leading-snug text-amber-300 underline">
                            Videoyu Instagram’da aç
                        </span>
                        <span className="max-w-[12rem] text-[9px] leading-snug text-zinc-400">
                            Gönderi sitede gömülü oynatılamıyor; tam video için Instagram’a gidin (veya MP4 yükleyin).
                        </span>
                    </a>
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
                    <ul className={promoPostGrid}>
                        {postItems.map((it, idx) => {
                            const slide = postSlides[idx];
                            const videoSrc = it.video_path ? resolveStorageSrc(it.video_path) : null;
                            const posterSrc = it.poster_path ? resolveStorageSrc(it.poster_path) : null;
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
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-zinc-800 to-zinc-950 px-2 text-center">
                                                    <span className="text-[10px] font-semibold text-zinc-400">Önizleme yok</span>
                                                    <span className="text-[9px] font-medium leading-tight text-zinc-600">Büyütmek için dokunun</span>
                                                </div>
                                            ) : posterSrc ? (
                                                <img
                                                    src={posterSrc}
                                                    alt=""
                                                    className="absolute inset-0 box-border h-full w-full max-h-full max-w-full object-cover transition group-hover:brightness-95"
                                                />
                                            ) : null}
                                            <span className="pointer-events-none absolute bottom-1 left-1 right-1 rounded bg-black/60 py-0.5 text-center text-[9px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                                                Büyüt
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
                        aria-label="Gönderi önizlemesi — büyük görünüm"
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
                                    <InstagramPromoPreviewOnly posterSrc={lbSlide.poster} className="w-full max-w-md" />
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
                                                    ? 'border-transparent bg-zinc-800 text-zinc-400'
                                                    : ''
                                            } ${
                                                i === lbIndex ? 'border-amber-400' : 'border-transparent opacity-50 hover:opacity-90'
                                            }`}
                                        >
                                            {thumb ? (
                                                <img src={thumb} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                '—'
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
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Instagram dışı veya yalnız bağlantı olarak eklenen tanıtım adresleri.
                    </p>
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
                                    Bağlantıyı yeni sekmede aç
                                </a>
                            );
                        })}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
