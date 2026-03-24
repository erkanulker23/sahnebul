import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface Category {
    id: number;
    name: string;
    slug: string;
    order: number;
    venues_count: number;
}

interface Props {
    categories: Category[];
}

const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white';

export default function AdminCategoriesIndex({ categories }: Readonly<Props>) {
    const [editing, setEditing] = useState<number | null>(null);
    const [newName, setNewName] = useState('');
    const [newOrder, setNewOrder] = useState(0);

    const handleStore = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            route('admin.categories.store'),
            { name: newName, order: newOrder },
            {
                onSuccess: () => {
                    setNewName('');
                    setNewOrder(0);
                },
            },
        );
    };

    const handleUpdate = (e: React.FormEvent<HTMLFormElement>, id: number, order: number) => {
        e.preventDefault();
        const form = e.currentTarget;
        const name = (form.querySelector('input[name="name"]') as HTMLInputElement)?.value;
        if (name) {
            router.put(route('admin.categories.update', id), { name, order });
            setEditing(null);
        }
    };

    const handleDelete = (cat: Category) => {
        if (cat.venues_count > 0) {
            alert('Bu kategoride sahne var, önce sahneleri taşıyın.');
            return;
        }
        if (confirm('Silmek istediğinize emin misiniz?')) router.delete(route('admin.categories.destroy', cat.id));
    };

    const rowActions = (cat: Category) => (
        <>
            {editing === cat.id ? (
                <button type="button" onClick={() => setEditing(null)} className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400">
                    İptal
                </button>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={() => setEditing(cat.id)}
                        className="text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
                    >
                        Düzenle
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                    >
                        Sil
                    </button>
                </>
            )}
        </>
    );

    return (
        <AdminLayout>
            <SeoHead title="Kategoriler - Admin | Sahnebul" description="Etkinlik kategorilerini yönetin." noindex />

            <div className="space-y-6">
                <AdminPageHeader title="Kategori Yönetimi" description="Mekan kategorilerini sıralayın ve düzenleyin." />

                <form onSubmit={handleStore} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="min-w-0 flex-1 sm:max-w-[min(100%,20rem)]">
                        <label htmlFor="cat-name" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Yeni kategori
                        </label>
                        <input
                            id="cat-name"
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Kategori adı"
                            required
                            className={inputClass}
                        />
                    </div>
                    <div className="w-full sm:w-24">
                        <label htmlFor="cat-order" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Sıra
                        </label>
                        <input
                            id="cat-order"
                            type="number"
                            value={newOrder}
                            onChange={(e) => setNewOrder(parseInt(e.target.value, 10) || 0)}
                            placeholder="0"
                            className={inputClass}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 sm:w-auto"
                    >
                        Ekle
                    </button>
                </form>

                <div className="hidden md:block">
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-800">
                        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                            <thead className="bg-zinc-100/90 dark:bg-zinc-900/90">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Ad</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Slug</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Sıra</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Sahne</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900/30">
                                {categories.map((cat) => (
                                    <tr key={cat.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                                        <td className="px-4 py-3 text-sm">
                                            {editing === cat.id ? (
                                                <form onSubmit={(e) => handleUpdate(e, cat.id, cat.order)} className="flex flex-wrap items-center gap-2">
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        defaultValue={cat.name}
                                                        className="min-w-[8rem] rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                                                        autoFocus
                                                    />
                                                    <button type="submit" className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                                        Kaydet
                                                    </button>
                                                </form>
                                            ) : (
                                                <span className="font-medium text-zinc-900 dark:text-white">{cat.name}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-500">
                                            {cat.slug}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{cat.order}</td>
                                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{cat.venues_count}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex flex-wrap items-center justify-end gap-2">{rowActions(cat)}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <ul className="space-y-3 md:hidden" role="list">
                    {categories.map((cat) => (
                        <li
                            key={cat.id}
                            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
                        >
                            {editing === cat.id ? (
                                <form onSubmit={(e) => handleUpdate(e, cat.id, cat.order)} className="space-y-3">
                                    <input
                                        type="text"
                                        name="name"
                                        defaultValue={cat.name}
                                        className={inputClass}
                                        autoFocus
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        <button type="submit" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                                            Kaydet
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditing(null)}
                                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
                                        >
                                            İptal
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <p className="font-semibold text-zinc-900 dark:text-white">{cat.name}</p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {cat.slug} · sıra {cat.order} · {cat.venues_count} sahne
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">{rowActions(cat)}</div>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </AdminLayout>
    );
}
