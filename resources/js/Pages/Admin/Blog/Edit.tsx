import InputError from '@/Components/InputError';
import { inputBaseClass } from '@/Components/ui/Input';
import { cn } from '@/lib/cn';
import AdminLayout from '@/Layouts/AdminLayout';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import { Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Post {
    id: number;
    title: string;
    excerpt?: string | null;
    content: string;
    cover_image?: string | null;
    status: 'draft' | 'published';
}

interface Props {
    post: Post;
}

export default function AdminBlogEdit({ post }: Readonly<Props>) {
    const { data, setData, put, processing, errors } = useForm({
        title: post.title,
        excerpt: post.excerpt ?? '',
        content: post.content,
        cover_image: post.cover_image ?? '',
        status: post.status,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.blog.update', post.id));
    };

    const field = cn('mt-1', inputBaseClass);
    const lbl = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300';

    return (
        <AdminLayout>
            <SeoHead title="Blog yazısını düzenle | Admin" description="Blog içeriğini güncelleyin." noindex />
            <div className="space-y-6">
                <div className="mb-6 flex flex-wrap items-center gap-4">
                    <Link
                        href={route('admin.blog.index')}
                        className="text-sm text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        ← Blog listesine dön
                    </Link>
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Blog yazısını düzenle</h1>

                <form
                    onSubmit={submit}
                    className="mt-8 max-w-3xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
                >
                    <div>
                        <label htmlFor="title" className={lbl}>
                            Başlık
                        </label>
                        <input
                            id="title"
                            className={field}
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            required
                        />
                        <InputError message={errors.title} className="mt-1" />
                    </div>
                    <div>
                        <label htmlFor="cover_image" className={lbl}>
                            Kapak görseli URL
                        </label>
                        <input
                            id="cover_image"
                            className={field}
                            value={data.cover_image}
                            onChange={(e) => setData('cover_image', e.target.value)}
                        />
                        <InputError message={errors.cover_image} className="mt-1" />
                    </div>
                    <div>
                        <span className={lbl}>Özet</span>
                        <p className="mt-0.5 text-xs text-zinc-500">Liste görünümünde düz metin önizlemesi gösterilir.</p>
                        <RichTextEditor
                            value={data.excerpt}
                            onChange={(html) => setData('excerpt', html)}
                            placeholder="Kısa özet…"
                            className="mt-2"
                        />
                        <InputError message={errors.excerpt} className="mt-1" />
                    </div>
                    <div>
                        <span className={lbl}>İçerik</span>
                        <RichTextEditor
                            value={data.content}
                            onChange={(html) => setData('content', html)}
                            placeholder="Blog yazısı…"
                            className="mt-2"
                        />
                        <InputError message={errors.content} className="mt-1" />
                    </div>
                    <div>
                        <label htmlFor="status" className={lbl}>
                            Durum
                        </label>
                        <select
                            id="status"
                            className={field}
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value as 'draft' | 'published')}
                        >
                            <option value="draft">Taslak</option>
                            <option value="published">Yayınla</option>
                        </select>
                        <InputError message={errors.status} className="mt-1" />
                    </div>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                        >
                            Güncelle
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
