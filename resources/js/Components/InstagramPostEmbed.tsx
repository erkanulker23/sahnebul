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
