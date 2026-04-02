import '../css/app.css';
import './bootstrap';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { buildDocumentTitle } from './utils/seo';

/** Tarayıcının SPA geçişlerinde eski kaydırma konumunu «geri yükle»mesini azaltır (özellikle uzun detay sayfaları). */
if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

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

/** Modal / viewport kilidi sonrası biriken yatay kaydırmayı sayfa geçişlerinde sıfırla (özellikle mobil Safari / PWA). */
router.on('finish', () => {
    if (typeof window === 'undefined') {
        return;
    }
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    if (window.scrollX !== 0) {
        window.scrollTo(0, window.scrollY);
    }
});

/** PWA: Ana ekrana ekle / kurulum — üretimde service worker kaydı (önbellek yok, sadece fetch iletir). */
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
            /* Kayıt başarısız — site normal çalışmaya devam eder */
        });
    });
}
