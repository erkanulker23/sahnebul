import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { Link } from '@inertiajs/react';

interface ItemRow {
    id: number;
    path: string;
    created_at: string;
    artist: {
        id: number;
        name: string;
        slug: string;
        user: { id: number; name: string; email: string } | null;
    };
}

interface Props {
    items: {
        data: ItemRow[];
        links: { url: string | null; label: string; active: boolean }[];
    };
}

export default function AdminArtistGalleryModerationIndex({ items }: Readonly<Props>) {
    return (
        <AdminLayout>
            <SeoHead title="Sanatçı galeri onayları - Admin" description="Onaysız sanatçı profillerinden gelen galeri yüklemeleri." noindex />

            <div className="space-y-6">
                <AdminPageHeader
                    title="Sanatçı galeri onayları"
                    description="Profili henüz onaylanmamış sanatçıların yüklediği görseller burada listelenir. Onaylanan sanatçılar galeriye doğrudan ekler (moderasyon gerekmez)."
                />

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {items.data.length === 0 ? (
                        <p className="col-span-full text-center text-zinc-500">Bekleyen görsel yok.</p>
                    ) : (
                        items.data.map((item) => (
                            <article
                                key={item.id}
                                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                            >
                                <div className="aspect-video bg-zinc-100 dark:bg-zinc-800">
                                    <img src={`/storage/${item.path}`} alt="" className="h-full w-full object-cover" />
                                </div>
                                <div className="space-y-2 p-4 text-sm">
                                    <p className="font-semibold text-zinc-900 dark:text-white">
                                        <Link href={route('admin.artists.edit', item.artist.id)} className="text-amber-700 hover:underline dark:text-amber-400">
                                            {item.artist.name}
                                        </Link>
                                    </p>
                                    {item.artist.user ? (
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                            {item.artist.user.name} — {item.artist.user.email}
                                        </p>
                                    ) : null}
                                    <p className="text-xs text-zinc-500">{formatTurkishDateTime(item.created_at, { withTime: true })}</p>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <Link
                                            href={route('admin.artist-gallery-moderation.approve', item.id)}
                                            method="post"
                                            as="button"
                                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                                        >
                                            Onayla
                                        </Link>
                                        <Link
                                            href={route('admin.artist-gallery-moderation.reject', item.id)}
                                            method="post"
                                            as="button"
                                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                                        >
                                            Reddet ve sil
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>

                {items.links.length > 3 ? (
                    <div className="flex flex-wrap gap-2">
                        {items.links.map((l, i) =>
                            l.url ? (
                                <Link
                                    key={i}
                                    href={l.url}
                                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                                        l.active
                                            ? 'border-amber-500 bg-amber-500/10 font-medium text-amber-900 dark:text-amber-200'
                                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                    }`}
                                    preserveState
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ) : (
                                <span
                                    key={i}
                                    className="rounded-lg border border-transparent px-3 py-1.5 text-sm text-zinc-400"
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ),
                        )}
                    </div>
                ) : null}
            </div>
        </AdminLayout>
    );
}
