/** Form başlangıcı: `music_genres` JSON veya tek alan `genre` (virgüllü) ile uyumlu. */
export function initialMusicGenres(
    musicGenres: string[] | null | undefined,
    genre: string | null | undefined,
    options: readonly string[]
): string[] {
    const optSet = new Set(options);
    if (musicGenres?.length) {
        return musicGenres.filter((g) => optSet.has(g));
    }
    if (!genre?.trim()) return [];
    const parts = genre.split(',').map((s) => s.trim()).filter(Boolean);
    const matched = parts.filter((p) => optSet.has(p));
    if (matched.length) return matched;
    const t = genre.trim();
    return optSet.has(t) ? [t] : [];
}
