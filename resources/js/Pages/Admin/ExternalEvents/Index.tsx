import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { router, useForm } from '@inertiajs/react';
import { FormEvent, useMemo, useState } from 'react';

interface ExternalEventItem {
    id: number;
    source: string;
    title: string;
    external_url: string | null;
    venue_name: string | null;
    city_name: string | null;
    category_name: string | null;
    start_date: string | null;
    synced_event_id: number | null;
    meta?: { rejected?: boolean } | null;
}

interface Props {
    items: { data: ExternalEventItem[] };
    filters: { source: string; status: 'all' | 'pending' | 'synced' | 'rejected'; search: string };
    sources: string[];
}

const selectClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white';

function itemStatus(item: ExternalEventItem): { label: string; className: string } {
    const isRejected = item.meta?.rejected === true;
    if (item.synced_event_id) {
        return { label: 'Aktarıldı', className: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400' };
    }
    if (isRejected) {
        return { label: 'Reddedildi', className: 'bg-red-500/15 text-red-800 dark:text-red-400' };
    }
    return { label: 'Bekliyor', className: 'bg-amber-500/15 text-amber-800 dark:text-amber-400' };
}

export default function AdminExternalEventsIndex({ items, filters, sources }: Readonly<Props>) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const queryForm = useForm({
        source: filters.source ?? '',
        status: filters.status ?? 'pending',
        search: filters.search ?? '',
    });
    const crawlForm = useForm({
        source: 'all',
        limit: 200,
    });

    const allVisibleIds = useMemo(() => items.data.map((i) => i.id), [items.data]);
    const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));

    const submitFilters = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        router.get(route('admin.external-events.index'), queryForm.data, { preserveState: true });
    };

    const toggleSelectAll = () => {
        setSelectedIds(allSelected ? [] : allVisibleIds);
    };

    const toggleId = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const runBulk = (action: 'sync' | 'reject') => {
        if (selectedIds.length === 0) return;
        router.post(route('admin.external-events.bulk'), { action, ids: selectedIds }, { preserveScroll: true });
    };

    const runCrawl = () => {
        crawlForm.post(route('admin.external-events.crawl'), { preserveScroll: true });
    };

    const rowActions = (item: ExternalEventItem) => {
        const isRejected = item.meta?.rejected === true;
        return (
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => router.post(route('admin.external-events.sync', item.id))}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                    disabled={!!item.synced_event_id}
                >
                    Aktar
                </button>
                <button
                    type="button"
                    onClick={() => router.post(route('admin.external-events.reject', item.id))}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-40"
                    disabled={isRejected}
                >
                    Reddet
                </button>
            </div>
        );
    };

    return (
        <AdminLayout>
            <SeoHead title="Crawl Adayları" description="Harici etkinlik adayları." noindex />
            <div className="space-y-6">
                <AdminPageHeader
                    title="Crawl aday etkinlikler"
                    description="Biletinial/Biletix kaynaklarından gelen kayıtları inceleyip sisteme taslak olarak aktarın."
                    actions={
                        <>
                            <button
                                type="button"
                                onClick={() => runBulk('sync')}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                                disabled={selectedIds.length === 0}
                            >
                                Seçilileri aktar
                            </button>
                            <button
                                type="button"
                                onClick={() => runBulk('reject')}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40"
                                disabled={selectedIds.length === 0}
                            >
                                Seçilileri reddet
                            </button>
                        </>
                    }
                />

                <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Harici sitelerden veri çek</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Bilet sitelerinden aday etkinlikleri veritabanına alır. İşlem birkaç dakika sürebilir; bittikten sonra aşağıdaki liste güncellenir.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Kaynak
                            <select
                                value={crawlForm.data.source}
                                onChange={(e) => crawlForm.setData('source', e.target.value)}
                                className={selectClass}
                                disabled={crawlForm.processing}
                            >
                                <option value="all">Tüm kaynaklar</option>
                                {sources.map((source) => (
                                    <option key={source} value={source}>
                                        {source}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex w-full max-w-[8rem] flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Kayıt limiti
                            <input
                                type="number"
                                min={1}
                                max={500}
                                value={crawlForm.data.limit}
                                onChange={(e) => crawlForm.setData('limit', Number(e.target.value) || 1)}
                                className={selectClass}
                                disabled={crawlForm.processing}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={runCrawl}
                            disabled={crawlForm.processing || sources.length === 0}
                            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-400"
                        >
                            {crawlForm.processing ? 'Çekiliyor…' : 'Verileri çek'}
                        </button>
                    </div>
                </div>

                <form onSubmit={submitFilters} className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:grid-cols-2 lg:grid-cols-4">
                    <select
                        value={queryForm.data.source}
                        onChange={(e) => queryForm.setData('source', e.target.value)}
                        className={selectClass}
                    >
                        <option value="">Tüm kaynaklar</option>
                        {sources.map((source) => (
                            <option key={source} value={source}>
                                {source}
                            </option>
                        ))}
                    </select>
                    <select
                        value={queryForm.data.status}
                        onChange={(e) => queryForm.setData('status', e.target.value as Props['filters']['status'])}
                        className={selectClass}
                    >
                        <option value="pending">Bekleyen</option>
                        <option value="synced">Aktarılan</option>
                        <option value="rejected">Reddedilen</option>
                        <option value="all">Tümü</option>
                    </select>
                    <input
                        value={queryForm.data.search}
                        onChange={(e) => queryForm.setData('search', e.target.value)}
                        placeholder="Başlık, mekan veya şehir…"
                        className={`${selectClass} lg:col-span-1`}
                    />
                    <button
                        type="submit"
                        className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 sm:col-span-2 lg:col-span-1"
                    >
                        Filtrele
                    </button>
                </form>

                <div className="hidden md:block">
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-800">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                            <thead className="bg-zinc-100/90 dark:bg-zinc-900/90">
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                    <th className="px-4 py-3">
                                        <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Tümünü seç" />
                                    </th>
                                    <th className="px-4 py-3">Başlık</th>
                                    <th className="px-4 py-3">Kaynak</th>
                                    <th className="px-4 py-3">Mekan / şehir</th>
                                    <th className="px-4 py-3">Tarih</th>
                                    <th className="px-4 py-3">Durum</th>
                                    <th className="px-4 py-3 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900/30">
                                {items.data.map((item) => {
                                    const st = itemStatus(item);
                                    return (
                                        <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => toggleId(item.id)}
                                                    aria-label={`Seç: ${item.title}`}
                                                />
                                            </td>
                                            <td className="max-w-xs px-4 py-3">
                                                <p className="font-medium text-zinc-900 dark:text-white">{item.title}</p>
                                                {item.external_url && (
                                                    <a
                                                        href={item.external_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-amber-600 hover:underline dark:text-amber-400"
                                                    >
                                                        Kaynağı aç
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 uppercase text-zinc-600 dark:text-zinc-400">{item.source}</td>
                                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                                {item.venue_name ?? 'Çeşitli mekanlar'} / {item.city_name ?? '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                                {item.start_date ? new Date(item.start_date).toLocaleString('tr-TR') : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}>{st.label}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex flex-wrap justify-end gap-2">{rowActions(item)}</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <ul className="space-y-3 md:hidden" role="list">
                    {items.data.map((item) => {
                        const st = itemStatus(item);
                        return (
                            <li
                                key={item.id}
                                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
                            >
                                <div className="flex gap-3">
                                    <input
                                        type="checkbox"
                                        className="mt-1 h-4 w-4 shrink-0"
                                        checked={selectedIds.includes(item.id)}
                                        onChange={() => toggleId(item.id)}
                                        aria-label={`Seç: ${item.title}`}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-zinc-900 dark:text-white">{item.title}</p>
                                        <p className="mt-1 text-xs uppercase text-zinc-500">{item.source}</p>
                                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            {item.venue_name ?? 'Çeşitli mekanlar'} · {item.city_name ?? '—'}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-500">
                                            {item.start_date ? new Date(item.start_date).toLocaleString('tr-TR') : '—'}
                                        </p>
                                        {item.external_url && (
                                            <a
                                                href={item.external_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-2 inline-block text-xs font-medium text-amber-600 dark:text-amber-400"
                                            >
                                                Kaynağı aç
                                            </a>
                                        )}
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}>{st.label}</span>
                                        </div>
                                        <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">{rowActions(item)}</div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </AdminLayout>
    );
}
