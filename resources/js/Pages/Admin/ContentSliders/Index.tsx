import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { Link, router } from '@inertiajs/react';

interface SliderRow {
    id: number;
    placement: string;
    title: string;
    subtitle: string | null;
    link_url: string | null;
    hero_headline: string | null;
    image_path: string;
    sort_order: number;
    is_active: boolean;
}

interface Props {
    sliders: SliderRow[];
}

export default function AdminContentSlidersIndex({ sliders }: Readonly<Props>) {
    return (
        <AdminLayout>
            <SeoHead title="Slider yönetimi | Admin" description="Ana sayfa hero ve öne çıkan şerit." noindex />
            <div className="space-y-6">
                <AdminPageHeader
                    title="Slider ekle / düzenle"
                    description="Ana sayfa hero: üst tam genişlik (en fazla 3). Öne çıkanlar: hero altı yatay kartlar. /mekanlar hero metinleri Ayarlar → Mekân listesi hero."
                    actions={
                        <Link
                            href={route('admin.content-sliders.create')}
                            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400"
                        >
                            + Yeni slider
                        </Link>
                    }
                />
                {sliders.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-400">
                        Henüz kayıt yok. «Yeni slider» ile ana sayfa hero veya öne çıkan kart ekleyin.
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {sliders.map((s) => (
                            <li
                                key={s.id}
                                className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
                            >
                                <img
                                    src={`/storage/${s.image_path}`}
                                    alt=""
                                    className="h-16 w-28 rounded-lg object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                    <span
                                        className={
                                            s.placement === 'home_hero'
                                                ? 'inline-block rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'
                                                : 'inline-block rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'
                                        }
                                    >
                                        {s.placement === 'home_hero' ? 'Ana sayfa hero' : 'Öne çıkan'}
                                    </span>
                                    <p className="mt-1 font-semibold text-zinc-900 dark:text-white">{s.title}</p>
                                    {s.placement === 'home_hero' && s.hero_headline ? (
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.hero_headline}</p>
                                    ) : null}
                                    {s.placement !== 'home_hero' && s.subtitle ? (
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.subtitle}</p>
                                    ) : null}
                                    <p className="mt-1 text-xs text-zinc-500">
                                        Sıra: {s.sort_order} · {s.is_active ? 'Aktif' : 'Pasif'}
                                        {s.placement !== 'home_hero' && s.link_url ? ` · ${s.link_url}` : ''}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        href={route('admin.content-sliders.edit', s.id)}
                                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                    >
                                        Düzenle
                                    </Link>
                                    <button
                                        type="button"
                                        className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                        onClick={() => {
                                            if (confirm('Bu slider silinsin mi?')) {
                                                router.delete(route('admin.content-sliders.destroy', s.id));
                                            }
                                        }}
                                    >
                                        Sil
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </AdminLayout>
    );
}
