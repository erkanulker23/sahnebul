import SeoHead from '@/Components/SeoHead';
import ArtistLayout from '@/Layouts/ArtistLayout';
import ManagementArtistProposalModal from '@/Pages/Artist/Management/ManagementArtistProposalModal';
import { Link, router, useForm } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface RosterRow {
    id: number;
    name: string;
    slug: string;
    status: string;
}

interface CatalogRow {
    id: number;
    name: string;
    slug: string;
}

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
}

interface Props {
    roster: Paginated<RosterRow>;
    catalog: Paginated<CatalogRow>;
    filters: { catalog_search: string };
}

function statusTr(status: string): string {
    if (status === 'pending') return 'Onay bekliyor';
    if (status === 'approved') return 'Yayında';
    if (status === 'rejected') return 'Reddedildi';
    return status;
}

function PaginationNav({ paginated, label }: Readonly<{ paginated: Paginated<unknown>; label: string }>) {
    if (paginated.last_page <= 1) return null;
    return (
        <nav className="mt-6 flex flex-wrap justify-center gap-1" aria-label={label}>
            {paginated.links.map((link, i) => (
                <Link
                    key={i}
                    href={link.url ?? '#'}
                    preserveState
                    className={`rounded-lg px-3 py-1.5 text-sm ${
                        link.active
                            ? 'bg-amber-500 font-medium text-zinc-900'
                            : link.url
                              ? 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800'
                              : 'pointer-events-none text-zinc-400'
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </nav>
    );
}

export default function ManagementArtistsIndex({ roster, catalog, filters }: Readonly<Props>) {
    const [proposalArtist, setProposalArtist] = useState<RosterRow | null>(null);
    const createForm = useForm({ name: '', bio: '' });
    const catalogSearchForm = useForm({ catalog_search: filters.catalog_search ?? '' });

    const submitCreate = (e: FormEvent) => {
        e.preventDefault();
        createForm.post(route('artist.management.artists.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.reset(),
        });
    };

    const submitCatalogSearch = (e: FormEvent) => {
        e.preventDefault();
        catalogSearchForm.get(route('artist.management.artists.index'), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <ArtistLayout>
            <SeoHead
                title="Sanatçı kadrosu - Sahnebul"
                description="Management: sanatçı kaydı ve kadro yönetimi; düzenlemeler site yönetimi onayından geçer."
                noindex
            />

            <ManagementArtistProposalModal
                key={proposalArtist?.slug ?? 'closed'}
                open={proposalArtist !== null}
                onClose={() => setProposalArtist(null)}
                artist={proposalArtist}
            />

            <div className="mb-8">
                <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Sanatçı kadrosu</h1>
                <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                    Yeni sanatçı kaydı oluşturabilir veya sitede kayıtlı, henüz Management hesabına atanmamış{' '}
                    <strong className="font-medium text-zinc-800 dark:text-zinc-200">onaylı</strong> sanatçıları kadronuza ekleyebilirsiniz.
                    Kadrodaki profil düzenlemeleri <strong className="font-medium text-zinc-800 dark:text-zinc-200">düzenleme önerisi</strong> olarak site
                    yönetimine gider; yayınlanan içerik onay sonrası güncellenir.
                </p>
            </div>

            <section className="mb-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-6">
                <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Yeni sanatçı kaydı</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    İsim benzersiz olmalıdır. Kayıt <span className="font-medium">onay bekleyen</span> durumda oluşur; yayın ve detaylar site yönetiminde
                    tamamlanır.
                </p>
                <form onSubmit={submitCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label htmlFor="org-artist-name" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Sanatçı adı *
                        </label>
                        <input
                            id="org-artist-name"
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                            required
                            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                        />
                        {createForm.errors.name && <p className="mt-1 text-xs text-red-600">{createForm.errors.name}</p>}
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="org-artist-bio" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Biyografi (isteğe bağlı)
                        </label>
                        <textarea
                            id="org-artist-bio"
                            value={createForm.data.bio}
                            onChange={(e) => createForm.setData('bio', e.target.value)}
                            rows={3}
                            maxLength={8000}
                            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                        />
                        {createForm.errors.bio && <p className="mt-1 text-xs text-red-600">{createForm.errors.bio}</p>}
                    </div>
                    <div>
                        <button
                            type="submit"
                            disabled={createForm.processing}
                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400 disabled:opacity-50"
                        >
                            {createForm.processing ? 'Kaydediliyor…' : 'Kayıt oluştur'}
                        </button>
                    </div>
                </form>
            </section>

            <section className="mb-10">
                <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Kadrom</h2>
                {roster.data.length === 0 ? (
                    <p className="mt-3 rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                        Henüz kayıt yok. Yukarıdan yeni sanatçı ekleyin veya aşağıdan katalogdan seçin.
                    </p>
                ) : (
                    <ul className="mt-4 space-y-2">
                        {roster.data.map((a) => (
                            <li
                                key={a.id}
                                className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="font-medium text-zinc-900 dark:text-white">{a.name}</p>
                                    <p className="text-xs text-zinc-500">
                                        <span
                                            className={`me-2 inline-flex rounded-md px-2 py-0.5 font-medium ${
                                                a.status === 'approved'
                                                    ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                                                    : a.status === 'pending'
                                                      ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200'
                                                      : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                                            }`}
                                        >
                                            {statusTr(a.status)}
                                        </span>
                                        {a.status === 'approved' ? (
                                            <Link href={route('artists.show', a.slug)} className="text-amber-600 hover:underline dark:text-amber-400">
                                                Sitede görüntüle
                                            </Link>
                                        ) : null}
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setProposalArtist(a)}
                                        className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-500/25 dark:text-amber-200"
                                    >
                                        Düzenleme önerisi
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (
                                                !confirm(
                                                    'Bu sanatçıyı kadronuzdan çıkarmak istediğinize emin misiniz? (Onaylı profiller sitede kalır; yalnızca Management bağlantısı kalkar.)',
                                                )
                                            ) {
                                                return;
                                            }
                                            router.post(route('artist.management.artists.detach', a.slug), {}, { preserveScroll: true });
                                        }}
                                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    >
                                        Kadrodan çıkar
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                <PaginationNav paginated={roster} label="Kadro sayfaları" />
            </section>

            <section>
                <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Katalogdan kadroya ekle</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Henüz Management hesabına atanmamış, onaylı sanatçılar. Eklediğinizde profilde Management bilginiz görünür.
                </p>

                <form onSubmit={submitCatalogSearch} className="mt-4 mb-4 flex flex-wrap gap-2">
                    <div className="relative min-w-[200px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                        <input
                            type="search"
                            placeholder="İsim ara…"
                            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                            value={catalogSearchForm.data.catalog_search}
                            onChange={(e) => catalogSearchForm.setData('catalog_search', e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={catalogSearchForm.processing}
                        className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                    >
                        Ara
                    </button>
                </form>

                {catalog.data.length === 0 ? (
                    <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                        Kriterlere uyan atanmamış sanatçı yok. Aramayı değiştirin veya yeni kayıt oluşturun.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {catalog.data.map((a) => (
                            <li
                                key={a.id}
                                className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900/50"
                            >
                                <div>
                                    <p className="font-medium text-zinc-900 dark:text-white">{a.name}</p>
                                    <Link href={route('artists.show', a.slug)} className="text-xs text-amber-600 hover:underline dark:text-amber-400">
                                        Profili aç
                                    </Link>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.post(route('artist.management.artists.attach', a.slug), {}, { preserveScroll: true })
                                    }
                                    className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-amber-400"
                                >
                                    Kadroya ekle
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <PaginationNav paginated={catalog} label="Katalog sayfaları" />
            </section>
        </ArtistLayout>
    );
}
