import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
                display: ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
            },
            fontSize: {
                /** Tasarım sistemi: kısa isimler */
                'ds-xs': ['0.75rem', { lineHeight: '1rem' }],
                'ds-sm': ['0.875rem', { lineHeight: '1.25rem' }],
                'ds-base': ['1rem', { lineHeight: '1.5rem' }],
                'ds-lg': ['1.125rem', { lineHeight: '1.75rem' }],
                'ds-xl': ['1.25rem', { lineHeight: '1.75rem' }],
                'ds-2xl': ['1.5rem', { lineHeight: '2rem' }],
            },
            spacing: {
                'ds-1': '0.25rem',
                'ds-2': '0.5rem',
                'ds-3': '0.75rem',
                'ds-4': '1rem',
                'ds-5': '1.25rem',
                'ds-6': '1.5rem',
                'ds-8': '2rem',
            },
            borderRadius: {
                'ds-sm': '0.375rem',
                ds: '0.5rem',
                'ds-lg': '0.75rem',
                'ds-xl': '1rem',
            },
            boxShadow: {
                'ds-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                ds: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
                'ds-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
            },
            colors: {
                jjred: '#E30613',
                sahne: {
                    50: '#fffbeb',
                    100: '#fef3c7',
                    200: '#fde68a',
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                    700: '#b45309',
                    800: '#92400e',
                    900: '#78350f',
                    glow: '#fbbf24',
                },
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'scale-in': 'scaleIn 0.3s ease-out',
                'toast-in': 'toastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
                'toast-out': 'toastOut 0.25s ease-out forwards',
                /** süre: resources/js/Components/FlashMessage.tsx DISMISS_MS ile eşleşmeli */
                'toast-progress': 'toastProgress 5500ms linear forwards',
                /** Etkinlik şeridi: uzun metinler için yavaş kaydır (içerik genişliğine göre okunaklı) */
                marquee: 'marquee 120s linear infinite',
                'marquee-slow': 'marquee 120s linear infinite',
            },
            keyframes: {
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                /** Flash toast — giriş */
                toastIn: {
                    '0%': { opacity: '0', transform: 'translateY(-12px) scale(0.96)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                /** Toast alt çizgisi — otomatik kapanma süresi (süre: FlashMessage ile aynı ms) */
                toastProgress: {
                    '0%': { transform: 'scaleX(1)' },
                    '100%': { transform: 'scaleX(0)' },
                },
                toastOut: {
                    '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                    '100%': { opacity: '0', transform: 'translateY(-6px) scale(0.98)' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'stage-gradient': 'linear-gradient(135deg, #0a0a0b 0%, #1a1a1d 50%, #0f0f10 100%)',
            },
        },
    },

    plugins: [forms, typography],
};
