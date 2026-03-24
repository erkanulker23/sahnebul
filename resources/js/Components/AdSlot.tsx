import { cn } from '@/lib/cn';
import { usePage } from '@inertiajs/react';
import { useEffect, useRef, type ReactNode } from 'react';

export type AdSlotKey =
    | 'header_below_nav'
    | 'home_below_hero'
    | 'venues_list_top'
    | 'events_index_top'
    | 'venue_sidebar'
    | 'blog_sidebar'
    | 'footer_above';

interface AdSlotConfig {
    enabled?: boolean;
    type?: string;
    image_url?: string;
    link_url?: string;
    alt?: string;
    title?: string;
    html?: string;
}

function AdHtmlEmbed({ html, className }: Readonly<{ html: string; className?: string }>) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || !html.trim()) {
            return;
        }
        el.innerHTML = html;
        el.querySelectorAll('script').forEach((oldScript) => {
            const s = document.createElement('script');
            Array.from(oldScript.attributes).forEach((attr) => s.setAttribute(attr.name, attr.value));
            s.textContent = oldScript.textContent;
            oldScript.replaceWith(s);
        });
    }, [html]);

    return <div ref={ref} className={cn('ad-html-embed min-h-0 w-full', className)} />;
}

export function AdSlot({
    slotKey,
    className,
    variant = 'content',
}: Readonly<{
    slotKey: AdSlotKey;
    className?: string;
    /** `content`: leaderboard genişliği; `sidebar`: dar sütun; `full`: dış sarmalayıcı genişliği */
    variant?: 'content' | 'sidebar' | 'full';
}>) {
    const page = usePage().props as {
        settings?: { ads?: { slots?: Record<string, AdSlotConfig> } };
    };
    const cfg = page.settings?.ads?.slots?.[slotKey];
    if (!cfg?.enabled) {
        return null;
    }

    const innerMax =
        variant === 'sidebar'
            ? 'max-w-full min-w-0'
            : variant === 'full'
              ? 'w-full max-w-[1600px]'
              : 'w-full max-w-[min(100%,728px)]';

    const wrap = (inner: ReactNode) => (
        <aside
            className={cn('ad-slot flex justify-center px-2 py-3', className)}
            data-ad-slot={slotKey}
            aria-label="Reklam"
        >
            <div className={innerMax}>{inner}</div>
        </aside>
    );

    if (cfg.type === 'banner' && cfg.image_url?.trim()) {
        const raw = cfg.image_url.trim();
        const img = raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/') ? raw : `/storage/${raw}`;
        const inner = cfg.link_url?.trim() ? (
            <a
                href={cfg.link_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="block overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-700/80"
            >
                <img src={img} alt={cfg.alt || cfg.title || 'Reklam'} className="h-auto w-full object-contain" loading="lazy" />
            </a>
        ) : (
            <img
                src={img}
                alt={cfg.alt || cfg.title || 'Reklam'}
                className="h-auto w-full rounded-xl border border-zinc-200/80 object-contain dark:border-zinc-700/80"
                loading="lazy"
            />
        );
        return wrap(inner);
    }

    if ((cfg.type === 'adsense' || cfg.type === 'custom_html') && cfg.html?.trim()) {
        return wrap(<AdHtmlEmbed html={cfg.html} />);
    }

    return null;
}
