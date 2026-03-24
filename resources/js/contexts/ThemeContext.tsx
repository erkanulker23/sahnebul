import { applyTheme, migrateLegacyThemeKeys, persistTheme, resolveInitialTheme, type ThemeMode } from '@/lib/theme';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

type ThemeContextValue = {
    theme: ThemeMode;
    setTheme: (mode: ThemeMode) => void;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readThemeOnClient(): ThemeMode {
    if (typeof window === 'undefined') return 'light';
    migrateLegacyThemeKeys();
    return resolveInitialTheme();
}

export function ThemeProvider({ children }: Readonly<PropsWithChildren>) {
    const [theme, setThemeState] = useState<ThemeMode>(readThemeOnClient);

    useEffect(() => {
        const t = readThemeOnClient();
        setThemeState(t);
        applyTheme(t);
    }, []);

    const setTheme = useCallback((mode: ThemeMode) => {
        setThemeState(mode);
        applyTheme(mode);
        persistTheme(mode);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => {
            const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            persistTheme(next);
            return next;
        });
    }, []);

    const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return ctx;
}

/** Layout’larda isteğe bağlı: provider dışında kullanılırsa güvenli varsayılan. */
export function useThemeOptional(): ThemeContextValue | null {
    return useContext(ThemeContext);
}
