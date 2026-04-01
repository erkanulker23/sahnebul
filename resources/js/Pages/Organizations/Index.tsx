import SeoHead from '@/Components/SeoHead';
import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';
import { Briefcase, Search } from 'lucide-react';

interface OrgRow {
    id: number;
    organization_display_name: string | null;
    name: string;
    organization_public_slug: string;
    organization_cover_image: string | null;
    avatar: string | null;
    roster_count?: number;
}

interface Props {
    organizations: {
        data: OrgRow[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        total?: number;
        from?: number | null;
        to?: number | null;
    };
    listingStructuredData?: Record<string, unknown> | null;
    filters?: { search?: string };
}

function displayName(row: OrgRow): string {
    const d = row.organization_display_name?.trim();
    return d ? d : row.name;
}

function coverSrc(row: OrgRow): string | null {
    const c = row.organization_cover_image?.trim();
    if (c) {
        return c.startsWith('http://') || c.startsWith('https://') ? c : `/storage/${c.replace(/^\//, '')}`;
    }
    const a = row.avatar?.trim();
    if (a) {
        return a.startsWith('http://') || a.startsWith('https://') ? a : `/storage/${a.replace(/^\//, '')}`;
    }
    return null;
}

export default function OrganizationsIndex({
    organizations,
    listingStructuredData = null,
    filters,
}: Readonly<Props>) {
    const [search, setSearch] = useState(filters?.search ?? '');

    useEffect(() => {
        setSearch(filters?.search ?? '');
    }, [filters?.search]);

    const submitSearch = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const q = search.trim();
        router.get(
            route('organizations.index'),
            q ? { search: q } : {},
            { preserveState: true },
        );
    };

    return (
        <AppLayout>
            <SeoHead
                title="Organizasyon firmaları"
                description="Konser ve etkinlik organizasyon firmalarını keşfedin; kadroları ve yaklaşan etkinlikleri görün."
                jsonLd={listingStructuredData ?? undefined}
            />

            <div className="mx-auto max-w-6xl px-4 py-10 lg:py-12">
                <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900 dark:text-white lg:text-4xl">
                            Organizasyon firmaları
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                            Sahnedeki organizasyonları ve kadrolarını tek yerde görün; firma sayfasından etkinliklere geçin.
                        </p>
                    </div>
                    <form onSubmit={submitSearch} className="flex w-full max-w-md gap-2">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Firma adında ara…"
                                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                            />
                        </div>
                        <button
                            type="submit"
                            className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                        >
                            Ara
                        </button>
                    </form>
                </header>

                {organizations.data.length === 0 ? (
                    <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                        Henüz yayındaki organizasyon profili yok. Yakında burada listelenecek.
                    </p>
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {organizations.data.map((row) => {
                            const src = coverSrc(row);
                            return (
                                <li key={row.id}>
                                    <Link
                                        href={route('organizations.show', row.organization_public_slug)}
                                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-amber-400/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-amber-500/35"
                                    >
                                        <div className="relative aspect-[16/9] bg-zinc-200 dark:bg-zinc-800">
                                            {src ? (
                                                <img src={src} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600/20 to-amber-500/20">
                                                    <Briefcase className="h-14 w-14 text-zinc-400 dark:text-zinc-600" aria-hidden />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-1 flex-col p-4">
                                            <span className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                                                {displayName(row)}
                                            </span>
                                            <span className="mt-1 text-xs text-zinc-500">
                                                {(row.roster_count ?? 0) > 0
                                                    ? `${row.roster_count} kadro sanatçısı`
                                                    : 'Kadro profili'}
                                            </span>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {organizations.links.length > 3 ? (
                    <nav className="mt-10 flex flex-wrap justify-center gap-2" aria-label="Sayfalandırma">
                        {organizations.links.map((l, i) => {
                            if (l.url === null) {
                                return (
                                    <span
                                        key={`p-${i}`}
                                        className="rounded-lg px-3 py-1.5 text-sm text-zinc-500"
                                        dangerouslySetInnerHTML={{ __html: l.label }}
                                    />
                                );
                            }
                            return (
                                <Link
                                    key={`p-${i}`}
                                    href={l.url}
                                    className={`rounded-lg px-3 py-1.5 text-sm ${
                                        l.active
                                            ? 'bg-amber-500 font-semibold text-zinc-950'
                                            : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            );
                        })}
                    </nav>
                ) : null}
            </div>
        </AppLayout>
    );
}
