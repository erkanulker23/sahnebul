import '../css/app.css';
import './bootstrap';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { buildDocumentTitle } from './utils/seo';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => buildDocumentTitle(title ?? '', appName),
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ThemeProvider>
                <App {...props} />
            </ThemeProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

/** PWA: Ana ekrana ekle / kurulum — üretimde service worker kaydı (önbellek yok, sadece fetch iletir). */
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
            /* Kayıt başarısız — site normal çalışmaya devam eder */
        });
    });
}
