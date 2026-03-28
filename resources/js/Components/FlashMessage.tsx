import { cn } from '@/lib/cn';
import { usePage } from '@inertiajs/react';
import { CheckCircle2, X as CloseIcon, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

/** tailwind `toast-progress` animasyon süresi ile aynı olmalı */
const DISMISS_MS = 5500;

/** İlk cümle başlık, ". " sonrası açıklama */
function splitFlashText(text: string): { headline: string; supporting?: string } {
    const t = text.trim();
    const i = t.indexOf('. ');
    if (i > 0) {
        return {
            headline: t.slice(0, i + 1).trim(),
            supporting: t.slice(i + 2).trim() || undefined,
        };
    }
    return { headline: t };
}

const EMAIL_VERIFIED_LEGACY =
    'E-posta adresiniz doğrulandı. Artık takip listesi ve hatırlatmalar için e-posta kullanabilirsiniz.';

export default function FlashMessage() {
    const page = usePage();
    const { flash } = page.props as { flash?: { success?: string; error?: string } };
    const [visible, setVisible] = useState(false);
    const [rendered, setRendered] = useState(false);
    const [legacySuccess, setLegacySuccess] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        if (params.get('verified') !== '1') {
            return;
        }
        setLegacySuccess(EMAIL_VERIFIED_LEGACY);
        params.delete('verified');
        const q = params.toString();
        window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`);
    }, [page.url]);

    const payload = useMemo(() => {
        if (flash?.error) {
            return { variant: 'error' as const, raw: flash.error };
        }
        if (flash?.success) {
            return { variant: 'success' as const, raw: flash.success };
        }
        if (legacySuccess) {
            return { variant: 'success' as const, raw: legacySuccess };
        }
        return null;
    }, [flash?.error, flash?.success, legacySuccess]);

    const { headline, supporting } = useMemo(
        () => (payload ? splitFlashText(payload.raw) : { headline: '', supporting: undefined as string | undefined }),
        [payload],
    );

    const dismiss = useCallback(() => {
        setVisible(false);
        setLegacySuccess(null);
    }, []);

    useEffect(() => {
        if (!payload) {
            setRendered(false);
            setVisible(false);
            return;
        }
        setRendered(true);
        setVisible(true);
        const t = setTimeout(() => {
            setVisible(false);
            setLegacySuccess(null);
        }, DISMISS_MS);
        return () => clearTimeout(t);
    }, [payload]);

    useEffect(() => {
        if (!visible && rendered && payload) {
            const t = setTimeout(() => setRendered(false), 300);
            return () => clearTimeout(t);
        }
    }, [visible, rendered, payload]);

    if (!rendered || !payload || typeof document === 'undefined') {
        return null;
    }

    const isError = payload.variant === 'error';

    const toast = (
        <div
            className={cn(
                /* Üst bar ile çakışmasın: alt köşe + güvenli alan */
                'pointer-events-none fixed inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[240] flex justify-center sm:inset-x-auto sm:bottom-8 sm:right-8 sm:justify-end',
                !visible &&
                    'animate-toast-out motion-reduce:animate-none motion-reduce:opacity-0 motion-reduce:duration-0',
            )}
            role="status"
            aria-live={isError ? 'assertive' : 'polite'}
            aria-atomic="true"
        >
            <div
                className={cn(
                    'pointer-events-auto relative w-full min-w-[min(100%,17.5rem)] max-w-lg overflow-hidden rounded-2xl border shadow-2xl ring-1 backdrop-blur-md',
                    isError
                        ? 'border-rose-300/90 bg-white/95 ring-rose-200/60 dark:border-rose-800/90 dark:bg-zinc-950/95 dark:ring-rose-900/50'
                        : 'border-emerald-300/90 bg-white/95 ring-emerald-200/60 dark:border-emerald-800/80 dark:bg-zinc-950/95 dark:ring-emerald-900/40',
                    visible && 'animate-toast-in motion-reduce:animate-none',
                    !visible && 'motion-reduce:animate-none',
                )}
            >
                <div
                    className={cn(
                        'absolute left-0 top-0 h-full w-1.5 rounded-l-2xl',
                        isError ? 'bg-rose-500 dark:bg-rose-400' : 'bg-emerald-500 dark:bg-emerald-400',
                    )}
                    aria-hidden
                />
                <div className="flex gap-4 px-5 py-4 pl-6 pr-12">
                    <div
                        className={cn(
                            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner',
                            isError
                                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                        )}
                    >
                        {isError ? <XCircle className="h-6 w-6 stroke-[2]" aria-hidden /> : <CheckCircle2 className="h-6 w-6 stroke-[2]" aria-hidden />}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                        <p
                            className={cn(
                                'text-[11px] font-bold uppercase tracking-wider',
                                isError ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400',
                            )}
                        >
                            {isError ? 'Hata' : 'Başarılı'}
                        </p>
                        <p className="font-display text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">{headline}</p>
                        {supporting ? (
                            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{supporting}</p>
                        ) : null}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    className="absolute right-2.5 top-2.5 rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label="Bildirimi kapat"
                >
                    <CloseIcon className="h-5 w-5 stroke-[2]" aria-hidden />
                </button>
                <div
                    className={cn(
                        'h-1 origin-left rounded-b-2xl',
                        isError ? 'bg-rose-400/90 dark:bg-rose-500/70' : 'bg-emerald-400/90 dark:bg-emerald-500/70',
                        visible && 'motion-reduce:hidden animate-toast-progress',
                    )}
                    aria-hidden
                />
            </div>
        </div>
    );

    return createPortal(toast, document.body);
}
