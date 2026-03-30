import { cn } from '@/lib/cn';
import { usePromoVideoSlidePlayback } from '@/lib/usePromoVideoSlidePlayback';
import {
    instagramPostOrReelEmbedIframeSrc,
    iosLikeUserAgent,
    promoVideoSrcLooksLikeWebm,
} from '@/Components/PublicPromoGallerySection';
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';

export type CityPromoStorySegment = {
    event_id: number;
    event_title: string;
    event_slug_segment: string;
    embed_url: string | null;
    video_path: string | null;
    poster_path: string | null;
};

export type CityPromoStoryRing = {
    artist: { id: number; name: string; slug: string; avatar: string | null };
    segments: CityPromoStorySegment[];
};

const IFRAME_ADVANCE_MS = 18_000;
const IMAGE_ADVANCE_MS = 9_000;

function storageUrl(path: string | null | undefined): string | null {
    if (!path || path.trim() === '') return null;
    const p = path.trim();
    return p.startsWith('http://') || p.startsWith('https://') ? p : `/storage/${p}`;
}

type ViewerProps = {
    rings: CityPromoStoryRing[];
    openRing: number;
    openSegment: number;
    onClose: () => void;
    onIndexChange: (ring: number, segment: number) => void;
};

function StoryViewer({ rings, openRing, openSegment, onClose, onIndexChange }: Readonly<ViewerProps>) {
    const ring = rings[openRing];
    const segment = ring?.segments[openSegment];
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoProgress, setVideoProgress] = useState(0);

    const advance = useCallback(() => {
        if (!ring) {
            onClose();
            return;
        }
        if (openSegment < ring.segments.length - 1) {
            onIndexChange(openRing, openSegment + 1);
            return;
        }
        if (openRing < rings.length - 1) {
            onIndexChange(openRing + 1, 0);
            return;
        }
        onClose();
    }, [ring, openRing, openSegment, rings.length, onClose, onIndexChange]);

    const goBack = useCallback(() => {
        if (!ring) {
            onClose();
            return;
        }
        if (openSegment > 0) {
            onIndexChange(openRing, openSegment - 1);
            return;
        }
        if (openRing > 0) {
            const prev = rings[openRing - 1];
            onIndexChange(openRing - 1, Math.max(0, prev.segments.length - 1));
            return;
        }
    }, [ring, openRing, openSegment, rings, onClose, onIndexChange]);

    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
            if (e.key === 'ArrowRight') {
                advance();
            }
            if (e.key === 'ArrowLeft') {
                goBack();
            }
        };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [advance, goBack, onClose]);

    useEffect(() => {
        setVideoProgress(0);
    }, [openRing, openSegment]);

    const videoSrc = segment ? storageUrl(segment.video_path) : null;
    const posterSrc = segment ? storageUrl(segment.poster_path) : null;
    const embed = segment?.embed_url?.trim() ?? '';
    const igIframeSrc =
        segment && !videoSrc && embed.includes('instagram.com') && !embed.includes('/stories/')
            ? instagramPostOrReelEmbedIframeSrc(embed)
            : null;

    const videoSlideKey =
        segment && videoSrc ? `${segment.event_id}-${openRing}-${openSegment}-${videoSrc}` : null;
    usePromoVideoSlidePlayback(videoRef, videoSlideKey, videoSrc);

    useEffect(() => {
        if (!segment) {
            return;
        }
        if (videoSrc) {
            return;
        }
        if (igIframeSrc) {
            const t = window.setTimeout(advance, IFRAME_ADVANCE_MS);
            return () => window.clearTimeout(t);
        }
        if (posterSrc || embed.includes('instagram.com')) {
            const t = window.setTimeout(advance, IMAGE_ADVANCE_MS);
            return () => window.clearTimeout(t);
        }
        const t = window.setTimeout(advance, IMAGE_ADVANCE_MS);
        return () => window.clearTimeout(t);
    }, [segment, videoSrc, igIframeSrc, posterSrc, embed, advance]);

    const webmOnIos = Boolean(videoSrc && promoVideoSrcLooksLikeWebm(videoSrc) && iosLikeUserAgent());
    const isStoryPermalink = embed.includes('instagram.com') && embed.includes('/stories/');
    const timedBarMs =
        segment && !videoSrc ? (igIframeSrc ? IFRAME_ADVANCE_MS : IMAGE_ADVANCE_MS) : null;

    if (!ring || !segment) {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[240] flex flex-col bg-black"
            role="dialog"
            aria-modal="true"
            aria-label="Etkinlik tanıtımı"
        >
            <div
                className="flex shrink-0 flex-col gap-2 px-3 pb-2 pt-3"
                style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
            >
                <div className="flex items-center gap-2">
                    {ring.segments.map((_, i) => (
                        <div
                            key={`prog-${ring.artist.id}-${i}`}
                            className="h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/25"
                        >
                            <div
                                className={cn(
                                    'h-full rounded-full bg-white',
                                    i === openSegment && videoSrc && 'transition-[width] duration-150',
                                )}
                                style={
                                    i < openSegment
                                        ? { width: '100%' }
                                        : i > openSegment
                                          ? { width: '0%' }
                                          : i === openSegment && videoSrc
                                            ? { width: `${Math.min(100, videoProgress * 100)}%` }
                                            : timedBarMs
                                              ? { width: '0%', animation: `city-promo-w ${timedBarMs}ms linear forwards` }
                                              : { width: '0%' }
                                }
                            />
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <Link
                            href={route('artists.show', ring.artist.slug)}
                            className="truncate font-display text-sm font-semibold text-white hover:text-amber-300"
                        >
                            {ring.artist.name}
                        </Link>
                        <Link
                            href={route('events.show', segment.event_slug_segment)}
                            className="mt-0.5 block truncate text-xs text-zinc-400 hover:text-amber-200"
                        >
                            {segment.event_title}
                        </Link>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                        aria-label="Kapat"
                    >
                        <X className="h-5 w-5" aria-hidden />
                    </button>
                </div>
            </div>

            <div className="relative min-h-0 flex-1">
                <button
                    type="button"
                    className="absolute inset-y-0 left-0 z-10 w-1/4 cursor-w-resize border-0 bg-transparent"
                    aria-label="Önceki"
                    onClick={goBack}
                />
                <button
                    type="button"
                    className="absolute inset-y-0 right-0 z-10 w-1/4 cursor-e-resize border-0 bg-transparent"
                    aria-label="Sonraki"
                    onClick={advance}
                />

                <div className="flex h-full items-center justify-center px-0 sm:px-6">
                    {videoSrc ? (
                        <video
                            ref={videoRef}
                            key={`${segment.event_id}-${openSegment}-${videoSrc}`}
                            controls
                            playsInline
                            className="max-h-full max-w-full object-contain"
                            poster={posterSrc ?? undefined}
                            onTimeUpdate={(e) => {
                                const el = e.currentTarget;
                                if (el.duration && Number.isFinite(el.duration)) {
                                    setVideoProgress(el.currentTime / el.duration);
                                }
                            }}
                            onEnded={advance}
                        >
                            <source src={videoSrc} type={promoVideoSrcLooksLikeWebm(videoSrc) ? 'video/webm' : 'video/mp4'} />
                        </video>
                    ) : igIframeSrc ? (
                        <div className="aspect-[9/16] h-full max-h-[85dvh] w-full max-w-[min(100%,28rem)] overflow-hidden rounded-lg bg-zinc-950">
                            <iframe
                                key={`${segment.event_id}-${openSegment}-${igIframeSrc}`}
                                src={igIframeSrc}
                                title="Instagram"
                                className="h-full w-full border-0"
                                allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
                                allowFullScreen
                                referrerPolicy="strict-origin-when-cross-origin"
                            />
                        </div>
                    ) : posterSrc ? (
                        <div className="relative flex max-h-[85dvh] flex-col items-center">
                            <img src={posterSrc} alt="" className="max-h-[80dvh] max-w-full object-contain" />
                            {embed.includes('instagram.com') ? (
                                <a
                                    href={embed}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 text-sm font-medium text-amber-400 underline"
                                >
                                    Instagram’da aç
                                </a>
                            ) : null}
                        </div>
                    ) : isStoryPermalink ? (
                        <a
                            href={embed}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl bg-zinc-900 px-6 py-4 text-center text-amber-400 underline"
                        >
                            Hikâyeyi Instagram’da aç
                        </a>
                    ) : embed ? (
                        <a
                            href={embed}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl bg-zinc-900 px-6 py-4 text-center text-amber-400 underline"
                        >
                            Bağlantıyı aç
                        </a>
                    ) : (
                        <p className="text-sm text-zinc-500">Önizleme yok</p>
                    )}
                </div>

                {webmOnIos ? (
                    <p className="absolute bottom-16 left-0 right-0 px-4 text-center text-xs text-amber-200/90">
                        iOS’ta WebM sınırlı olabilir; MP4 tercih edin veya Chrome deneyin.
                    </p>
                ) : null}
            </div>
            <style>{`
                @keyframes city-promo-w {
                  to { width: 100%; }
                }
            `}</style>
        </div>,
        document.body,
    );
}

export function CityPromoStories({ rings }: Readonly<{ rings: CityPromoStoryRing[] }>) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrollEdges, setScrollEdges] = useState({ left: false, right: false });
    const [viewer, setViewer] = useState<{ ring: number; seg: number } | null>(null);

    const list = useMemo(() => rings.filter((r) => r.segments.length > 0), []);

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) {
            return;
        }
        const maxScroll = el.scrollWidth - el.clientWidth;
        setScrollEdges({
            left: el.scrollLeft > 8,
            right: maxScroll > 8 && el.scrollLeft < maxScroll - 8,
        });
    }, []);

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [checkScroll, list]);

    const scrollByDir = (dir: 1 | -1) => {
        const el = scrollRef.current;
        if (!el) {
            return;
        }
        el.scrollBy({ left: dir * 220, behavior: 'smooth' });
        window.setTimeout(checkScroll, 400);
    };

    const onStripKeyDown = (e: ReactKeyboardEvent) => {
        if (e.key === 'ArrowRight') {
            scrollByDir(1);
        }
        if (e.key === 'ArrowLeft') {
            scrollByDir(-1);
        }
    };

    if (list.length === 0) {
        return null;
    }

    return (
        <section
            className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800"
            aria-label="Şehirdeki etkinlik tanıtımları"
            onKeyDown={onStripKeyDown}
        >
            <div className="mb-3 flex items-end justify-between gap-2">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Tanıtımlar</p>
                    <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">Bu şehirdeki sanatçılar</h2>
                </div>
            </div>

            <div className="relative">
                <div
                    ref={scrollRef}
                    onScroll={checkScroll}
                    className="scrollbar-hide flex gap-4 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                    {list.map((r, ringIdx) => {
                        const thumb =
                            storageUrl(r.artist.avatar) ??
                            storageUrl(r.segments[0]?.poster_path ?? null) ??
                            null;
                        const label = r.artist.name;
                        return (
                            <button
                                key={r.artist.id}
                                type="button"
                                onClick={() => setViewer({ ring: ringIdx, seg: 0 })}
                                className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 rounded-xl border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                            >
                                <div className="rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-[2.5px] shadow-sm">
                                    <div className="rounded-full bg-white p-[2px] dark:bg-zinc-950">
                                        <div className="h-14 w-14 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                            {thumb ? (
                                                <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-500">
                                                    {label.slice(0, 1).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className="w-full truncate text-center text-[10px] font-medium leading-tight text-zinc-700 dark:text-zinc-300">
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </div>
                {scrollEdges.right ? (
                    <button
                        type="button"
                        onClick={() => scrollByDir(1)}
                        className="absolute right-0 top-1/2 z-[1] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-900 shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                        aria-label="Daha fazla"
                    >
                        <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                ) : null}
                {scrollEdges.left ? (
                    <button
                        type="button"
                        onClick={() => scrollByDir(-1)}
                        className="absolute left-0 top-1/2 z-[1] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-900 shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                        aria-label="Geri kaydır"
                    >
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                ) : null}
            </div>

            {viewer !== null && list[viewer.ring] ? (
                <StoryViewer
                    rings={list}
                    openRing={viewer.ring}
                    openSegment={viewer.seg}
                    onClose={() => setViewer(null)}
                    onIndexChange={(ring, seg) => setViewer({ ring, seg })}
                />
            ) : null}
        </section>
    );
}
