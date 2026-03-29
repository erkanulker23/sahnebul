import SeoHead, { metaDescriptionFromContent } from '@/Components/SeoHead';
import { isLikelyRichHtml, RichOrPlainContent } from '@/Components/SafeRichContent';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import AppLayout from '@/Layouts/AppLayout';
import { Link, usePage } from '@inertiajs/react';
import { EditorialShareStrip } from '@/Components/EditorialShareStrip';
import { ArrowLeft, ArrowRight, Calendar, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

interface Post {
    id: number;
    title: string;
    content: string;
    cover_image?: string | null;
    published_at: string;
    author?: { name: string } | null;
}

interface Related {
    id: number;
    title: string;
    slug: string;
    cover_image?: string | null;
    published_at?: string;
}

interface TocItem {
    id: string;
    text: string;
    level: 2 | 3;
}

interface Props {
    post: Post;
    related: Related[];
}

function useBlogTableOfContents(articleRef: RefObject<HTMLElement | null>, content: string): TocItem[] {
    const [items, setItems] = useState<TocItem[]>([]);

    useEffect(() => {
        if (!isLikelyRichHtml(content)) {
            setItems([]);
            return;
        }
        const root = articleRef.current;
        if (!root) {
            return;
        }

        const headings = root.querySelectorAll('h2, h3');
        const next: TocItem[] = [];
        headings.forEach((el, i) => {
            const text = el.textContent?.trim() ?? '';
            if (text === '') {
                return;
            }
            let id = el.id;
            if (!id) {
                id = `blog-bolum-${i}`;
                el.id = id;
            }
            next.push({
                id,
                text,
                level: el.tagName === 'H2' ? 2 : 3,
            });
        });
        setItems(next);
    }, [content, articleRef]);

    return items;
}

const articleProseClass =
    'prose prose-lg prose-zinc max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:scroll-mt-28 prose-a:text-amber-600 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-amber-400 prose-p:leading-[1.75] prose-p:my-4 first:prose-p:mt-0 last:prose-p:mb-0 prose-li:my-1 prose-ul:my-4 prose-ol:my-4 prose-blockquote:my-6 prose-blockquote:border-l-amber-500 prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-l-4 prose-h2:border-amber-500 prose-h2:pl-4 prose-h2:text-zinc-900 dark:prose-h2:text-white prose-h3:mt-8 prose-h3:mb-3 prose-h3:pl-3 prose-h3:border-l-2 prose-h3:border-amber-500/60 prose-img:my-8 prose-img:rounded-xl prose-table:text-sm prose-th:bg-zinc-100 dark:prose-th:bg-zinc-800/80 prose-hr:my-10';

export default function BlogShow({ post, related }: Readonly<Props>) {
    const page = usePage().props as { seo?: { siteName?: string; appUrl?: string } };
    const siteName = page.seo?.siteName?.trim() || 'Sahnebul';
    const articleRef = useRef<HTMLDivElement>(null);
    const tocItems = useBlogTableOfContents(articleRef, post.content);

    const desc = metaDescriptionFromContent(post.content, `${post.title} — Sahnebul blog.`);
    const publishedIso =
        post.published_at && !Number.isNaN(Date.parse(post.published_at))
            ? new Date(post.published_at).toISOString()
            : null;

    const byline = post.author?.name?.trim() ? post.author.name : siteName;
    const metaLine = `${byline} · ${formatTurkishDateTime(post.published_at)}`;

    const sharePageUrl = useMemo(() => {
        if (typeof window === 'undefined') {
            return '';
        }
        return window.location.href.split('#')[0];
    }, []);

    const featuredRelated = related[0];
    const moreRelated = related.slice(1);

    return (
        <AppLayout>
            <SeoHead
                title={post.title}
                description={desc}
                image={post.cover_image ?? null}
                type="article"
                articlePublishedTime={publishedIso}
            />

            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                    {/* Breadcrumb */}
                    <nav className="text-xs text-zinc-500 dark:text-zinc-400" aria-label="Sayfa konumu">
                        <ol className="flex flex-wrap items-center gap-1">
                            <li>
                                <Link href={route('home')} className="transition hover:text-amber-600 dark:hover:text-amber-400">
                                    Anasayfa
                                </Link>
                            </li>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                            <li>
                                <Link
                                    href={route('blog.index')}
                                    className="transition hover:text-amber-600 dark:hover:text-amber-400"
                                >
                                    Blog
                                </Link>
                            </li>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                            <li className="line-clamp-1 font-medium text-zinc-700 dark:text-zinc-300">{post.title}</li>
                        </ol>
                    </nav>

                    <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-12 lg:gap-10 xl:gap-14">
                        {/* Ana içerik */}
                        <article className="lg:col-span-8">
                            <header>
                                <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
                                    {post.title}
                                </h1>
                                <p className="mt-3 text-sm italic text-zinc-500 dark:text-zinc-400">{metaLine}</p>
                            </header>

                            {post.cover_image ? (
                                <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                                    <img
                                        src={post.cover_image}
                                        alt=""
                                        className="aspect-[21/9] w-full object-cover sm:aspect-[2.4/1]"
                                    />
                                </div>
                            ) : null}

                            <div className="mt-8 flex flex-col gap-8 lg:mt-10 lg:flex-row lg:gap-10">
                                <EditorialShareStrip shareUrl={sharePageUrl} shareTitle={post.title} variant="article" />

                                <div className="min-w-0 flex-1">
                                    {tocItems.length > 0 ? (
                                        <div className="mb-8 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                                İçindekiler
                                            </p>
                                            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm marker:text-zinc-400">
                                                {tocItems.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className={item.level === 3 ? 'ml-2 list-[lower-alpha] pl-1' : 'pl-1'}
                                                    >
                                                        <a
                                                            href={`#${item.id}`}
                                                            className="text-zinc-700 underline-offset-2 transition hover:text-amber-600 hover:underline dark:text-zinc-300 dark:hover:text-amber-400"
                                                        >
                                                            {item.text}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    ) : null}

                                    <div ref={articleRef} className="text-zinc-800 dark:text-zinc-100">
                                        <RichOrPlainContent
                                            content={post.content}
                                            richClassName={articleProseClass}
                                            plainParagraphClassName="whitespace-pre-line text-base leading-[1.75] text-zinc-700 dark:text-zinc-300"
                                        />
                                    </div>

                                    <div className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800 lg:hidden">
                                        <Link
                                            href={route('blog.index')}
                                            className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                            Tüm blog yazıları
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </article>

                        {/* Kenar çubuğu */}
                        <aside className="mt-14 lg:col-span-4 lg:mt-0">
                            <div className="lg:sticky lg:top-28">
                                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Önerilen yazılar</h2>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Okumaya devam etmek için seçtiklerimiz
                                </p>

                                {featuredRelated ? (
                                    <Link
                                        href={route('blog.show', featuredRelated.slug)}
                                        className="mt-6 block overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-amber-300/80 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-amber-600/40"
                                    >
                                        {featuredRelated.cover_image ? (
                                            <img
                                                src={featuredRelated.cover_image}
                                                alt=""
                                                className="aspect-[16/10] w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-amber-100 to-zinc-100 dark:from-amber-950/50 dark:to-zinc-900">
                                                <Calendar className="h-10 w-10 text-amber-600/40 dark:text-amber-500/30" />
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <p className="font-semibold leading-snug text-zinc-900 dark:text-white">
                                                {featuredRelated.title}
                                            </p>
                                            {featuredRelated.published_at ? (
                                                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                    {formatTurkishDateTime(featuredRelated.published_at)}
                                                </p>
                                            ) : null}
                                        </div>
                                    </Link>
                                ) : (
                                    <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">Henüz öneri yok.</p>
                                )}

                                {moreRelated.length > 0 ? (
                                    <ul className="mt-6 space-y-4">
                                        {moreRelated.map((item) => (
                                            <li key={item.id}>
                                                <Link
                                                    href={route('blog.show', item.slug)}
                                                    className="group flex gap-3 rounded-lg p-1 transition hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80"
                                                >
                                                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800">
                                                        {item.cover_image ? (
                                                            <img
                                                                src={item.cover_image}
                                                                alt=""
                                                                className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center">
                                                                <Calendar className="h-6 w-6 text-zinc-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-900 group-hover:text-amber-700 dark:text-zinc-100 dark:group-hover:text-amber-400">
                                                            {item.title}
                                                        </p>
                                                    </div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}

                                <Link
                                    href={route('events.index')}
                                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-zinc-950 shadow-md transition hover:bg-amber-400 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-400"
                                >
                                    Etkinlikleri keşfet
                                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                                </Link>

                                <Link
                                    href={route('blog.index')}
                                    className="mt-3 block text-center text-sm text-zinc-500 transition hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400"
                                >
                                    ← Blog ana sayfası
                                </Link>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
