import { InstagramPromoPreviewOnly } from '@/Components/InstagramPostEmbed';
import {
    instagramPostOrReelEmbedIframeSrc,
    iosLikeUserAgent,
    promoVideoSrcLooksLikeWebm,
    type PromoGalleryItem,
} from '@/Components/PublicPromoGallerySection';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type PromoStoryFullscreenViewerProps = {
    open: boolean;
    onClose: () => void;
    items: PromoGalleryItem[];
    resolveStorageSrc: (path: string | null) => string | null;
    initialIndex?: number;
};

export function PromoStoryFullscreenViewer({
    open,
    onClose,
    items,
    resolveStorageSrc,
    initialIndex = 0,
}: Readonly<PromoStoryFullscreenViewerProps>) {
    const [idx, setIdx] = useState(initialIndex);
    const n = items.length;

    useEffect(() => {
        if (open) {
            setIdx(initialIndex >= 0 && initialIndex < n ? initialIndex : 0);
        }
    }, [open, initialIndex, n]);

    const go = useCallback(
        (d: number) => {
            if (n <= 0) return;
            setIdx((i) => (i + d + n) % n);
        },
        [n],
    );

    useEffect(() => {
        if (!open || n === 0) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') go(-1);
            if (e.key === 'ArrowRight') go(1);
        };
        globalThis.addEventListener('keydown', onKey);
        return () => globalThis.removeEventListener('keydown', onKey);
    }, [open, n, go, onClose]);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!open || n === 0 || typeof document === 'undefined') {
        return null;
    }

    const it = items[idx];
    const videoSrc = it.video_path ? resolveStorageSrc(it.video_path) : null;
    const posterSrc = it.poster_path ? resolveStorageSrc(it.poster_path) : null;
    const embed = it.embed_url?.trim() ?? '';
    const igEmbed = embed.includes('instagram.com');
    const isStoryPermalink = igEmbed && embed.includes('/stories/');
    const igIframeSrc = !videoSrc && igEmbed && !isStoryPermalink ? instagramPostOrReelEmbedIframeSrc(embed) : null;
    const webmOnIos = Boolean(videoSrc && promoVideoSrcLooksLikeWebm(videoSrc) && iosLikeUserAgent());

    return createPortal(
        <div
            className="fixed inset-0 z-[220] flex flex-col bg-black"
            role="dialog"
            aria-modal="true"
            aria-label="Tanıtım videosu — tam ekran"
        >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
                <p className="text-sm font-medium text-white">
                    {idx + 1} / {n}
                </p>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                    Kapat
                </button>
            </div>

            {n > 1 ? (
                <div className="flex shrink-0 gap-1 px-3 pt-3" aria-hidden>
                    {items.map((_, i) => (
                        <div
                            key={`seg-${i}`}
                            className={`h-0.5 min-w-0 flex-1 rounded-full ${i === idx ? 'bg-white' : 'bg-white/25'}`}
                        />
                    ))}
                </div>
            ) : null}

            <div
                className="relative flex min-h-0 flex-1 items-center justify-center px-2 py-4 sm:px-6"
                onClick={onClose}
                role="presentation"
            >
                {n > 1 ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            go(-1);
                        }}
                        className="absolute left-1 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-4"
                        aria-label="Önceki"
                    >
                        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                ) : null}

                <div
                    className="relative z-10 flex h-full max-h-[min(calc(100dvh-8rem),calc(100vh-8rem))] w-full max-w-lg flex-col items-center justify-center sm:max-w-xl"
                    onClick={(e) => e.stopPropagation()}
                    role="presentation"
                >
                    <div className="relative aspect-[9/16] h-full max-h-full w-auto overflow-hidden rounded-lg bg-zinc-950 shadow-2xl ring-1 ring-white/10">
                        {videoSrc ? (
                            <>
                                <video
                                    controls
                                    playsInline
                                    autoPlay
                                    preload="metadata"
                                    className="h-full w-full object-contain"
                                    poster={posterSrc ?? undefined}
                                >
                                    <source src={videoSrc} type={promoVideoSrcLooksLikeWebm(videoSrc) ? 'video/webm' : 'video/mp4'} />
                                    Tarayıcınız bu videoyu oynatamıyor.
                                </video>
                                {webmOnIos ? (
                                    <p className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-black/80 px-2 py-1.5 text-center text-[10px] font-medium text-amber-100">
                                        Bu cihazda WebM oynatılamayabilir; MP4 deneyin.
                                    </p>
                                ) : null}
                            </>
                        ) : igIframeSrc ? (
                            <iframe
                                src={igIframeSrc}
                                title="Instagram"
                                className="h-full min-h-[50vh] w-full min-w-[16rem] border-0"
                                allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
                                allowFullScreen
                            />
                        ) : posterSrc ? (
                            <div className="relative h-full w-full">
                                <img src={posterSrc} alt="" className="h-full w-full object-cover" />
                                {igEmbed ? (
                                    <a
                                        href={embed}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-6 pt-16 text-center"
                                    >
                                        <span className="text-sm font-semibold text-amber-300 underline">Videoyu Instagram’da aç</span>
                                    </a>
                                ) : null}
                            </div>
                        ) : isStoryPermalink ? (
                            <a
                                href={embed}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-full min-h-[40vh] w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-800 to-zinc-950 p-6 text-center text-sm font-medium text-amber-400 underline"
                            >
                                Hikâyeyi Instagram’da aç
                            </a>
                        ) : igEmbed ? (
                            <div lang="tr" className="flex h-full min-h-[40vh] w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#833AB4]/30 p-6 text-center">
                                <InstagramPromoPreviewOnly posterSrc={posterSrc} className="w-full max-w-xs" />
                                <a
                                    href={embed}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-semibold text-amber-300 underline"
                                >
                                    Instagram’da aç
                                </a>
                            </div>
                        ) : null}
                    </div>
                    <p className="mt-4 hidden text-center text-xs text-zinc-500 sm:block">← → veya yana dokun • Esc</p>
                </div>

                {n > 1 ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            go(1);
                        }}
                        className="absolute right-1 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4"
                        aria-label="Sonraki"
                    >
                        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                ) : null}
            </div>
        </div>,
        document.body,
    );
}
