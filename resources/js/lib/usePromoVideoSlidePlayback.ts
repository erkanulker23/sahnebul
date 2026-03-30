import { type RefObject, useLayoutEffect } from 'react';

/**
 * Story / tam ekran slaytta video: ref bazen bir sonraki kareye kadar boş kalabiliyor; useLayoutEffect + rAF ile
 * oynatmayı güvenilir biçimde tetikler (kaydırınca görünme sorununu azaltır).
 */
export function usePromoVideoSlidePlayback(
    videoRef: RefObject<HTMLVideoElement | null>,
    slideKey: string | null,
    videoSrc: string | null | undefined,
): void {
    useLayoutEffect(() => {
        if (!slideKey || !videoSrc) {
            return;
        }

        let cancelled = false;
        let rafId = 0;
        const maxAttempts = 12;

        const bindAndPlay = (el: HTMLVideoElement) => {
            const tryPlay = () => {
                if (cancelled) {
                    return;
                }
                void el.play().catch(() => {
                    /* autoplay politikası — kullanıcı kontrolüyle oynar */
                });
            };

            el.load();

            if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                tryPlay();
                return;
            }

            const once = () => tryPlay();
            el.addEventListener('loadeddata', once, { once: true });
            el.addEventListener('canplay', once, { once: true });
        };

        const attempt = (left: number) => {
            if (cancelled) {
                return;
            }
            const el = videoRef.current;
            if (!el) {
                if (left > 0) {
                    rafId = requestAnimationFrame(() => attempt(left - 1));
                }
                return;
            }
            bindAndPlay(el);
        };

        attempt(maxAttempts);

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
        };
    }, [slideKey, videoSrc]);
}
