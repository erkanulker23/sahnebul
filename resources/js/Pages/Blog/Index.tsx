import { AdSlot } from '@/Components/AdSlot';
import SeoHead from '@/Components/SeoHead';
import { stripHtmlToText } from '@/utils/seo';
import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';
import { ArrowRight, ArrowUpRight, BookOpen, Calendar } from 'lucide-react';

interface Post {
    id: number;
    title: string;
    slug: string;
    excerpt?: string | null;
    cover_image?: string | null;
    published_at: string;
    author?: { name: string } | null;
}

interface PaginatorLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Props {
    posts: {
        data: Post[];
        links?: PaginatorLink[];
        last_page?: number;
        current_page?: number;
    };
}

function formatBlogDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return '';
    }
}

function PostMeta({ post, className = '' }: Readonly<{ post: Post; className?: string }>) {
    return (
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${className}`}>
            <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <Calendar className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                <time dateTime={post.published_at}>{formatBlogDate(post.published_at)}</time>
            </span>
            {post.author?.name ? (
                <>
                    <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
                        ·
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">{post.author.name}</span>
                </>
            ) : null}
        </div>
    );
}

function resolveGridPosts(data: Post[], featured: Post | null): Post[] {
    if (featured === null) {
        return data;
    }
    return data.length > 1 ? data.slice(1) : [];
}

export default function BlogIndex({ posts }: Readonly<Props>) {
    const currentPage = posts.current_page ?? 1;
    const showFeatured = currentPage === 1 && posts.data.length > 0;
    const featured: Post | null = showFeatured ? posts.data[0] : null;
    const gridPosts = resolveGridPosts(posts.data, featured);

    const hasPagination = (posts.links?.length ?? 0) > 3;

    return (
        <AppLayout>
            <SeoHead
                title="Blog - Sahnebul"
                description="Etkinlik dünyası, mekanlar ve sanatçılar hakkında güncel yazılar. Sahnebul blog."
                type="website"
            />

            {/* Üst görsel alan */}
            <section className="relative overflow-hidden border-b border-zinc-200/80 bg-gradient-to-br from-amber-50 via-white to-zinc-50 dark:border-zinc-800/80 dark:from-amber-950/40 dark:via-zinc-950 dark:to-zinc-900">
                <div
                    className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl dark:bg-amber-500/10"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-amber-600/10 blur-3xl dark:bg-amber-600/5"
                    aria-hidden
                />
                <div className="relative mx-auto max-w-[1600px] px-3 py-12 sm:px-5 sm:py-20 lg:px-8 lg:py-24">
                    <div className="max-w-3xl">
                        <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800 backdrop-blur-sm dark:border-amber-500/25 dark:bg-zinc-900/60 dark:text-amber-300">
                            <BookOpen className="h-3.5 w-3.5" aria-hidden />
                            Blog
                        </p>
                        <h1 className="font-display mt-5 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl lg:text-6xl">
                            Hikâyeler, ipuçları ve{' '}
                            <span className="bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent dark:from-amber-400 dark:to-amber-300">
                                sahne notları
                            </span>
                        </h1>
                        <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                            Mekan kültürü, etkinlik rehberleri ve sanatçı dünyasından seçilmiş yazılar — okuması kolay, paylaşılası içerikler.
                        </p>
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-[1600px] px-0 py-8 sm:px-4 sm:py-12 lg:px-8 lg:py-14">
                <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
                    <div className="lg:col-span-8">
                        {posts.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-20 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
                                <BookOpen className="h-12 w-12 text-zinc-300 dark:text-zinc-600" aria-hidden />
                                <p className="mt-4 font-display text-lg font-semibold text-zinc-800 dark:text-zinc-200">Henüz yayınlanmış yazı yok</p>
                                <p className="mt-2 max-w-sm text-sm text-zinc-500">Yeni içerikler eklendiğinde burada görünecek.</p>
                            </div>
                        ) : (
                            <>
                                {featured ? (
                                    <Link
                                        href={route('blog.show', featured.slug)}
                                        className="group relative mb-12 block overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/[0.03] transition hover:-translate-y-0.5 hover:shadow-xl hover:ring-amber-500/15 dark:border-white/10 dark:bg-zinc-900/50 dark:ring-white/[0.04] dark:hover:ring-amber-500/20"
                                    >
                                        <div className="grid md:grid-cols-2">
                                            <div className="relative aspect-[4/3] min-h-[220px] overflow-hidden md:aspect-auto md:min-h-[320px]">
                                                {featured.cover_image ? (
                                                    <img
                                                        src={featured.cover_image}
                                                        alt=""
                                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-zinc-100 dark:from-amber-950/50 dark:to-zinc-900">
                                                        <BookOpen className="h-16 w-16 text-amber-300/80 dark:text-amber-700/40" aria-hidden />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80 md:hidden" aria-hidden />
                                            </div>
                                            <div className="flex flex-col justify-center p-6 sm:p-8 md:p-10">
                                                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Öne çıkan</span>
                                                <h2 className="font-display mt-3 text-2xl font-bold leading-tight text-zinc-900 transition group-hover:text-amber-800 dark:text-white dark:group-hover:text-amber-300 sm:text-3xl">
                                                    {featured.title}
                                                </h2>
                                                {featured.excerpt?.trim() ? (
                                                    <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                                        {stripHtmlToText(featured.excerpt)}
                                                    </p>
                                                ) : null}
                                                <PostMeta post={featured} className="mt-6" />
                                                <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                                                    Okumaya devam et
                                                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ) : null}

                                {gridPosts.length > 0 ? (
                                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:gap-8">
                                        {gridPosts.map((post) => (
                                            <li key={post.id}>
                                                <Link
                                                    href={route('blog.show', post.slug)}
                                                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm transition hover:-translate-y-1 hover:border-amber-200/80 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900/40 dark:hover:border-amber-500/25 dark:hover:shadow-amber-950/20"
                                                >
                                                    <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100 dark:bg-zinc-800/50">
                                                        {post.cover_image ? (
                                                            <img
                                                                src={post.cover_image}
                                                                alt=""
                                                                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900">
                                                                <BookOpen className="h-10 w-10 text-zinc-300 dark:text-zinc-600" aria-hidden />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                                                        <PostMeta post={post} className="mb-3" />
                                                        <h2 className="font-display text-lg font-bold leading-snug text-zinc-900 transition group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-300">
                                                            {post.title}
                                                        </h2>
                                                        {post.excerpt?.trim() ? (
                                                            <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                                                {stripHtmlToText(post.excerpt)}
                                                            </p>
                                                        ) : (
                                                            <div className="flex-1" />
                                                        )}
                                                        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                                                            Devamını oku
                                                            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                                                        </span>
                                                    </div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}

                                {hasPagination ? (
                                    <nav className="mt-12 flex flex-wrap gap-2 border-t border-zinc-200 pt-10 dark:border-zinc-800" aria-label="Sayfalar">
                                        {(posts.links ?? []).map((link) => {
                                            const label = link.label
                                                .replace('&laquo; Previous', 'Önceki')
                                                .replace('Next &raquo;', 'Sonraki');
                                            const linkKey = link.url ?? `disabled:${link.label}`;
                                            if (!link.url) {
                                                return (
                                                    <span
                                                        key={linkKey}
                                                        className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-400 dark:border-white/10 dark:text-zinc-600"
                                                        dangerouslySetInnerHTML={{ __html: label }}
                                                    />
                                                );
                                            }
                                            return (
                                                <Link
                                                    key={linkKey}
                                                    href={link.url}
                                                    preserveState
                                                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                                                        link.active
                                                            ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
                                                            : 'border-zinc-200 text-zinc-700 hover:border-amber-300 hover:bg-amber-50/50 dark:border-white/10 dark:text-zinc-300 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/5'
                                                    }`}
                                                    dangerouslySetInnerHTML={{ __html: label }}
                                                />
                                            );
                                        })}
                                    </nav>
                                ) : null}
                            </>
                        )}
                    </div>

                    <aside className="lg:col-span-4">
                        <div className="space-y-8 lg:sticky lg:top-28">
                            <div className="rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-zinc-50 to-white p-1 dark:border-white/10 dark:from-zinc-900/80 dark:to-zinc-950/80">
                                <div className="rounded-xl bg-white/80 p-5 dark:bg-zinc-900/60">
                                    <p className="font-display text-sm font-semibold text-zinc-900 dark:text-white">Bülten & güncellemeler</p>
                                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                        Yeni yazılar ve etkinlik önerileri için bizi sosyal hesaplardan takip edebilirsiniz.
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/50 p-4 dark:border-white/10 dark:bg-zinc-900/30">
                                <AdSlot slotKey="blog_sidebar" variant="sidebar" />
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}
