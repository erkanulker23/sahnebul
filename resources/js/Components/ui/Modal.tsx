import { cn } from '@/lib/cn';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { type PropsWithChildren } from 'react';

const maxWidthClass: Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
};

export type ModalProps = PropsWithChildren<{
    show: boolean;
    maxWidth?: keyof typeof maxWidthClass;
    closeable?: boolean;
    onClose: () => void;
    className?: string;
    panelClassName?: string;
}>;

/**
 * Headless UI v2 Dialog — dark/light uyumlu panel.
 */
export function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    onClose,
    className,
    panelClassName,
}: Readonly<ModalProps>) {
    return (
        <Dialog
            open={show}
            onClose={() => {
                if (closeable) onClose();
            }}
            className={cn('relative z-50', className)}
        >
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-zinc-900/50 backdrop-blur-[2px] transition-opacity data-[closed]:opacity-0 dark:bg-black/60"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
                <DialogPanel
                    transition
                    className={cn(
                        'w-full transform overflow-hidden rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-xl transition-all data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100',
                        maxWidthClass[maxWidth],
                        panelClassName,
                    )}
                >
                    {children}
                </DialogPanel>
            </div>
        </Dialog>
    );
}
