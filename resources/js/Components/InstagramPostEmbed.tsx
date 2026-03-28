import { useEffect } from 'react';

export function instagramPermalinkForEmbed(url: string): string {
    return url.includes('instagram.com') ? (url.endsWith('/') ? url : `${url}/`) : url;
}

/**
 * Instagram gömülü gönderi widget’ı için resmi embed.js yüklenir ve `instgrm.Embeds.process()` çağrılır.
 */
export function useInstagramEmbedScript(permalinkSignatures: string): void {
    useEffect(() => {
        if (!permalinkSignatures) {
            return;
        }
        const w = window as Window & { instgrm?: { Embeds: { process: () => void } } };
        const scriptSrc = 'https://www.instagram.com/embed.js';
        const existing = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement | null;
        const runProcess = () => {
            w.instgrm?.Embeds?.process();
        };
        if (!existing) {
            const script = document.createElement('script');
            script.src = scriptSrc;
            script.async = true;
            script.addEventListener('load', runProcess);
            document.body.appendChild(script);
            return undefined;
        }
        const t = window.setTimeout(runProcess, 0);
        return () => window.clearTimeout(t);
    }, [permalinkSignatures]);
}

/**
 * Ziyaretçi sayfalarında kullanın: resmi gömülü widget profil başlığı ve «Profili gör» gösterir;
 * bu kart yalnızca önizleme + Instagram’da açır.
 */
export function InstagramExternalOpenCard({
    permalink,
    posterSrc,
    className = '',
}: Readonly<{
    permalink: string;
    posterSrc: string | null;
    className?: string;
}>) {
    const href = instagramPermalinkForEmbed(permalink.trim());
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`group block max-w-lg overflow-hidden rounded-xl border border-white/15 bg-zinc-900/80 shadow-xl outline-none transition hover:border-amber-400/40 focus-visible:ring-2 focus-visible:ring-amber-400 ${className}`.trim()}
        >
            {posterSrc ? (
                <>
                    <div className="relative max-h-[min(70dvh,560px)] w-full bg-black">
                        <img src={posterSrc} alt="" className="mx-auto max-h-[min(70dvh,560px)] w-full object-contain" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-12 text-center">
                            <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                                Instagram’da aç
                            </span>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex min-h-[min(280px,50dvh)] flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] px-8 py-14 text-center">
                    <span className="text-lg font-bold text-white">Instagram gönderisi</span>
                    <p className="max-w-sm text-sm leading-snug text-white/90">
                        Tam gönderiyi görmek veya oynatmak için Instagram’da açın.
                    </p>
                    <span className="mt-1 rounded-full bg-black/25 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20">
                        Instagram’da aç →
                    </span>
                </div>
            )}
        </a>
    );
}

/** Yönetim önizlemesi veya bilinçli olarak tam widget istenen yerler için (profil başlığı dahil). */
export function InstagramPostBlock({
    permalink,
    className = '',
}: Readonly<{ permalink: string; className?: string }>) {
    const p = instagramPermalinkForEmbed(permalink.trim());
    return (
        <div className={`flex justify-center overflow-x-auto ${className}`.trim()}>
            <blockquote
                className="instagram-media"
                data-instgrm-captioned
                data-instgrm-permalink={p}
                data-instgrm-version="14"
                style={{
                    background: 'transparent',
                    border: 0,
                    borderRadius: 12,
                    margin: 0,
                    maxWidth: 540,
                    minWidth: 280,
                    padding: 0,
                    width: '100%',
                }}
            />
        </div>
    );
}
