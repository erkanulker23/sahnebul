import FlashMessage from '@/Components/FlashMessage';
import InputError from '@/Components/InputError';
import SeoHead from '@/Components/SeoHead';
import AdminLayout from '@/Layouts/AdminLayout';
import { safeRoute } from '@/lib/safeRoute';
import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface ExternalEventEditPayload {
    id: number;
    source: string;
    title: string;
    external_url: string | null;
    image_url: string | null;
    venue_name: string | null;
    city_name: string | null;
    category_name: string | null;
    start_date: string;
    description: string | null;
    synced_event_id: number | null;
}

interface Props {
    externalEvent: ExternalEventEditPayload;
}

const fieldClass =
    'mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white';

export default function AdminExternalEventEdit({ externalEvent }: Readonly<Props>) {
    const form = useForm({
        title: externalEvent.title,
        venue_name: externalEvent.venue_name ?? '',
        city_name: externalEvent.city_name ?? '',
        category_name: externalEvent.category_name ?? '',
        start_date: externalEvent.start_date,
        description: externalEvent.description ?? '',
        external_url: externalEvent.external_url ?? '',
        image_url: externalEvent.image_url ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put(safeRoute('admin.external-events.update', { externalEvent: externalEvent.id }));
    };

    return (
        <AdminLayout>
            <SeoHead title="Dış kaynak adayı düzenle" description="Harici kaynak etkinlik adayını düzenleyin." noindex />
            <FlashMessage />

            <div className="mx-auto max-w-3xl space-y-6">
                <div>
                    <Link
                        href={safeRoute('admin.external-events.index')}
                        className="text-sm font-medium text-sky-700 underline underline-offset-2 hover:text-sky-600 dark:text-sky-400"
                    >
                        ← Dış kaynak aday etkinlikler
                    </Link>
                    <h1 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">Dış kaynak adayını düzenle</h1>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Kaynak: <span className="font-mono font-semibold uppercase text-zinc-800 dark:text-zinc-200">{externalEvent.source}</span>
                        {externalEvent.synced_event_id ? (
                            <span className="ml-2 text-amber-700 dark:text-amber-400">· Platforma aktarılmış (taslak veya yayında olabilir)</span>
                        ) : null}
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
                    <div>
                        <label htmlFor="ext-title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Başlık
                        </label>
                        <input id="ext-title" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} className={fieldClass} required />
                        <InputError message={form.errors.title} className="mt-1" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="ext-venue" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Mekân adı
                            </label>
                            <input
                                id="ext-venue"
                                value={form.data.venue_name}
                                onChange={(e) => form.setData('venue_name', e.target.value)}
                                className={fieldClass}
                            />
                            <InputError message={form.errors.venue_name} className="mt-1" />
                        </div>
                        <div>
                            <label htmlFor="ext-city" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Şehir
                            </label>
                            <input
                                id="ext-city"
                                value={form.data.city_name}
                                onChange={(e) => form.setData('city_name', e.target.value)}
                                className={fieldClass}
                            />
                            <InputError message={form.errors.city_name} className="mt-1" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="ext-cat" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Kategori / tür metni
                        </label>
                        <input
                            id="ext-cat"
                            value={form.data.category_name}
                            onChange={(e) => form.setData('category_name', e.target.value)}
                            className={fieldClass}
                            placeholder="Örn. Müzik, Tiyatro"
                        />
                        <InputError message={form.errors.category_name} className="mt-1" />
                    </div>

                    <div>
                        <label htmlFor="ext-start" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Başlangıç tarihi ve saati
                        </label>
                        <input
                            id="ext-start"
                            type="datetime-local"
                            value={form.data.start_date}
                            onChange={(e) => form.setData('start_date', e.target.value)}
                            className={fieldClass}
                        />
                        <InputError message={form.errors.start_date} className="mt-1" />
                    </div>

                    <div>
                        <label htmlFor="ext-url" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Kaynak URL
                        </label>
                        <input
                            id="ext-url"
                            type="text"
                            inputMode="url"
                            autoComplete="off"
                            value={form.data.external_url}
                            onChange={(e) => form.setData('external_url', e.target.value)}
                            className={fieldClass}
                            placeholder="https://…"
                        />
                        <InputError message={form.errors.external_url} className="mt-1" />
                    </div>

                    <div>
                        <label htmlFor="ext-img" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Görsel URL
                        </label>
                        <input
                            id="ext-img"
                            type="text"
                            inputMode="url"
                            autoComplete="off"
                            value={form.data.image_url}
                            onChange={(e) => form.setData('image_url', e.target.value)}
                            className={fieldClass}
                            placeholder="https://… veya /storage/…"
                        />
                        <InputError message={form.errors.image_url} className="mt-1" />
                    </div>

                    <div>
                        <label htmlFor="ext-desc" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Açıklama
                        </label>
                        <textarea
                            id="ext-desc"
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            rows={6}
                            className={`${fieldClass} font-mono text-xs sm:text-sm`}
                        />
                        <InputError message={form.errors.description} className="mt-1" />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                        >
                            {form.processing ? 'Kaydediliyor…' : 'Kaydet'}
                        </button>
                        <Link
                            href={safeRoute('admin.external-events.index')}
                            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            İptal
                        </Link>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
