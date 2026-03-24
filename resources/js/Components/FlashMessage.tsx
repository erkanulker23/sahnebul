import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function FlashMessage() {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (flash?.success || flash?.error) {
            setVisible(true);
            const t = setTimeout(() => setVisible(false), 5000);
            return () => clearTimeout(t);
        }
    }, [flash?.success, flash?.error]);

    if (!visible || (!flash?.success && !flash?.error)) return null;

    return (
        <div className="fixed right-4 top-4 z-50 animate-in fade-in slide-in-from-top-2">
            {flash.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/20 px-4 py-3 text-green-400 shadow-lg">
                    ✓ {flash.success}
                </div>
            )}
            {flash.error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/20 px-4 py-3 text-red-400 shadow-lg">
                    ✗ {flash.error}
                </div>
            )}
        </div>
    );
}
