import SeoHead from '@/Components/SeoHead';
import ArtistLayout from '@/Layouts/ArtistLayout';
import { Link, useForm } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { FormEvent } from 'react';

interface ArtistRow {
    id: number;
    name: string;
    slug: string;
    upcoming_slots_count: number;
}

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
}

interface Props {
    artists: Paginated<ArtistRow>;
    filters: { search: string };
}

export default function ManagerAvailabilityIndex({ artists, filters }: Props) {
    const searchForm = useForm({ search: filters.search ?? '' });

    const submitSearch = (e: FormEvent) => {
        e.preventDefault();
        searchForm.get(route('artist.management.availability.index'), { preserveState: true });
    };

    return (
        <ArtistLayout>
            <SeoHead title="Sanatçı müsaitlikleri - Sahnebul" description="Müsait günlerini paylaşan onaylı sanatçıları görüntüleyin ve talep gönderin." noindex />

            <div className="mb-8">
                <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Sanatçı müsaitlikleri</h1>
                <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                    Yalnızca sizin hesabınız bu listeyi görür. Sanatçılar boş günlerini işaretleyip görünürlüğü açtığında burada listelenir; detaydan seçtiğiniz güne talep iletebilirsiniz.
                </p>
            </div>

            <form onSubmit={submitSearch} className="mb-6 flex flex-wrap gap-2">
                <div className="relative min-w-[200px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                    <input
                        type="search"
                        name="search"
                        placeholder="Sanatçı adı ara…"
                        className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                        value={searchForm.data.search}
                        onChange={(e) => searchForm.setData('search', e.target.value)}
                    />
                </div>
                <button
                    type="submit"
                    disabled={searchForm.processing}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-amber-400 disabled:opacity-50"
                >
                    Ara
                </button>
            </form>

            {artists.data.length === 0 ? (
                <p className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                    Şu an kriterlere uyan sanatçı yok. Sanatçılar müsait gün ekleyip görünürlüğü açtıkça burada görünecek.
                </p>
            ) : (
                <ul className="space-y-3">
                    {artists.data.map((a) => (
                        <li key={a.id}>
                            <Link
                                href={route('artist.management.availability.show', a.slug)}
                                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-amber-500/40 hover:bg-amber-500/5 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-amber-500/30"
                            >
                                <span className="font-medium text-zinc-900 dark:text-white">{a.name}</span>
                                <span className="shrink-0 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                                    {a.upcoming_slots_count} müsait gün
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {artists.last_page > 1 && (
                <nav className="mt-8 flex flex-wrap justify-center gap-1" aria-label="Sayfalama">
                    {artists.links.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url ?? '#'}
                            className={`rounded-lg px-3 py-1.5 text-sm ${
                                link.active
                                    ? 'bg-amber-500 font-medium text-zinc-900'
                                    : link.url
                                      ? 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800'
                                      : 'pointer-events-none text-zinc-400'
                            }`}
                            preserveState
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </nav>
            )}
        </ArtistLayout>
    );
}
