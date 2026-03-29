import { router } from '@inertiajs/react';

import { safeRoute } from '@/lib/safeRoute';

type GsiGoogle = {
    accounts: {
        id: {
            initialize: (opts: Record<string, unknown>) => void;
            renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
            prompt: (momentListener?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
        };
    };
};

function gsiGoogle(): GsiGoogle | undefined {
    return (window as unknown as { google?: GsiGoogle }).google;
}

let gsiScriptPromise: Promise<void> | null = null;

export function loadGsiScript(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.resolve();
    }
    if (gsiGoogle()?.accounts?.id) {
        return Promise.resolve();
    }
    if (gsiScriptPromise) {
        return gsiScriptPromise;
    }
    gsiScriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existing) {
            const id = window.setInterval(() => {
                if (gsiGoogle()?.accounts?.id) {
                    window.clearInterval(id);
                    resolve();
                }
            }, 80);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Google GSI script yüklenemedi'));
        document.head.appendChild(script);
    });
    return gsiScriptPromise;
}

/** Giriş sonrası yönlendirme: ?redirect= öncelikli, yoksa mevcut path + query */
export function resolveGoogleCredentialRedirect(): string {
    const fromQuery = new URLSearchParams(window.location.search).get('redirect')?.trim();
    if (fromQuery) {
        return fromQuery;
    }
    return `${window.location.pathname}${window.location.search}`;
}

let configuredClientId: string | null = null;

/**
 * GIS initialize yalnızca bir kez (aynı client_id); düğme ve One Tap ortak kullanır.
 */
export async function ensureGoogleIdentityInitialized(clientId: string): Promise<boolean> {
    const trimmed = clientId.trim();
    if (trimmed === '') {
        return false;
    }
    await loadGsiScript();
    const g = gsiGoogle();
    if (!g?.accounts?.id) {
        return false;
    }
    if (configuredClientId === trimmed) {
        return true;
    }
    configuredClientId = trimmed;
    g.accounts.id.initialize({
        client_id: trimmed,
        callback: (res: { credential: string }) => {
            const rel = resolveGoogleCredentialRedirect();
            router.post(safeRoute('auth.google.credential'), {
                credential: res.credential,
                redirect: rel || undefined,
            });
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
    });
    return true;
}

export { gsiGoogle };
