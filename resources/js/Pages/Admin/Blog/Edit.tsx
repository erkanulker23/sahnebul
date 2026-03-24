import AdminLayout from '@/Layouts/AdminLayout';
import InputError from '@/Components/InputError';
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

    return (
        <AdminLayout>
            <SeoHead title="Blog yazısını düzenle | Admin" description="Blog içeriğini güncelleyin." noindex />
            <div className="space-y-6">
                <div className="mb-6 flex flex-wrap items-center gap-4">
                    <Link href={route('admin.blog.index')} className="text-sm text-amber-400 hover:text-amber-300">
                        ← Blog listesine dön
                    </Link>
                </div>
                <h1 className="text-2xl font-bold text-white">Blog yazısını düzenle</h1>

                <form onSubmit={submit} className="mt-8 max-w-3xl space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-zinc-300">
                            Başlık
                        </label>
                        <input
                            id="title"
                            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            required
                        />
                        <InputError message={errors.title} className="mt-1" />
                    </div>
                    <div>
                        <label htmlFor="cover_image" className="block text-sm font-medium text-zinc-300">
                            Kapak görseli URL
                        </label>
                        <input
                            id="cover_image"
                            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            value={data.cover_image}
                            onChange={(e) => setData('cover_image', e.target.value)}
                        />
                        <InputError message={errors.cover_image} className="mt-1" />
                    </div>
                    <div>
                        <span className="block text-sm font-medium text-zinc-300">Özet</span>
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
                        <span className="block text-sm font-medium text-zinc-300">İçerik</span>
                        <RichTextEditor
                            value={data.content}
                            onChange={(html) => setData('content', html)}
                            placeholder="Blog yazısı…"
                            className="mt-2"
                        />
                        <InputError message={errors.content} className="mt-1" />
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-zinc-300">
                            Durum
                        </label>
                        <select
                            id="status"
                            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
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
