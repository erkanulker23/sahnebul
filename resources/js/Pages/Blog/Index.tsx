import { AdSlot } from '@/Components/AdSlot';
import SeoHead from '@/Components/SeoHead';
import { stripHtmlToText } from '@/utils/seo';
import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';

interface Post {
    id: number;
    title: string;
    slug: string;
    excerpt?: string | null;
    cover_image?: string | null;
    published_at: string;
    author?: { name: string } | null;
}

interface Props {
    posts: { data: Post[] };
}

export default function BlogIndex({ posts }: Readonly<Props>) {
    return (
        <AppLayout>
            <SeoHead
                title="Blog - Sahnebul"
                description="Etkinlik dünyası, mekanlar ve sanatçılar hakkında güncel yazılar. Sahnebul blog."
                type="website"
            />
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold">Blog</h1>
                <p className="mt-2 text-zinc-500">Mekan, etkinlik ve sanatçı dünyasından içerikler.</p>

                <div className="mt-8 grid gap-8 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                        <div className="grid gap-6 sm:grid-cols-2">
                            {posts.data.map((post) => (
                                <Link
                                    key={post.id}
                                    href={route('blog.show', post.slug)}
                                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:shadow-lg dark:border-white/10 dark:bg-zinc-900/40"
                                >
                                    {post.cover_image && <img src={post.cover_image} alt={post.title} className="h-48 w-full object-cover" />}
                                    <div className="p-5">
                                        <h2 className="text-lg font-bold">{post.title}</h2>
                                        {post.excerpt?.trim() && (
                                            <p className="mt-2 line-clamp-3 text-sm text-zinc-500">{stripHtmlToText(post.excerpt)}</p>
                                        )}
                                        <p className="mt-4 text-xs text-zinc-400">
                                            {new Date(post.published_at).toLocaleDateString('tr-TR')} {post.author?.name ? `• ${post.author.name}` : ''}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                    <aside className="lg:col-span-4">
                        <div className="lg:sticky lg:top-24">
                            <AdSlot slotKey="blog_sidebar" variant="sidebar" />
                        </div>
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}
