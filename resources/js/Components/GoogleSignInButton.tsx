import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

type GsiGoogle = {
    accounts: {
        id: {
            initialize: (opts: { client_id: string; callback: (r: { credential: string }) => void }) => void;
            renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
    };
};

function gsiGoogle(): GsiGoogle | undefined {
    return (window as unknown as { google?: GsiGoogle }).google;
}

/**
 * Google Identity Services — sunucu `googleAuth` paylaşımına göre; kimlik jetonu `auth.google.credential` rotasına gönderilir.
 */
export default function GoogleSignInButton({ redirect }: Readonly<{ redirect?: string | null }>) {
    const rootRef = useRef<HTMLDivElement>(null);
    const page = usePage();
    const ga = (page.props as { googleAuth?: { enabled?: boolean; clientId?: string | null } }).googleAuth;
    const clientId = ga?.clientId;
    const enabled = ga?.enabled === true && typeof clientId === 'string' && clientId.trim() !== '';

    useEffect(() => {
        if (!enabled || !clientId || !rootRef.current) {
            return;
        }

        const mount = () => {
            const el = rootRef.current;
            const g = gsiGoogle();
            if (!el || !g?.accounts?.id) {
                return;
            }
            el.innerHTML = '';
            g.accounts.id.initialize({
                client_id: clientId,
                callback: (res: { credential: string }) => {
                    const rel =
                        redirect?.trim() ||
                        (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '');
                    router.post(route('auth.google.credential'), {
                        credential: res.credential,
                        redirect: rel || undefined,
                    });
                },
            });
            g.accounts.id.renderButton(el, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                locale: 'tr',
                width: 320,
            });
        };

        const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existing && gsiGoogle()?.accounts?.id) {
            mount();

            return;
        }
        if (existing) {
            const id = window.setInterval(() => {
                if (gsiGoogle()?.accounts?.id) {
                    window.clearInterval(id);
                    mount();
                }
            }, 80);

            return () => window.clearInterval(id);
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => mount();
        document.head.appendChild(script);

        return undefined;
    }, [enabled, clientId, redirect]);

    if (!enabled) {
        return null;
    }

    return (
        <div className="w-full">
            <p className="mb-3 text-center text-xs text-zinc-500 dark:text-zinc-400">veya</p>
            <div ref={rootRef} className="flex w-full justify-center [&>div]:!w-full [&>div]:!max-w-none" />
        </div>
    );
}
