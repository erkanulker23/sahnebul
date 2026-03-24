import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
    ],
    build: {
        sourcemap: false,
        chunkSizeWarningLimit: 900,
        reportCompressedSize: false,
        target: 'es2020',
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('@tiptap')) {
                            return 'tiptap';
                        }
                        if (id.includes('@inertiajs')) {
                            return 'inertia';
                        }
                        if (id.includes('react-dom') || id.includes('/react/')) {
                            return 'react-vendor';
                        }
                    }
                },
            },
        },
    },
});
