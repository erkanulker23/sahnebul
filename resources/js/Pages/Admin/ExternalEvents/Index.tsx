import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import { sanitizeHtmlForInnerHtml } from '@/Components/SafeRichContent';
import SeoHead from '@/Components/SeoHead';
import { Link, router, useForm } from '@inertiajs/react';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Eye, X } from 'lucide-react';

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
    image_url?: string | null;
    description?: string | null;
    meta?: { rejected?: boolean } | null;
}

interface CrawlLookupItem {
    id: number;
    name: string;
}

interface PreviewRow {
    source: string;
    title: string;
    venue_name: string;
    city_name: string;
    category_name: string;
    start_date: string;
    performers: string;
    external_url: string;
    image_url: string;
}

interface PreviewPayload {
    sample: PreviewRow[];
    stats: { raw_total: number; after_filter: number; shown: number };
    errors: string[];
}

type PaginationLink = { url: string | null; label: string; active: boolean };

interface Props {
    items: {
        data: ExternalEventItem[];
        links?: PaginationLink[];
        current_page?: number;
        last_page?: number;
        from?: number | null;
        to?: number | null;
        total?: number;
    };
    filters: { source: string; status: 'all' | 'pending' | 'synced' | 'rejected'; search: string; artist: string };
    sources: string[];
    crawlLookups?: { cities: CrawlLookupItem[]; categories: CrawlLookupItem[] };
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

export default function AdminExternalEventsIndex({ items, filters, sources, crawlLookups }: Readonly<Props>) {
    const cities = crawlLookups?.cities ?? [];
    const categories = crawlLookups?.categories ?? [];

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [crawlBusy, setCrawlBusy] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewPayload | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [detailItem, setDetailItem] = useState<ExternalEventItem | null>(null);

    const queryForm = useForm({
        source: filters.source ?? '',
        status: filters.status ?? 'pending',
        artist: filters.artist ?? '',
        search: filters.search ?? '',
    });
    const crawlForm = useForm({
        source: sources.includes('biletinial') ? 'biletinial' : sources.length > 0 ? sources[0]! : 'all',
        limit: 200,
        date_from: '' as string,
        date_to: '' as string,
        city_ids: [] as number[],
        category_ids: [] as number[],
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

    const runBulk = (action: 'sync' | 'reject' | 'destroy') => {
        if (selectedIds.length === 0) return;
        if (action === 'destroy') {
            const ok = window.confirm(
                'Seçili aday kayıtlar kalıcı olarak silinsin mi? Veritabanından kaldırılırlar; geri alınamaz.',
            );
            if (!ok) return;
        }
        router.post(route('admin.external-events.bulk'), { action, ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    const crawlPayload = useCallback(() => {
        return {
            source: crawlForm.data.source,
            limit: crawlForm.data.limit,
            date_from: crawlForm.data.date_from || null,
            date_to: crawlForm.data.date_to || null,
            city_ids: crawlForm.data.city_ids,
            category_ids: crawlForm.data.category_ids,
        };
    }, [crawlForm.data]);

    const runCrawl = () => {
        setCrawlBusy(true);
        router.post(route('admin.external-events.crawl'), crawlPayload(), {
            preserveScroll: true,
            onFinish: () => setCrawlBusy(false),
        });
    };

    const runPreview = async () => {
        setPreviewLoading(true);
        setPreviewError(null);
        setPreviewData(null);
        try {
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const res = await fetch(route('admin.external-events.crawl-preview'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': token,
                },
                credentials: 'same-origin',
                body: JSON.stringify(crawlPayload()),
            });
            const json = (await res.json()) as PreviewPayload & { message?: string; errors?: Record<string, string[]> };
            if (!res.ok) {
                const msg =
                    json.message ??
                    (json.errors ? Object.values(json.errors).flat().join(' ') : `İstek başarısız (${res.status})`);
                setPreviewError(msg);
                setPreviewOpen(true);
                return;
            }
            setPreviewData(json);
            setPreviewOpen(true);
        } catch (e) {
            setPreviewError(e instanceof Error ? e.message : 'Önizleme alınamadı.');
            setPreviewOpen(true);
        } finally {
            setPreviewLoading(false);
        }
    };

    const rowActionClass = {
        preview:
            'inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
        sync: 'inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40',
        reject: 'inline-flex shrink-0 items-center justify-center rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-40',
    };

    const rowActions = (item: ExternalEventItem) => {
        const isRejected = item.meta?.rejected === true;
        return (
            <div className="flex flex-nowrap items-center justify-end gap-1.5">
                <button type="button" className={rowActionClass.preview} onClick={() => setDetailItem(item)}>
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    Önizle
                </button>
                <button
                    type="button"
                    onClick={() => router.post(route('admin.external-events.sync', item.id))}
                    className={rowActionClass.sync}
                    disabled={!!item.synced_event_id}
                >
                    Aktar
                </button>
                <button
                    type="button"
                    onClick={() => router.post(route('admin.external-events.reject', item.id))}
                    className={rowActionClass.reject}
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
                    description="Biletinial müzik listesi ve diğer kaynaklardan gelen adayları inceleyin; aktarınca etkinlik taslak, mekan ve sanatçılar otomatik eşleştirilir veya oluşturulur."
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
                            <button
                                type="button"
                                onClick={() => runBulk('destroy')}
                                className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/50 disabled:opacity-40 dark:border-red-900/60"
                                disabled={selectedIds.length === 0}
                            >
                                Seçilileri sil
                            </button>
                        </>
                    }
                />

                <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Harici sitelerden veri çek</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Tarih aralığı, şehir ve kategori filtreleri isteğe bağlıdır (seçilmezse tümü). Önce önizleyip nasıl görüneceğini kontrol edin; &quot;Verileri çek&quot; adayları
                        veritabanına yazar. İşlem uzun sürebilir.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Kaynak
                            <select
                                value={crawlForm.data.source}
                                onChange={(e) => crawlForm.setData('source', e.target.value)}
                                className={selectClass}
                                disabled={previewLoading || crawlBusy}
                            >
                                <option value="all">Tüm kaynaklar</option>
                                {sources.map((source) => (
                                    <option key={source} value={source}>
                                        {source}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Başlangıç tarihi
                            <input
                                type="date"
                                value={crawlForm.data.date_from}
                                onChange={(e) => crawlForm.setData('date_from', e.target.value)}
                                className={selectClass}
                                disabled={previewLoading || crawlBusy}
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Bitiş tarihi
                            <input
                                type="date"
                                value={crawlForm.data.date_to}
                                onChange={(e) => crawlForm.setData('date_to', e.target.value)}
                                className={selectClass}
                                disabled={previewLoading || crawlBusy}
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Kayıt limiti (filtre sonrası)
                            <input
                                type="number"
                                min={1}
                                max={500}
                                value={crawlForm.data.limit}
                                onChange={(e) => crawlForm.setData('limit', Number(e.target.value) || 1)}
                                className={selectClass}
                                disabled={previewLoading || crawlBusy}
                            />
                        </label>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <div className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            <div className="flex items-center justify-between gap-2">
                                <span>Şehirler (Ctrl/Cmd ile çoklu)</span>
                                {crawlForm.data.city_ids.length > 0 && (
                                    <button
                                        type="button"
                                        className="text-amber-700 hover:underline dark:text-amber-400"
                                        onClick={() => crawlForm.setData('city_ids', [])}
                                    >
                                        Temizle
                                    </button>
                                )}
                            </div>
                            <select
                                multiple
                                size={6}
                                value={crawlForm.data.city_ids.map(String)}
                                onChange={(e) => {
                                    const v = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                                    crawlForm.setData('city_ids', v);
                                }}
                                className={`${selectClass} min-h-[9rem] py-2`}
                                disabled={previewLoading || crawlBusy || cities.length === 0}
                            >
                                {cities.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            {cities.length === 0 && (
                                <span className="text-[11px] font-normal text-zinc-500">Şehir listesi boş (migration / şehir kayıtları).</span>
                            )}
                        </div>
                        <div className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            <div className="flex items-center justify-between gap-2">
                                <span>Kategoriler (çoklu)</span>
                                {crawlForm.data.category_ids.length > 0 && (
                                    <button
                                        type="button"
                                        className="text-amber-700 hover:underline dark:text-amber-400"
                                        onClick={() => crawlForm.setData('category_ids', [])}
                                    >
                                        Temizle
                                    </button>
                                )}
                            </div>
                            <select
                                multiple
                                size={6}
                                value={crawlForm.data.category_ids.map(String)}
                                onChange={(e) => {
                                    const v = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                                    crawlForm.setData('category_ids', v);
                                }}
                                className={`${selectClass} min-h-[9rem] py-2`}
                                disabled={previewLoading || crawlBusy || categories.length === 0}
                            >
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            {categories.length === 0 && (
                                <span className="text-[11px] font-normal text-zinc-500">Kategori listesi boş.</span>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={runPreview}
                            disabled={previewLoading || crawlBusy || sources.length === 0}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-400 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                        >
                            <Eye className="h-4 w-4" aria-hidden />
                            {previewLoading ? 'Önizleniyor…' : 'Önizle'}
                        </button>
                        <button
                            type="button"
                            onClick={runCrawl}
                            disabled={previewLoading || crawlBusy || sources.length === 0}
                            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-400"
                        >
                            {crawlBusy ? 'Çekiliyor…' : 'Verileri çek'}
                        </button>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            Varsayılan kaynak Biletinial; yalnızca bu siteden çekmek için üstteki &quot;Kaynak&quot; menüsünde{' '}
                            <strong className="font-medium text-zinc-700 dark:text-zinc-300">biletinial</strong> kalsın.
                        </span>
                    </div>
                </div>

                {previewOpen && (
                    <div
                        className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-4 sm:items-center"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="crawl-preview-title"
                    >
                        <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
                                <h3 id="crawl-preview-title" className="text-base font-semibold text-zinc-900 dark:text-white">
                                    Çekilecek veri önizlemesi
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setPreviewOpen(false)}
                                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    aria-label="Kapat"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="max-h-[calc(90vh-8rem)] overflow-y-auto p-4">
                                {previewError && (
                                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                                        {previewError}
                                    </p>
                                )}
                                {previewData && (
                                    <>
                                        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                                            Kaynakta <strong>{previewData.stats.raw_total}</strong> satır, filtre sonrası{' '}
                                            <strong>{previewData.stats.after_filter}</strong> satır; aşağıda ilk{' '}
                                            <strong>{previewData.stats.shown}</strong> örnek (sistemde taslak etkinlik olarak benzer şekilde listelenir).
                                        </p>
                                        {previewData.errors.length > 0 && (
                                            <ul className="mb-3 list-inside list-disc text-sm text-amber-800 dark:text-amber-200">
                                                {previewData.errors.map((err) => (
                                                    <li key={err}>{err}</li>
                                                ))}
                                            </ul>
                                        )}
                                        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                                            <table className="min-w-full text-left text-xs sm:text-sm">
                                                <thead className="bg-zinc-100 dark:bg-zinc-800/80">
                                                    <tr className="text-zinc-600 dark:text-zinc-400">
                                                        <th className="px-2 py-2 font-semibold">Başlık</th>
                                                        <th className="px-2 py-2 font-semibold">Mekan</th>
                                                        <th className="px-2 py-2 font-semibold">Şehir</th>
                                                        <th className="px-2 py-2 font-semibold">Kategori</th>
                                                        <th className="px-2 py-2 font-semibold">Tarih</th>
                                                        <th className="px-2 py-2 font-semibold">Sanatçı</th>
                                                        <th className="px-2 py-2 font-semibold">Kaynak</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                                    {previewData.sample.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="px-2 py-6 text-center text-zinc-500">
                                                                Filtreye uyan kayıt yok. Tarih aralığını veya şehir seçimini kontrol edin.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        previewData.sample.map((row, idx) => (
                                                            <tr key={`${row.external_url}-${row.start_date}-${idx}`} className="text-zinc-800 dark:text-zinc-200">
                                                                <td className="max-w-[10rem] px-2 py-2 font-medium">
                                                                    {row.external_url ? (
                                                                        <a
                                                                            href={row.external_url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-amber-700 hover:underline dark:text-amber-400"
                                                                        >
                                                                            {row.title}
                                                                        </a>
                                                                    ) : (
                                                                        row.title
                                                                    )}
                                                                </td>
                                                                <td className="max-w-[8rem] px-2 py-2">{row.venue_name}</td>
                                                                <td className="whitespace-nowrap px-2 py-2">{row.city_name}</td>
                                                                <td className="px-2 py-2">{row.category_name}</td>
                                                                <td className="whitespace-nowrap px-2 py-2">{formatTurkishDateTime(row.start_date)}</td>
                                                                <td className="max-w-[8rem] px-2 py-2">{row.performers || '—'}</td>
                                                                <td className="whitespace-nowrap px-2 py-2 uppercase">{row.source}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {detailItem && (
                    <div
                        className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-4 sm:items-center"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="row-detail-title"
                    >
                        <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
                                <h3 id="row-detail-title" className="text-base font-semibold text-zinc-900 dark:text-white">
                                    Aday önizleme
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setDetailItem(null)}
                                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    aria-label="Kapat"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="max-h-[calc(90vh-5rem)] space-y-3 overflow-y-auto p-4">
                                {detailItem.image_url ? (
                                    <img
                                        src={detailItem.image_url}
                                        alt=""
                                        className="max-h-40 w-full rounded-lg object-cover object-center"
                                    />
                                ) : null}
                                <p className="font-semibold text-zinc-900 dark:text-white">{detailItem.title}</p>
                                <p className="text-xs uppercase tracking-wide text-zinc-500">{detailItem.source}</p>
                                <dl className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                                    <div>
                                        <dt className="font-medium text-zinc-500 dark:text-zinc-400">Mekan / şehir</dt>
                                        <dd>
                                            {detailItem.venue_name ?? '—'} / {detailItem.city_name ?? '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-zinc-500 dark:text-zinc-400">Tarih</dt>
                                        <dd>{formatTurkishDateTime(detailItem.start_date)}</dd>
                                    </div>
                                    {detailItem.category_name ? (
                                        <div>
                                            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Kategori</dt>
                                            <dd>{detailItem.category_name}</dd>
                                        </div>
                                    ) : null}
                                </dl>
                                {detailItem.description ? (
                                    <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">{detailItem.description}</p>
                                ) : null}
                                {detailItem.external_url ? (
                                    <a
                                        href={detailItem.external_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex text-sm font-medium text-amber-600 hover:underline dark:text-amber-400"
                                    >
                                        Kaynak sayfasını aç
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}

                <form
                    onSubmit={submitFilters}
                    className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:grid-cols-2 lg:grid-cols-6"
                >
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
                        aria-label="Durum"
                    >
                        <option value="pending">Bekleyen</option>
                        <option value="synced">Aktarılan</option>
                        <option value="rejected">Reddedilen</option>
                        <option value="all">Tümü</option>
                    </select>
                    <input
                        value={queryForm.data.artist}
                        onChange={(e) => queryForm.setData('artist', e.target.value)}
                        placeholder="Sanatçı (kaynak performer)…"
                        className={selectClass}
                        aria-label="Sanatçıya göre filtrele"
                    />
                    <input
                        value={queryForm.data.search}
                        onChange={(e) => queryForm.setData('search', e.target.value)}
                        placeholder="Başlık, mekan veya şehir…"
                        className={`${selectClass} sm:col-span-2 lg:col-span-2`}
                    />
                    <button
                        type="submit"
                        className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 sm:col-span-2 lg:col-span-1"
                    >
                        Filtrele
                    </button>
                </form>

                {typeof items.total === 'number' && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Toplam{' '}
                        <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                            {items.total.toLocaleString('tr-TR')}
                        </span>{' '}
                        kayıt
                        {items.from != null && items.to != null && items.total > 0 && (
                            <>
                                {' '}
                                · bu sayfada{' '}
                                <span className="tabular-nums">
                                    {items.from.toLocaleString('tr-TR')}–{items.to.toLocaleString('tr-TR')}
                                </span>
                            </>
                        )}
                        {typeof items.last_page === 'number' && items.last_page > 1 && (
                            <>
                                {' '}
                                · sayfa {items.current_page ?? '—'} / {items.last_page}
                            </>
                        )}
                    </p>
                )}

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
                                    <th className="whitespace-nowrap px-4 py-3 text-right">İşlemler</th>
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
                                                {formatTurkishDateTime(item.start_date)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}>{st.label}</span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right align-middle">
                                                {rowActions(item)}
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
                                        <p className="mt-1 text-xs text-zinc-500">{formatTurkishDateTime(item.start_date)}</p>
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
                                        <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800 overflow-x-auto">
                                            {rowActions(item)}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                {Array.isArray(items.links) && items.links.length > 0 && (items.last_page ?? 0) > 1 && (
                    <div className="flex flex-wrap gap-2">
                        {items.links.map((link, idx) => {
                            const label = link.label
                                .replace('&laquo; Previous', 'Önceki')
                                .replace('Next &raquo;', 'Sonraki');
                            if (!link.url) {
                                return (
                                    <span
                                        key={`${label}-${idx}`}
                                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-600"
                                    >
                                        <span dangerouslySetInnerHTML={{ __html: sanitizeHtmlForInnerHtml(label) }} />
                                    </span>
                                );
                            }

                            return (
                                <Link
                                    key={`${label}-${idx}`}
                                    href={link.url}
                                    preserveState
                                    preserveScroll
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                                        link.active
                                            ? 'border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-300'
                                            : 'border-zinc-300 bg-white text-zinc-800 hover:border-amber-400 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-300 dark:hover:border-amber-500/30'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtmlForInnerHtml(label) }}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
