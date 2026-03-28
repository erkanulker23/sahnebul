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
 * Ziyaretçi sayfaları: yalnızca kayıtlı önizleme görseli (poster). Instagram’a giden bağlantı veya «Instagram’da aç» yok.
 */
export function InstagramPromoPreviewOnly({
    posterSrc,
    className = '',
}: Readonly<{
    posterSrc: string | null;
    className?: string;
}>) {
    return (
        <div
            className={`overflow-hidden rounded-xl border border-white/15 bg-zinc-900/80 shadow-xl ${className}`.trim()}
        >
            {posterSrc ? (
                <div className="max-h-[min(70dvh,560px)] w-full bg-black">
                    <img src={posterSrc} alt="" className="mx-auto max-h-[min(70dvh,560px)] w-full object-contain" />
                </div>
            ) : (
                <div className="flex min-h-[min(280px,50dvh)] flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-800 to-zinc-950 px-8 py-14 text-center">
                    <span className="text-sm font-semibold text-zinc-300">Önizleme görseli yok</span>
                    <span className="max-w-sm text-xs leading-snug text-zinc-500">
                        Bu öğe için sunucuda kayıtlı kapak görseli yok.
                    </span>
                </div>
            )}
        </div>
    );
}

/** Yönetim önizlemesi veya tam gömülü widget gerektiğinde (Instagram kendi arayüzünü getirir). */
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
