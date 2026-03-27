import ArtistsWeekSlider from '@/Components/ArtistsWeekSlider';
import { sanitizeHtmlForInnerHtml } from '@/Components/SafeRichContent';
import SeoHead from '@/Components/SeoHead';
import ThisWeekEventsBadge from '@/Components/ThisWeekEventsBadge';
import { stripHtmlToText } from '@/utils/seo';
import VerifiedArtistProfileBadge from '@/Components/VerifiedArtistProfileBadge';
import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { FormEvent, useEffect, useRef, useState } from 'react';

interface Artist {
    id: number;
    name: string;
    slug: string;
    bio: string | null;
    avatar: string | null;
    genre: string | null;
    weekly_events_count?: number;
    monthly_events_count?: number;
    /** Bağlı kullanıcının e-postası doğrulanmış, profil sahiplenilmiş. */
    is_verified_profile?: boolean;
}

interface Props {
    artists: {
        data: Artist[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        total?: number;
        from?: number | null;
        to?: number | null;
    };
    listingStructuredData?: Record<string, unknown> | null;
    genres: string[];
    letters: string[];
    /** Türkçe A–Z (Ç, Ğ, İ, Ö, Ş, Ü dahil) — tüm harfler filtrede */
    alphabetLetters: string[];
    filters: { search?: string; genre?: string; letter?: string };
    artistsThisWeek?: Array<{
        id: number;
        name: string;
        slug: string;
        avatar: string | null;
        genre: string | null;
        is_verified_profile?: boolean;
        week_first_show: string | null;
        week_events_count?: number;
    }>;
    weekRange?: { start: string; end: string };
}

export default function ArtistsIndex({
    artists,
    listingStructuredData = null,
    genres,
    letters,
    alphabetLetters,
    filters,
    artistsThisWeek = [],
    weekRange,
}: Readonly<Props>) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [genre, setGenre] = useState(filters.genre ?? '');
    const [letter, setLetter] = useState(filters.letter ?? '');
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setGenre(filters.genre ?? '');
        setLetter(filters.letter ?? '');
    }, [filters.genre, filters.letter]);

    useEffect(() => {
        if (searchInputRef.current === document.activeElement) {
            return;
        }
        setSearch(filters.search ?? '');
    }, [filters.search]);

    const imageSrc = (path: string | null) => {
        if (!path) return null;
        return path.startsWith('http://') || path.startsWith('https://') ? path : `/storage/${path}`;
    };

    const initialsFromName = (name: string) => {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        const a = parts[0][0] ?? '';
        const b = parts.at(-1)?.[0] ?? '';
        return (a + b).toUpperCase();
    };
    const handleFilter = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        router.get(route('artists.index'), Object.fromEntries(formData.entries()), { preserveState: true });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (
                search === (filters.search ?? '') &&
                genre === (filters.genre ?? '') &&
                letter === (filters.letter ?? '')
            ) {
                return;
            }
            router.get(
                route('artists.index'),
                { search, genre, letter },
                { preserveState: true, replace: true }
            );
        }, 250);

        return () => clearTimeout(timer);
    }, [search, genre, letter, filters.search, filters.genre, filters.letter]);

    return (
        <AppLayout>
            <SeoHead
                title="Sanatçılar - Sahnebul"
                description="Konser ve etkinlik sanatçılarını keşfedin; tür, şehir ve yaklaşan gösteriler. Profiller ve takvim Sahnebul’da."
                jsonLd={listingStructuredData ?? undefined}
            />

            {/* Hero — tam genişlik */}
            <section className="hero-full-bleed relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-100 via-white to-zinc-100 dark:from-[#0a0a0b] dark:via-[#0f0f12] dark:to-[#0a0a0b]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(251,191,36,0.1),transparent)]" />
                <div className="relative mx-auto max-w-7xl px-3 py-14 sm:px-5 sm:py-20 lg:px-8 lg:py-28">
                    <div className="max-w-2xl">
                        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-400/80">
                            Platformumuzdaki Sanatçılar
                        </p>
                        <h1 className="font-display text-5xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
                            Sanatçıları
                            {' '}
                            <span className="mt-2 block bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                                Keşfedin
                            </span>
                        </h1>
                        <p className="mt-5 text-lg text-zinc-600 dark:text-zinc-400">
                            Sahne alan sanatçılar, gruplar ve performansçılar. Konser ve etkinliklerde görebileceğiniz isimler.
                        </p>
                    </div>
                </div>
            </section>

            {artistsThisWeek.length > 0 && weekRange && (
                <ArtistsWeekSlider artists={artistsThisWeek} weekRange={weekRange} imageSrc={imageSrc} />
            )}

            {/* Filter */}
            <section className="relative z-10 mx-auto max-w-7xl -mt-6 px-0 sm:px-4 lg:px-8">
                <form onSubmit={handleFilter} className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl sm:p-5 lg:p-6 dark:border-white/[0.06] dark:bg-zinc-900/90 dark:shadow-black/20">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-5">
                        <div className="flex-1">
                            <label htmlFor="artist-search" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-500">Sanatçı ara</label>
                            <input
                                ref={searchInputRef}
                                id="artist-search"
                                type="text"
                                name="search"
                                placeholder="İsim ile ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 placeholder-zinc-500 transition focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/15 dark:border-white/[0.08] dark:bg-zinc-800/60 dark:text-white"
                            />
                        </div>
                        <div className="min-w-[200px]">
                            <label htmlFor="artist-genre" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-500">Tür</label>
                            <select
                                id="artist-genre"
                                name="genre"
                                value={genre}
                                onChange={(e) => setGenre(e.target.value)}
                                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 transition focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/15 dark:border-white/[0.08] dark:bg-zinc-800/60 dark:text-white"
                            >
                                <option value="">Tüm Türler</option>
                                {genres.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                        <div className="min-w-[120px]">
                            <label htmlFor="artist-letter" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-500">Alfabe</label>
                            <select
                                id="artist-letter"
                                name="letter"
                                value={letter}
                                onChange={(e) => setLetter(e.target.value)}
                                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 transition focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/15 dark:border-white/[0.08] dark:bg-zinc-800/60 dark:text-white"
                            >
                                <option value="">Tümü (A&apos;dan Z&apos;ye)</option>
                                {alphabetLetters.map((l) => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="rounded-xl bg-amber-500 px-8 py-3 font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 hover:shadow-amber-500/25"
                        >
                            Filtrele
                        </button>
                    </div>
                </form>
            </section>

            {/* Artists Grid */}
            <section className="mx-auto max-w-7xl px-0 py-12 sm:px-4 sm:py-16 lg:px-8">
                {alphabetLetters.length > 0 && (
                    <div className="mb-8 rounded-2xl border border-zinc-200 bg-zinc-100/90 p-4 dark:border-white/[0.08] dark:bg-zinc-900/50">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-500">
                            A&apos;dan Z&apos;ye — alfabe ile filtrele
                        </p>
                        <p className="mb-3 text-[11px] text-zinc-600 dark:text-zinc-500">Soluk harflerde şu an kayıtlı sanatçı yok.</p>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href={route('artists.index', { ...filters, letter: undefined })}
                                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                                    filters.letter
                                        ? 'border-zinc-300 bg-white text-zinc-800 hover:border-amber-400 dark:border-white/10 dark:bg-transparent dark:text-zinc-400 dark:hover:border-amber-500/30 dark:hover:text-amber-400'
                                        : 'border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300'
                                }`}
                                preserveState
                            >
                                Tümü
                            </Link>
                            {alphabetLetters.map((l) => {
                                const hasData = letters.includes(l);
                                let pillClass =
                                    'border-zinc-200 bg-white text-zinc-500 hover:border-amber-300 hover:text-zinc-800 dark:border-white/[0.06] dark:bg-transparent dark:text-zinc-600 dark:hover:border-amber-500/20 dark:hover:text-zinc-400';
                                if (filters.letter === l) {
                                    pillClass =
                                        'border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-400';
                                } else if (hasData) {
                                    pillClass =
                                        'border-zinc-300 bg-white text-zinc-900 hover:border-amber-400 dark:border-white/10 dark:bg-transparent dark:text-zinc-300 dark:hover:border-amber-500/30 dark:hover:text-amber-400';
                                }
                                return (
                                    <Link
                                        key={l}
                                        href={route('artists.index', { ...filters, letter: l })}
                                        className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${pillClass}`}
                                        preserveState
                                    >
                                        {l}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {artists.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 py-24 text-center dark:border-white/10 dark:bg-zinc-900/30">
                        <div className="mb-4 text-6xl opacity-50">🎤</div>
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">Sanatçı bulunamadı</h3>
                        <p className="mt-2 max-w-md text-zinc-500">Filtreleri değiştirmeyi deneyin.</p>
                    </div>
                ) : (
                    <>
                        <p className="mb-10 text-sm font-medium text-zinc-600 dark:text-zinc-500">
                            {artists.total ? `${artists.total} sanatçıdan ${artists.from ?? 0}-${artists.to ?? 0} arası gösteriliyor` : `${artists.data.length} sanatçı`}
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
                            {artists.data.map((artist) => (
                                <Link
                                    key={artist.id}
                                    href={route('artists.show', artist.slug)}
                                    aria-label={`${artist.name}, sanatçı profili`}
                                    className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/80 hover:shadow-lg sm:rounded-2xl dark:border-white/[0.06] dark:bg-zinc-900/60 dark:hover:border-amber-500/20 dark:hover:shadow-amber-500/5"
                                >
                                    <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900">
                                        {artist.avatar ? (
                                            <img
                                                src={imageSrc(artist.avatar) ?? ''}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-900/40 via-zinc-800 to-zinc-900">
                                                <span className="font-display text-2xl font-bold tracking-tight text-amber-400/90 sm:text-5xl" aria-hidden>
                                                    {initialsFromName(artist.name)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-90 dark:from-zinc-900 dark:opacity-80" />
                                        <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3">
                                            <span className="inline-block max-w-full truncate rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-medium text-zinc-950 backdrop-blur-sm sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-xs dark:bg-amber-500/20 dark:text-amber-200">
                                                {artist.genre ?? 'Sanatçı'}
                                            </span>
                                        </div>
                                        <ThisWeekEventsBadge
                                            weekCount={artist.weekly_events_count ?? 0}
                                            monthCount={artist.monthly_events_count ?? 0}
                                        />
                                    </div>
                                    <div className="p-2.5 sm:p-5">
                                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                            <h3 className="line-clamp-2 font-display text-xs font-bold leading-tight text-zinc-900 transition group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-400 sm:text-lg">
                                                {artist.name}
                                            </h3>
                                            {artist.is_verified_profile && <VerifiedArtistProfileBadge />}
                                        </div>
                                        {artist.bio?.trim() && (
                                            <p className="mt-1 line-clamp-2 text-[11px] text-zinc-600 dark:text-zinc-500 sm:mt-2 sm:text-sm">
                                                {stripHtmlToText(artist.bio)}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {artists.links.length > 3 && (
                            <div className="mt-10 flex flex-wrap gap-2">
                                {artists.links.map((link, idx) => {
                                    const label = link.label
                                        .replace('&laquo; Previous', 'Önceki')
                                        .replace('Next &raquo;', 'Sonraki');
                                    if (!link.url) {
                                        return (
                                            <span
                                                key={`${label}-${idx}`}
                                                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-600"
                                            >
                                                {label}
                                            </span>
                                        );
                                    }

                                    return (
                                        <Link
                                            key={`${label}-${idx}`}
                                            href={link.url}
                                            preserveState
                                            preserveScroll
                                            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                                                link.active
                                                    ? 'border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-300'
                                                    : 'border-zinc-300 bg-white text-zinc-800 hover:border-amber-400 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-300 dark:hover:border-amber-500/30 dark:hover:text-amber-400'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: sanitizeHtmlForInnerHtml(label) }}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </section>
        </AppLayout>
    );
}
