import { InstagramPromoPreviewOnly } from '@/Components/InstagramPostEmbed';
import {
    instagramPostOrReelEmbedIframeSrc,
    iosLikeUserAgent,
    promoVideoSrcLooksLikeWebm,
    type PromoGalleryItem,
} from '@/Components/PublicPromoGallerySection';
import { cn } from '@/lib/cn';
import { PROMO_STORY_IFRAME_ADVANCE_MS, PROMO_STORY_IMAGE_ADVANCE_MS } from '@/lib/promoStoryTiming';
import { usePromoVideoSlidePlayback } from '@/lib/usePromoVideoSlidePlayback';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SWIPE_MIN_PX = 56;
const SWIPE_MAX_DURATION_MS = 750;

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
    const touchStartTime = useRef<number | null>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const goNextRef = useRef<() => void>(() => {});
    const sessionOpenRef = useRef(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [slideProgress, setSlideProgress] = useState(0);
    const [muted, setMuted] = useState(true);

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
                onCloseRef.current();
                return cur;
            }
            return cur + 1;
        });
    }, [n]);
    goNextRef.current = goNext;

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
                onCloseRef.current();
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
    }, [open, n, goPrev, goNext]);

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
    const slideKey = it ? slideDomKey(it, safeIdx) : null;
    const posterSrc = it?.poster_path ? resolveStorageSrc(it.poster_path) : null;
    const embed = it?.embed_url?.trim() ?? '';
    const igEmbed = embed.includes('instagram.com');
    const isStoryPermalink = igEmbed && embed.includes('/stories/');
    const igIframeSrc = !videoSrc && igEmbed && !isStoryPermalink ? instagramPostOrReelEmbedIframeSrc(embed) : null;
    const timedAdvanceMs = videoSrc ? null : igIframeSrc ? PROMO_STORY_IFRAME_ADVANCE_MS : PROMO_STORY_IMAGE_ADVANCE_MS;
    const webmOnIos = Boolean(videoSrc && promoVideoSrcLooksLikeWebm(videoSrc) && iosLikeUserAgent());

    const videoSlideKey =
        open && n > 0 && videoSrc ? `${safeIdx}\x1f${videoSrc}` : null;
    usePromoVideoSlidePlayback(videoRef, videoSlideKey, videoSrc);

    useEffect(() => {
        if (!open || !slideKey) {
            return;
        }
        setSlideProgress(0);
    }, [open, slideKey]);

    useEffect(() => {
        if (!open || !slideKey || timedAdvanceMs === null) {
            return;
        }
        const startedAt = Date.now();
        const int = window.setInterval(() => {
            const elapsed = Date.now() - startedAt;
            setSlideProgress(Math.min(1, elapsed / timedAdvanceMs));
        }, 90);
        const t = window.setTimeout(() => {
            setSlideProgress(1);
            goNextRef.current();
        }, timedAdvanceMs);
        return () => {
            window.clearInterval(int);
            window.clearTimeout(t);
        };
    }, [open, slideKey, timedAdvanceMs]);

    useEffect(() => {
        if (!open) {
            return;
        }
        setMuted(true);
    }, [open, slideKey]);

    if (!open || n === 0 || typeof document === 'undefined' || !it) {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[220] flex flex-col bg-black"
            role="dialog"
            aria-modal="true"
            aria-label="Tanıtım videosu — tam ekran"
        >
            <div
                className="flex shrink-0 flex-col gap-2 border-b border-white/10 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5 sm:pb-3 sm:pt-3"
            >
                {n > 1 ? (
                    <div className="flex gap-0.5 sm:gap-1" role="tablist" aria-label="Tanıtım slaytları">
                        {items.map((row, i) => (
                            <button
                                key={`seg-${slideDomKey(row, i)}`}
                                type="button"
                                role="tab"
                                aria-selected={i === safeIdx}
                                onClick={() => setIdx(i)}
                                className={`h-0.5 min-h-[3px] min-w-0 flex-1 rounded-full transition-colors ${
                                    i === safeIdx ? 'bg-amber-400' : 'bg-white/25 hover:bg-white/35'
                                }`}
                                aria-label={`Slayt ${i + 1}`}
                                style={
                                    i < safeIdx
                                        ? { opacity: 1, background: 'rgb(251 191 36)' }
                                        : i > safeIdx
                                          ? { opacity: 0.35 }
                                          : {
                                                background: `linear-gradient(90deg, rgb(251 191 36) ${Math.round(slideProgress * 100)}%, rgba(255,255,255,0.22) ${Math.round(slideProgress * 100)}%)`,
                                            }
                                }
                            />
                        ))}
                    </div>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <p className="text-xs font-medium text-white sm:text-sm">
                            {safeIdx + 1} / {n}
                        </p>
                        {videoSrc ? (
                            <button
                                type="button"
                                onClick={() => setMuted((m) => !m)}
                                className="shrink-0 rounded-full border border-white/25 px-2.5 py-1 text-[11px] font-medium text-white sm:px-3 sm:py-1.5 sm:text-xs"
                            >
                                {muted ? 'Sesi Aç' : 'Sesi Kapat'}
                            </button>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium text-white sm:px-4 sm:py-2 sm:text-sm"
                    >
                        Kapat
                    </button>
                </div>
            </div>

            <div className="relative flex min-h-0 flex-1">
                <div className="absolute inset-0 z-10 flex items-stretch justify-center">
                    <button
                        type="button"
                        className={cn(
                            'touch-manipulation border-0 bg-transparent sm:max-w-[160px]',
                            n > 1 ? 'w-[30%] min-w-[4.5rem] active:bg-white/5' : 'pointer-events-none w-0 min-w-0 opacity-0',
                        )}
                        aria-label="Önceki slayt"
                        onClick={() => {
                            if (n > 1) {
                                goPrev();
                            }
                        }}
                    />
                    <div
                        className="relative z-20 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-1 py-2 sm:px-4 sm:py-4"
                        onTouchStart={(e) => {
                            const tch = e.changedTouches[0];
                            if (tch) {
                                touchStartX.current = tch.clientX;
                                touchStartTime.current = Date.now();
                            }
                        }}
                        onTouchEnd={(e) => {
                            const start = touchStartX.current;
                            const t0 = touchStartTime.current;
                            touchStartX.current = null;
                            touchStartTime.current = null;
                            if (start == null || t0 == null || n <= 1) {
                                return;
                            }
                            const end = e.changedTouches[0]?.clientX;
                            if (end == null) {
                                return;
                            }
                            const duration = Date.now() - t0;
                            if (duration > SWIPE_MAX_DURATION_MS) {
                                return;
                            }
                            const dx = end - start;
                            if (Math.abs(dx) < SWIPE_MIN_PX) {
                                return;
                            }
                            if (dx > 0) {
                                goPrev();
                            } else {
                                goNext();
                            }
                        }}
                        role="presentation"
                    >
                        <div
                            key={slideDomKey(it, safeIdx)}
                            className="relative mx-auto aspect-[9/16] w-full min-h-[11rem] max-h-[min(calc(100dvh-7.5rem),calc(100vh-7.5rem))] max-w-lg overflow-hidden rounded-lg bg-zinc-950 shadow-2xl ring-1 ring-white/10 sm:min-h-[12rem] sm:max-w-xl"
                        >
                        {videoSrc ? (
                            <>
                                <video
                                    ref={videoRef}
                                    key={`${safeIdx}-${videoSrc}`}
                                    controls
                                    playsInline
                                    autoPlay
                                    muted={muted}
                                    preload="auto"
                                    className="absolute inset-0 h-full w-full object-contain"
                                    poster={posterSrc ?? undefined}
                                    onCanPlay={(e) => {
                                        void e.currentTarget.play().catch(() => {
                                            if (!muted) {
                                                setMuted(true);
                                            }
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
                        <p className="mt-2 max-w-md px-2 text-center text-[10px] leading-snug text-white/45 sm:mt-3 sm:text-xs sm:text-zinc-500">
                            {n > 1
                                ? 'Önceki / sonraki: ekranın sol veya sağ üçte birine dokunun. Kapat: üstte.'
                                : 'Kapat: üstte.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        className={cn(
                            'touch-manipulation border-0 bg-transparent sm:max-w-[160px]',
                            n > 1 ? 'w-[30%] min-w-[4.5rem] active:bg-white/5' : 'pointer-events-none w-0 min-w-0 opacity-0',
                        )}
                        aria-label="Sonraki slayt"
                        onClick={() => {
                            if (n > 1) {
                                goNext();
                            }
                        }}
                    />
                </div>
            </div>
        </div>,
        document.body,
    );
}
