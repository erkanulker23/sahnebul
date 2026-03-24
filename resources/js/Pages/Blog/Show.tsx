import SeoHead, { metaDescriptionFromContent } from '@/Components/SeoHead';
import { RichOrPlainContent } from '@/Components/SafeRichContent';
import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';

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
}

interface Props {
    post: Post;
    related: Related[];
}

export default function BlogShow({ post, related }: Readonly<Props>) {
    const desc = metaDescriptionFromContent(post.content, `${post.title} — Sahnebul blog.`);

    return (
        <AppLayout>
            <SeoHead title={post.title} description={desc} image={post.cover_image ?? null} type="article" />
            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                <Link href={route('blog.index')} className="text-sm text-amber-500">← Blog</Link>
                <h1 className="mt-4 text-4xl font-bold">{post.title}</h1>
                <p className="mt-2 text-sm text-zinc-500">
                    {new Date(post.published_at).toLocaleDateString('tr-TR')} {post.author?.name ? `• ${post.author.name}` : ''}
                </p>
                {post.cover_image && <img src={post.cover_image} alt={post.title} className="mt-6 max-h-[420px] w-full rounded-2xl object-cover" />}
                <article className="mt-8 max-w-none text-zinc-800 dark:text-zinc-100">
                    <RichOrPlainContent
                        content={post.content}
                        plainParagraphClassName="whitespace-pre-line text-zinc-700 dark:text-zinc-300"
                    />
                </article>

                {related.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-xl font-bold">Diğer Yazılar</h2>
                        <div className="mt-3 space-y-2">
                            {related.map((item) => (
                                <Link key={item.id} href={route('blog.show', item.slug)} className="block text-amber-500 hover:underline">
                                    {item.title}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
