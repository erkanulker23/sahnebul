import {
    AdminDataTable,
    AdminPageHeader,
    AdminPaginationBar,
    type AdminColumn,
    type AdminPaginatorPayload,
} from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

interface BlogPost {
    id: number;
    title: string;
    excerpt?: string | null;
    content: string;
    cover_image?: string | null;
    status: 'draft' | 'published';
}

interface Props {
    posts: AdminPaginatorPayload & { data: BlogPost[] };
    filters?: { search?: string };
}

const searchInputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white';

export default function AdminBlogIndex({ posts, filters }: Readonly<Props>) {
    const [search, setSearch] = useState(filters?.search ?? '');

    const columns: AdminColumn<BlogPost>[] = useMemo(
        () => [
            {
                key: 'title',
                header: 'Başlık',
                mobileLabel: 'Başlık',
                cell: (p) => <span className="font-medium text-zinc-900 dark:text-white">{p.title}</span>,
            },
            {
                key: 'status',
                header: 'Durum',
                mobileLabel: 'Durum',
                cell: (p) => (
                    <span
                        className={
                            p.status === 'published'
                                ? 'font-medium text-emerald-600 dark:text-emerald-400'
                                : 'font-medium text-zinc-500 dark:text-zinc-400'
                        }
                    >
                        {p.status === 'published' ? 'Yayında' : 'Taslak'}
                    </span>
                ),
            },
        ],
        [],
    );

    return (
        <AdminLayout>
            <SeoHead title="Blog Yönetimi" description="Blog yazılarını yönetin." noindex />

            <div className="space-y-6">
                <AdminPageHeader
                    title="Blog Yönetimi"
                    description="Yazıları düzenleyin veya yayın durumunu yönetin."
                    actions={
                        <Link
                            href={route('admin.blog.create')}
                            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400"
                        >
                            + Yeni yazı
                        </Link>
                    }
                />

                <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-4">
                    <label htmlFor="blog-search" className="sr-only">
                        Yazı ara
                    </label>
                    <input
                        id="blog-search"
                        className={searchInputClass}
                        placeholder="Yazı ara… Enter ile filtrele"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                router.get(route('admin.blog.index'), { search }, { preserveState: true });
                            }
                        }}
                    />
                </div>

                <AdminPaginationBar paginator={posts} noun="yazı" showLinks={false} />

                <AdminDataTable
                    columns={columns}
                    rows={posts.data}
                    getRowKey={(p) => p.id}
                    actions={(p) => (
                        <>
                            <Link href={route('admin.blog.edit', p.id)} className="text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400">
                                Düzenle
                            </Link>
                            <button
                                type="button"
                                className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                                onClick={() => {
                                    if (confirm('Bu yazıyı silmek istediğinize emin misiniz?')) {
                                        router.delete(route('admin.blog.destroy', p.id));
                                    }
                                }}
                            >
                                Sil
                            </button>
                        </>
                    )}
                />

                <AdminPaginationBar paginator={posts} noun="yazı" showSummary={false} className="pt-2" />
            </div>
        </AdminLayout>
    );
}
