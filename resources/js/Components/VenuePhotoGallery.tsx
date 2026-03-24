import { useCallback, useEffect, useRef, useState } from 'react';

export interface VenueGalleryPhoto {
    id: number;
    src: string;
}

interface VenuePhotoGalleryProps {
    photos: VenueGalleryPhoto[];
    venueName: string;
}

export default function VenuePhotoGallery({ photos, venueName }: Readonly<VenuePhotoGalleryProps>) {
    const [active, setActive] = useState(0);
    const [lightbox, setLightbox] = useState<number | null>(null);
    const lightboxRef = useRef<number | null>(null);
    lightboxRef.current = lightbox;
    const n = photos.length;

    const closeLightbox = useCallback(() => {
        const idx = lightboxRef.current;
        if (idx !== null) setActive(idx);
        setLightbox(null);
    }, []);

    const go = useCallback(
        (delta: number) => {
            setActive((i) => (i + delta + n) % n);
        },
        [n],
    );

    const goLb = useCallback(
        (delta: number) => {
            setLightbox((i) => (i === null ? null : (i + delta + n) % n));
        },
        [n],
    );

    const photoIds = photos.map((p) => p.id).join(',');
    useEffect(() => {
        setActive(0);
    }, [photoIds]);

    useEffect(() => {
        if (lightbox === null) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') goLb(-1);
            if (e.key === 'ArrowRight') goLb(1);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [lightbox, goLb, closeLightbox]);

    if (n === 0) return null;

    const current = photos[active];
    const lbIndex = lightbox ?? 0;
    const lbPhoto = photos[lbIndex];

    return (
        <>
            <div className="mt-8 rounded-2xl border border-white/5 bg-zinc-900/30 p-6 sm:p-8">
                <h2 className="font-display mb-4 text-xl font-bold text-white sm:mb-6">Mekan Fotoğrafları</h2>

                <div className="relative overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-white/10">
                    <button
                        type="button"
                        onClick={() => setLightbox(active)}
                        className="group relative block w-full outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        aria-label={`${venueName} — fotoğraf ${active + 1}, tam ekran aç`}
                    >
                        <div className="aspect-[16/10] w-full sm:aspect-[21/10]">
                            <img
                                src={current.src}
                                alt={`${venueName} — ${active + 1} / ${n}`}
                                className="h-full w-full object-cover transition duration-300 group-hover:brightness-95"
                            />
                        </div>
                        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                            {active + 1} / {n}
                        </span>
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                            <span className="rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                                Büyüt
                            </span>
                        </span>
                    </button>

                    {n > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    go(-1);
                                }}
                                className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/75 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400"
                                aria-label="Önceki fotoğraf"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    go(1);
                                }}
                                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/75 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400"
                                aria-label="Sonraki fotoğraf"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>

                {n > 1 && (
                    <div
                        className="mt-4 flex gap-2 overflow-x-auto pb-1"
                        role="tablist"
                        aria-label="Galeri küçük resimleri"
                    >
                        {photos.map((p, i) => (
                            <button
                                key={p.id}
                                type="button"
                                role="tab"
                                aria-selected={i === active}
                                onClick={() => setActive(i)}
                                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400 sm:h-[4.5rem] sm:w-28 ${
                                    i === active
                                        ? 'border-amber-500 ring-2 ring-amber-500/40'
                                        : 'border-transparent opacity-65 hover:opacity-100'
                                }`}
                            >
                                <img src={p.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {lightbox !== null && lbPhoto && (
                <div
                    className="fixed inset-0 z-[70] flex flex-col bg-black/92 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Fotoğraf galerisi"
                >
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
                        <p className="text-sm font-medium text-white">
                            {lbIndex + 1} / {n}
                        </p>
                        <button
                            type="button"
                            onClick={closeLightbox}
                            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                        >
                            Kapat
                        </button>
                    </div>

                    <div
                        className="relative flex min-h-0 flex-1 cursor-default items-center justify-center px-2 py-4 sm:px-4"
                        onClick={closeLightbox}
                        role="presentation"
                    >
                        {n > 1 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goLb(-1);
                                }}
                                className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-4"
                                aria-label="Önceki"
                            >
                                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}

                        <div
                            className="relative z-10 flex max-h-full max-w-full flex-col items-center"
                            onClick={(e) => e.stopPropagation()}
                            role="presentation"
                        >
                            <img
                                src={lbPhoto.src}
                                alt={`${venueName} — ${lbIndex + 1} / ${n}`}
                                className="max-h-[calc(100vh-8rem)] max-w-full rounded-lg object-contain shadow-2xl"
                            />
                            <p className="mt-3 hidden text-center text-xs text-zinc-500 sm:block">← → ok tuşları ile gezin • Esc ile kapat</p>
                        </div>

                        {n > 1 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goLb(1);
                                }}
                                className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4"
                                aria-label="Sonraki"
                            >
                                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {n > 1 && (
                        <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-white/10 px-4 py-3 sm:px-6">
                            {photos.map((p, i) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightbox(i);
                                    }}
                                    className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-24 ${
                                        i === lbIndex ? 'border-amber-400' : 'border-transparent opacity-50 hover:opacity-90'
                                    }`}
                                >
                                    <img src={p.src} alt="" className="h-full w-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
