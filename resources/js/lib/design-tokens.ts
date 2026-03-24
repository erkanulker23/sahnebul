/**
 * Tasarım sistemi özeti (Tailwind `tailwind.config.js` + `resources/css/app.css` ile uyumlu).
 *
 * Renkler:
 * - Primary: amber (sahne.* + amber-500 CTA)
 * - Arka plan: zinc-50 / dark zinc-950
 * - Yüzey: white / dark zinc-900
 * - Tehlike: red
 * - Başarı: emerald
 *
 * Tipografi: `font-ds-*` → tailwind.config fontSize.ds-*
 * Boşluk: `p-ds-*`, `gap-ds-*` → spacing.ds-*
 * Radius: `rounded-ds`, `rounded-ds-lg`
 * Gölge: `shadow-ds`, `shadow-ds-lg`
 */

export const designTokens = {
    radius: { sm: '0.375rem', DEFAULT: '0.5rem', lg: '0.75rem', xl: '1rem' },
} as const;
