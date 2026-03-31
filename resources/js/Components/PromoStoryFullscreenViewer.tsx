import { InstagramPromoPreviewOnly } from '@/Components/InstagramPostEmbed';
import {
    instagramPostOrReelEmbedIframeSrc,
    iosLikeUserAgent,
    promoVideoSrcLooksLikeWebm,
    type PromoGalleryItem,
} from '@/Components/PublicPromoGallerySection';
import { usePromoVideoSlidePlayback } from '@/lib/usePromoVideoSlidePlayback';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SWIPE_MIN_PX = 48;
const STORY_IMAGE_ADVANCE_MS = 9000;
const STORY_IFRAME_ADVANCE_MS = 18000;

function slideDomKey(it: PromoGalleryItem, i: number): string {
    return `${i}\x1f${it.video_path?.trim() ?? ''}\x1f${it.embed_url?.trim() ?? ''}\x1f${it.poster_path?.trim() ?? ''}`;
}

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
    const [idx, setIdx] = useState(0);
    const n = items.length;
    const touchStartX = useRef<number | null>(null);
    const sessionOpenRef = useRef(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [slideProgress, setSlideProgress] = useState(0);

    useEffect(() => {
        if (!open) {
            sessionOpenRef.current = false;
            return;
        }
        if (!sessionOpenRef.current) {
            const start = initialIndex >= 0 && initialIndex < n ? initialIndex : 0;
            setIdx(start);
            sessionOpenRef.current = true;
            return;
        }
        setIdx((i) => {
            if (n <= 0) {
                return 0;
            }
            return Math.min(i, n - 1);
        });
    }, [open, initialIndex, n]);

    const goNext = useCallback(() => {
        if (n <= 0) {
            return;
        }
        setIdx((i) => {
            const cur = Math.min(Math.max(0, i), n - 1);
            if (cur >= n - 1) {
                onClose();
                return cur;
            }
            return cur + 1;
        });
    }, [n, onClose]);

    const goPrev = useCallback(() => {
        if (n <= 0) {
            return;
        }
        setIdx((i) => Math.max(0, i - 1));
    }, [n]);

    useEffect(() => {
        if (!open || n === 0) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goPrev();
                return;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                goNext();
            }
        };
        globalThis.addEventListener('keydown', onKey, true);
        return () => globalThis.removeEventListener('keydown', onKey, true);
    }, [open, n, goPrev, goNext, onClose]);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    const safeIdx = n > 0 ? Math.min(Math.max(0, idx), n - 1) : 0;
    const it = n > 0 ? items[safeIdx] : null;
    const videoSrc = it?.video_path ? resolveStorageSrc(it.video_path) : null;

    const videoSlideKey =
        open && n > 0 && videoSrc ? `${safeIdx}\x1f${videoSrc}` : null;
    usePromoVideoSlidePlayback(videoRef, videoSlideKey, videoSrc);

    if (!open || n === 0 || typeof document === 'undefined' || !it) {
        return null;
    }

    const posterSrc = it.poster_path ? resolveStorageSrc(it.poster_path) : null;
    const embed = it.embed_url?.trim() ?? '';
    const igEmbed = embed.includes('instagram.com');
    const isStoryPermalink = igEmbed && embed.includes('/stories/');
    const igIframeSrc = !videoSrc && igEmbed && !isStoryPermalink ? instagramPostOrReelEmbedIframeSrc(embed) : null;
    const timedAdvanceMs = videoSrc ? null : igIframeSrc ? STORY_IFRAME_ADVANCE_MS : STORY_IMAGE_ADVANCE_MS;
    const webmOnIos = Boolean(videoSrc && promoVideoSrcLooksLikeWebm(videoSrc) && iosLikeUserAgent());

    useEffect(() => {
        if (!open || !it) {
            return;
        }
        setSlideProgress(0);
    }, [open, safeIdx, it]);

    useEffect(() => {
        if (!open || !it || timedAdvanceMs === null) {
            return;
        }
        const startedAt = Date.now();
        const int = window.setInterval(() => {
            const elapsed = Date.now() - startedAt;
            setSlideProgress(Math.min(1, elapsed / timedAdvanceMs));
        }, 90);
        const t = window.setTimeout(() => {
            setSlideProgress(1);
            goNext();
        }, timedAdvanceMs);
        return () => {
            window.clearInterval(int);
            window.clearTimeout(t);
        };
    }, [open, it, timedAdvanceMs, goNext]);

    return createPortal(
        <div
            className="fixed inset-0 z-[220] flex flex-col bg-black"
            role="dialog"
            aria-modal="true"
            aria-label="Tanıtım videosu — tam ekran"
        >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
                <p className="text-sm font-medium text-white">
                    {safeIdx + 1} / {n}
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
                <div className="flex shrink-0 gap-1 px-3 pt-3" role="tablist" aria-label="Tanıtım slaytları">
                    {items.map((row, i) => (
                        <button
                            key={`seg-${slideDomKey(row, i)}`}
                            type="button"
                            role="tab"
                            aria-selected={i === safeIdx}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIdx(i);
                            }}
                            className={`h-1 min-h-[4px] min-w-0 flex-1 rounded-full transition-colors ${
                                i === safeIdx ? 'bg-white' : 'bg-white/25 hover:bg-white/40'
                            }`}
                            aria-label={`Slayt ${i + 1}`}
                            style={
                                i < safeIdx
                                    ? { opacity: 1 }
                                    : i > safeIdx
                                      ? { opacity: 0.35 }
                                      : { background: `linear-gradient(90deg, #fff ${Math.round(slideProgress * 100)}%, rgba(255,255,255,0.25) ${Math.round(slideProgress * 100)}%)` }
                            }
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
                            goPrev();
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
                    onTouchStart={(e) => {
                        const x = e.changedTouches[0]?.clientX;
                        touchStartX.current = x ?? null;
                    }}
                    onTouchEnd={(e) => {
                        const start = touchStartX.current;
                        touchStartX.current = null;
                        if (start == null || n <= 1) return;
                        const end = e.changedTouches[0]?.clientX;
                        if (end == null) return;
                        const dx = end - start;
                        if (dx > SWIPE_MIN_PX) {
                            goPrev();
                        } else if (dx < -SWIPE_MIN_PX) {
                            goNext();
                        }
                    }}
                    role="presentation"
                >
                    <div
                        key={slideDomKey(it, safeIdx)}
                        className="relative mx-auto aspect-[9/16] w-full min-h-[12rem] max-h-[min(calc(100dvh-9rem),calc(100vh-9rem))] max-w-lg overflow-hidden rounded-lg bg-zinc-950 shadow-2xl ring-1 ring-white/10 sm:max-w-xl"
                    >
                        {videoSrc ? (
                            <>
                                <video
                                    ref={videoRef}
                                    key={`${safeIdx}-${videoSrc}`}
                                    controls
                                    playsInline
                                    autoPlay
                                    muted
                                    preload="auto"
                                    className="absolute inset-0 h-full w-full object-contain"
                                    poster={posterSrc ?? undefined}
                                    onCanPlay={(e) => {
                                        void e.currentTarget.play().catch(() => {
                                            /* autoplay policy */
                                        });
                                    }}
                                    onTimeUpdate={(e) => {
                                        const el = e.currentTarget;
                                        if (el.duration && Number.isFinite(el.duration)) {
                                            setSlideProgress(Math.min(1, el.currentTime / el.duration));
                                        }
                                    }}
                                    onEnded={goNext}
                                    onError={goNext}
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
                                key={`${safeIdx}-${igIframeSrc}`}
                                src={igIframeSrc}
                                title="Instagram"
                                className="h-full min-h-[50vh] w-full min-w-[16rem] border-0"
                                allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
                                allowFullScreen
                                referrerPolicy="strict-origin-when-cross-origin"
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
                            goNext();
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
