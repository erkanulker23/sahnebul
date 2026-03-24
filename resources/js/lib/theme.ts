/** Tek kaynak: tüm uygulama (site + admin + panel) aynı anahtarı kullanır. */
export const THEME_STORAGE_KEY = 'sahnebul-theme';

export type ThemeMode = 'light' | 'dark';

const LEGACY_KEYS = ['theme', 'admin_theme'] as const;

export function migrateLegacyThemeKeys(): void {
    if (typeof window === 'undefined') return;
    try {
        if (localStorage.getItem(THEME_STORAGE_KEY)) return;
        for (const key of LEGACY_KEYS) {
            const v = localStorage.getItem(key);
            if (v === 'light' || v === 'dark') {
                localStorage.setItem(THEME_STORAGE_KEY, v);
                return;
            }
        }
    } catch {
        /* ignore */
    }
}

export function getStoredTheme(): ThemeMode | null {
    if (typeof window === 'undefined') return null;
    try {
        const v = localStorage.getItem(THEME_STORAGE_KEY);
        if (v === 'light' || v === 'dark') return v;
    } catch {
        /* ignore */
    }
    return null;
}

export function getSystemPrefersDark(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** İlk yükleme: kayıt yoksa sistem tercihi. */
export function resolveInitialTheme(): ThemeMode {
    const stored = getStoredTheme();
    if (stored) return stored;
    return getSystemPrefersDark() ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode): void {
    document.documentElement.classList.toggle('dark', mode === 'dark');
}

export function persistTheme(mode: ThemeMode): void {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
        /* ignore */
    }
}
