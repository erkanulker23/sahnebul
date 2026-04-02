import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import { sanitizeHtmlForInnerHtml } from '@/Components/SafeRichContent';
import SeoHead from '@/Components/SeoHead';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { adminExternalEventEditPath, safeRoute } from '@/lib/safeRoute';
import type { PageProps } from '@/types';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, Loader2, Pencil, X } from 'lucide-react';

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
    /** İlk kez veri tabanına yazıldığı an */
    created_at?: string | null;
    /** «Verileri çek» bu satırı en son işlediğinde (yedek: updated_at) — etkinlik günü değil */
    last_crawled_at?: string | null;
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

export interface LastCrawlReport {
    finished_at: string;
    status: 'success' | 'warning' | 'error' | 'info';
    total_processed: number;
    rows: { source: string; processed: number; error: string | null }[];
    summary: string;
}

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
    filters: {
        source: string;
        status: 'all' | 'pending' | 'synced' | 'rejected';
        search: string;
        artist: string;
        date_from?: string;
        date_to?: string;
    };
    sources: string[];
    crawlLookups?: { cities: CrawlLookupItem[]; categories: CrawlLookupItem[] };
    lastCrawlReport?: LastCrawlReport | null;
    /** Oturum özeti silinse bile sunucuda saklanan son «Verileri çek» özeti */
    persistedLastCrawl?: Pick<LastCrawlReport, 'finished_at' | 'status' | 'total_processed' | 'summary'> | null;
    appTimezone?: string;
}

const selectClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white';

/** Yerel takvim günü (YYYY-MM-DD); çekim formu için başlangıçta doldurulur. */
function defaultCrawlDateRangeDays(spanDays: number): { date_from: string; date_to: string } {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + spanDays);
    const ymd = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    return { date_from: ymd(start), date_to: ymd(end) };
}

/** 1 Nisan (yıl) → 31 Aralık (aynı yıl); dış kaynak çekimi varsayılan penceresi. */
function defaultCrawlAprilFirstToYearEnd(): { date_from: string; date_to: string } {
    const y = new Date().getFullYear();
    return { date_from: `${y}-04-01`, date_to: `${y}-12-31` };
}

function formatAdminInstant(iso: string | null | undefined, tz: string): string {
    return formatTurkishDateTime(iso, { timeZone: tz, empty: '—' });
}

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

function persistedCrawlStatusLabel(status: string): string {
    switch (status) {
        case 'success':
            return 'Başarılı';
        case 'warning':
            return 'Kısmen (uyarı)';
        case 'error':
            return 'Hata';
        case 'info':
            return 'Bilgi';
        default:
            return status;
    }
}

type CrawlJobPollState = {
    token: string;
    state: string;
    phase: string;
    current: number;
    total: number;
    message: string;
    active_source: string | null;
    processed_total?: number;
    rows?: { source: string; processed: number; error: string | null }[];
};

function lastCrawlPanelClass(status: LastCrawlReport['status']): string {
    switch (status) {
        case 'error':
            return 'border-rose-300 bg-rose-50/90 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100';
        case 'warning':
            return 'border-amber-400 bg-amber-50/90 text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100';
        case 'success':
            return 'border-emerald-300 bg-emerald-50/90 text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-100';
        default:
            return 'border-zinc-300 bg-zinc-100/90 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-100';
    }
}

export default function AdminExternalEventsIndex({
    items,
    filters,
    sources,
    crawlLookups,
    lastCrawlReport,
    persistedLastCrawl = null,
    appTimezone = 'Europe/Istanbul',
}: Readonly<Props>) {
    const page = usePage<
        PageProps<{
            flash?: { external_crawl_job_id?: string | null };
            errors?: Record<string, string | string[]>;
        }>
    >();
    const pageErrors = page.props.errors ?? {};
    const crawlValidationMessages = useMemo(() => {
        const crawlKeys = new Set(['source', 'limit', 'date_from', 'date_to', 'city_ids', 'category_ids']);
        const out: string[] = [];
        for (const [key, val] of Object.entries(pageErrors)) {
            const crawlField =
                crawlKeys.has(key) || key.startsWith('city_ids.') || key.startsWith('category_ids.');
            if (!crawlField) {
                continue;
            }
            if (Array.isArray(val)) {
                out.push(...val.filter((m): m is string => typeof m === 'string'));
            } else if (typeof val === 'string' && val.trim() !== '') {
                out.push(val);
            }
        }
        return out;
    }, [pageErrors]);

    const cities = crawlLookups?.cities ?? [];
    const categories = crawlLookups?.categories ?? [];

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    /** true: mevcut filtreyle eşleşen tüm sayfalardaki kayıtlar toplu işleme dahil (sunucu tarafında filtre ile). */
    const [selectAllMatching, setSelectAllMatching] = useState(false);
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [crawlBusy, setCrawlBusy] = useState(false);
    const [crawlTransportError, setCrawlTransportError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<PreviewPayload | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [detailItem, setDetailItem] = useState<ExternalEventItem | null>(null);
    const [crawlJobProgress, setCrawlJobProgress] = useState<CrawlJobPollState | null>(null);

    const queryForm = useForm({
        source: filters.source ?? '',
        status: filters.status ?? 'pending',
        artist: filters.artist ?? '',
        search: filters.search ?? '',
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
    });
    const crawlDefaults = defaultCrawlAprilFirstToYearEnd();
    const crawlForm = useForm({
        source: sources.includes('bubilet') ? 'bubilet' : sources.includes('biletinial') ? 'biletinial' : sources.length > 0 ? sources[0]! : 'all',
        limit: 2000,
        date_from: crawlDefaults.date_from,
        date_to: crawlDefaults.date_to,
        city_ids: [] as number[],
        category_ids: [] as number[],
    });

    const allVisibleIds = useMemo(() => items.data.map((i) => i.id), [items.data]);
    const allPageSelected = useMemo(
        () =>
            !selectAllMatching &&
            allVisibleIds.length > 0 &&
            allVisibleIds.every((id) => selectedIds.includes(id)),
        [selectAllMatching, allVisibleIds, selectedIds],
    );
    const headerSelectChecked = selectAllMatching || allPageSelected;

    useEffect(() => {
        const el = selectAllCheckboxRef.current;
        if (!el) return;
        el.indeterminate =
            !selectAllMatching && selectedIds.length > 0 && !allPageSelected;
    }, [selectAllMatching, selectedIds, allPageSelected]);

    const submitFilters = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSelectedIds([]);
        setSelectAllMatching(false);
        router.get(safeRoute('admin.external-events.index'), queryForm.data, { preserveState: true });
    };

    const toggleSelectAll = () => {
        if (selectAllMatching) {
            setSelectAllMatching(false);
            setSelectedIds([]);
            return;
        }
        if (allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id))) {
            setSelectedIds([]);
            return;
        }
        if ((items.total ?? 0) === 0) return;
        setSelectAllMatching(true);
        setSelectedIds([]);
    };

    const clearSelection = () => {
        setSelectAllMatching(false);
        setSelectedIds([]);
    };

    const pickAllMatching = () => {
        if ((items.total ?? 0) === 0) return;
        setSelectAllMatching(true);
        setSelectedIds([]);
    };

    const toggleId = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const runBulk = (action: 'sync' | 'reject' | 'destroy') => {
        if (!selectAllMatching && selectedIds.length === 0) return;
        if (action === 'destroy') {
            const ok = window.confirm(
                selectAllMatching
                    ? 'Filtreyle eşleşen tüm aday kayıtlar kalıcı olarak silinsin mi? Veritabanından kaldırılırlar; geri alınamaz.'
                    : 'Seçili aday kayıtlar kalıcı olarak silinsin mi? Veritabanından kaldırılırlar; geri alınamaz.',
            );
            if (!ok) return;
        }
        if (selectAllMatching) {
            router.post(
                safeRoute('admin.external-events.bulk'),
                {
                    action,
                    apply_filters: true,
                    ...queryForm.data,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedIds([]);
                        setSelectAllMatching(false);
                    },
                },
            );
            return;
        }
        router.post(
            safeRoute('admin.external-events.bulk'),
            { action, apply_filters: false, ids: selectedIds },
            {
                preserveScroll: true,
                onSuccess: () => setSelectedIds([]),
            },
        );
    };

    const bulkDisabled = !selectAllMatching && selectedIds.length === 0;

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
        setCrawlTransportError(null);
        setCrawlBusy(true);
        router.post(safeRoute('admin.external-events.crawl'), crawlPayload(), {
            preserveScroll: true,
            onFinish: () => setCrawlBusy(false),
            onError: (errs) => {
                const bag = errs as Record<string, string | string[]>;
                const flat = Object.values(bag)
                    .flatMap((v) => (Array.isArray(v) ? v : [v]))
                    .filter((x): x is string => typeof x === 'string' && x.trim() !== '');
                setCrawlTransportError(
                    flat[0] ??
                        'İstek tamamlanamadı (oturum süresi, güvenlik veya çok sık deneme). Sayfayı yenileyip tekrar deneyin.',
                );
            },
        });
    };

    useEffect(() => {
        const raw = page.props.flash?.external_crawl_job_id;
        const token = typeof raw === 'string' && raw.length > 0 ? raw : null;
        if (!token) {
            setCrawlJobProgress(null);

            return;
        }

        const terminalTokenStorageKey = 'admin.externalEvents.lastTerminalCrawlToken';
        const alreadyTerminal =
            typeof window !== 'undefined' && window.sessionStorage.getItem(terminalTokenStorageKey) === token;
        if (alreadyTerminal) {
            setCrawlJobProgress(null);

            return;
        }

        let cancelled = false;
        let interval: ReturnType<typeof setInterval> | undefined;

        const poll = async (): Promise<void> => {
            try {
                const res = await fetch(safeRoute('admin.external-events.crawl-status', { token }), {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                });
                if (cancelled) {
                    return;
                }
                if (res.status === 404) {
                    setCrawlJobProgress({
                        token,
                        state: 'failed',
                        phase: 'crawl',
                        current: 0,
                        total: 1,
                        message: 'İlerleme bilgisi bulunamadı veya süresi doldu.',
                        active_source: null,
                        processed_total: 0,
                        rows: [],
                    });
                    if (interval) {
                        clearInterval(interval);
                    }

                    return;
                }
                if (!res.ok) {
                    return;
                }
                const j = (await res.json()) as Omit<CrawlJobPollState, 'token'>;
                setCrawlJobProgress({
                    token,
                    state: j.state,
                    phase: j.phase,
                    current: j.current,
                    total: Math.max(1, j.total),
                    message: j.message,
                    active_source: j.active_source,
                    processed_total: typeof j.processed_total === 'number' ? j.processed_total : 0,
                    rows: Array.isArray(j.rows) ? j.rows : [],
                });
                if (j.state === 'completed' || j.state === 'failed') {
                    if (interval) {
                        clearInterval(interval);
                    }
                    if (typeof window !== 'undefined') {
                        window.sessionStorage.setItem(terminalTokenStorageKey, token);
                    }
                    router.reload();
                }
            } catch {
                /* sonraki turda tekrar dene */
            }
        };

        void poll();
        interval = setInterval(() => void poll(), 1600);

        return () => {
            cancelled = true;
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [page.props.flash?.external_crawl_job_id]);

    const runPreview = async () => {
        setPreviewLoading(true);
        setPreviewError(null);
        setPreviewData(null);
        try {
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const res = await fetch(safeRoute('admin.external-events.crawl-preview'), {
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
        edit: 'inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-amber-400/80 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-100 dark:hover:bg-amber-500/25',
        sync: 'inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40',
        reject: 'inline-flex shrink-0 items-center justify-center rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-40',
    };

    const rowActions = (item: ExternalEventItem) => {
        const isRejected = item.meta?.rejected === true;
        return (
            <div className="flex max-w-[22rem] flex-wrap items-center justify-end gap-1.5 sm:max-w-none">
                <button type="button" className={rowActionClass.preview} onClick={() => setDetailItem(item)}>
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    Önizle
                </button>
                <Link
                    href={adminExternalEventEditPath(item.id)}
                    className={rowActionClass.edit}
                    preserveScroll
                >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Düzenle
                </Link>
                <button
                    type="button"
                    onClick={() =>
                        router.post(safeRoute('admin.external-events.sync', { externalEvent: item.id }))
                    }
                    className={rowActionClass.sync}
                    disabled={!!item.synced_event_id}
                >
                    Aktar
                </button>
                <button
                    type="button"
                    onClick={() =>
                        router.post(safeRoute('admin.external-events.reject', { externalEvent: item.id }))
                    }
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
            <SeoHead title="Dış kaynak aday etkinlikler" description="Harici kaynaklardan gelen etkinlik adayları." noindex />
            <div className="space-y-6">
                <AdminPageHeader
                    title="Dış kaynak aday etkinlikler"
                    description="Biletinial müzik listesi ve diğer kaynaklardan gelen adayları inceleyin; aktarınca etkinlik taslak, mekan ve sanatçılar otomatik eşleştirilir veya oluşturulur."
                />

                {persistedLastCrawl ? (
                    <div
                        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200"
                        role="status"
                    >
                        <span className="font-semibold text-zinc-900 dark:text-white">Son veri çekme:</span>
                        <span className="tabular-nums font-medium">{persistedLastCrawl.finished_at}</span>
                        <span className="text-zinc-500 dark:text-zinc-400">({appTimezone})</span>
                        <span className="text-zinc-600 dark:text-zinc-400">·</span>
                        <span>
                            İşlenen:{' '}
                            <strong className="tabular-nums text-zinc-900 dark:text-white">
                                {persistedLastCrawl.total_processed.toLocaleString('tr-TR')}
                            </strong>
                        </span>
                        <span className="text-zinc-600 dark:text-zinc-400">·</span>
                        <span className="rounded-md bg-white/80 px-2 py-0.5 text-xs font-semibold dark:bg-zinc-800">
                            {persistedCrawlStatusLabel(persistedLastCrawl.status)}
                        </span>
                        {lastCrawlReport ? (
                            <span className="w-full text-xs text-zinc-500 dark:text-zinc-400">
                                Bu oturumda ayrıntılı özet aşağıda da listeleniyor.
                            </span>
                        ) : (
                            <span className="w-full text-xs text-zinc-500 dark:text-zinc-400">
                                Özet kutusunu kaldırdıysanız tarih burada kalır; yeni çekimde güncellenir.
                            </span>
                        )}
                    </div>
                ) : (
                    <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-400">
                        Henüz kayıtlı bir veri çekme zamanı yok. «Verileri çek» tamamlandıktan sonra son çekim tarihi ve işlenen
                        adet burada görünür; özet kutusunu kapatsanız veya oturumu kapatıp yeniden girseniz de kalır.
                    </p>
                )}

                {lastCrawlReport ? (
                    <section
                        className={`rounded-xl border-2 p-4 shadow-sm ${lastCrawlPanelClass(lastCrawlReport.status)}`}
                        aria-label="Son veri çekme işlemi"
                    >
                        <div className="flex flex-wrap items-start gap-3">
                            {lastCrawlReport.status === 'error' ? (
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
                            ) : lastCrawlReport.status === 'warning' ? (
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
                            ) : (
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
                            )}
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                                        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
                                            Son veri çekme — {lastCrawlReport.finished_at}
                                        </h2>
                                        <span className="tabular-nums text-sm font-semibold">
                                            İşlenen toplam:{' '}
                                            <strong>{lastCrawlReport.total_processed.toLocaleString('tr-TR')}</strong>
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.post(safeRoute('admin.external-events.dismiss-last-crawl'), {}, {
                                                preserveScroll: true,
                                            })
                                        }
                                        className="shrink-0 rounded-lg border border-black/15 bg-white/80 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-white dark:border-white/20 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                        title="Özet oturumdan silinir; yeni bir veri çekince yeniden görünür."
                                    >
                                        Özeti kaldır
                                    </button>
                                </div>
                                <p className="text-sm leading-relaxed">{lastCrawlReport.summary}</p>
                                {lastCrawlReport.rows.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-black/10 bg-white/60 dark:border-white/10 dark:bg-black/20">
                                        <table className="min-w-full text-left text-xs sm:text-sm">
                                            <thead>
                                                <tr className="border-b border-black/10 text-zinc-600 dark:border-white/10 dark:text-zinc-400">
                                                    <th className="px-3 py-2 font-semibold">Kaynak</th>
                                                    <th className="px-3 py-2 font-semibold">İşlenen</th>
                                                    <th className="px-3 py-2 font-semibold">Hata</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/10">
                                                {lastCrawlReport.rows.map((r, idx) => (
                                                    <tr key={`${r.source}-${idx}`}>
                                                        <td className="px-3 py-2 font-mono uppercase">{r.source}</td>
                                                        <td className="px-3 py-2 tabular-nums">{r.processed.toLocaleString('tr-TR')}</td>
                                                        <td className="max-w-xl px-3 py-2 text-rose-800 dark:text-rose-200">
                                                            {r.error ?? '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </section>
                ) : null}

                <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Harici sitelerden veri çek</h2>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        Başlangıç ve bitiş tarihi zorunludur (en fazla 400 gün). Bubilet şehir seçimi:{' '}
                        <Link
                            href={safeRoute('admin.external-events.bubilet-cookies.index')}
                            className="font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
                        >
                            çerez / engel
                        </Link>
                        .
                    </p>
                    {crawlBusy ? (
                        <div
                            className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-100/80 px-3 py-2.5 text-sm font-medium text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100"
                            role="status"
                            aria-live="polite"
                        >
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                            İstek gönderiliyor…
                        </div>
                    ) : null}
                    {crawlJobProgress ? (
                        <div
                            className="mt-3 space-y-3 rounded-lg border border-amber-400/40 bg-amber-950/30 p-3 text-[11px] text-amber-100/95 dark:border-amber-600/35"
                            role="status"
                            aria-live="polite"
                        >
                            <div className="flex flex-wrap items-center gap-2 font-semibold text-amber-200">
                                {crawlJobProgress.state === 'queued' || crawlJobProgress.state === 'running' ? (
                                    <span
                                        className="inline-block size-3 shrink-0 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-300"
                                        aria-hidden
                                    />
                                ) : crawlJobProgress.state === 'failed' ? (
                                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-300" aria-hidden />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                                )}
                                {crawlJobProgress.state === 'failed'
                                    ? 'Veri çekme hatası'
                                    : crawlJobProgress.state === 'completed'
                                      ? 'Çekim tamamlandı — özet'
                                      : 'Harici veri içe aktarılıyor'}
                            </div>
                            <p className="text-xs leading-relaxed text-zinc-200">{crawlJobProgress.message}</p>
                            {crawlJobProgress.state === 'completed' || crawlJobProgress.state === 'failed' ? (
                                <div className="space-y-2 rounded-md border border-white/10 bg-black/25 p-2.5 text-zinc-100">
                                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
                                        <span>
                                            Veritabanına işlenen (toplam):{' '}
                                            <strong className="tabular-nums text-white">
                                                {(crawlJobProgress.processed_total ?? 0).toLocaleString('tr-TR')}
                                            </strong>
                                        </span>
                                        {Array.isArray(crawlJobProgress.rows) && crawlJobProgress.rows.length > 0 ? (
                                            <span className="text-zinc-400">
                                                Hata olan kaynak:{' '}
                                                <strong className="tabular-nums text-amber-200">
                                                    {
                                                        crawlJobProgress.rows.filter((r) => r.error != null && r.error !== '')
                                                            .length
                                                    }
                                                </strong>
                                                {' / '}
                                                {crawlJobProgress.rows.length.toLocaleString('tr-TR')}
                                            </span>
                                        ) : null}
                                    </div>
                                    {Array.isArray(crawlJobProgress.rows) && crawlJobProgress.rows.length > 0 ? (
                                        <div className="overflow-x-auto rounded border border-white/10">
                                            <table className="w-full min-w-[280px] text-left text-[11px]">
                                                <thead>
                                                    <tr className="border-b border-white/10 text-zinc-400">
                                                        <th className="px-2 py-1 font-semibold">Kaynak</th>
                                                        <th className="px-2 py-1 font-semibold">İşlenen</th>
                                                        <th className="px-2 py-1 font-semibold">Durum</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {crawlJobProgress.rows.map((r, idx) => (
                                                        <tr key={`${r.source}-${idx}`}>
                                                            <td className="px-2 py-1 font-mono uppercase text-zinc-200">
                                                                {r.source}
                                                            </td>
                                                            <td className="px-2 py-1 tabular-nums text-zinc-100">
                                                                {r.processed.toLocaleString('tr-TR')}
                                                            </td>
                                                            <td className="max-w-[min(24rem,55vw)] px-2 py-1">
                                                                {r.error ? (
                                                                    <span className="text-rose-300">{r.error}</span>
                                                                ) : (
                                                                    <span className="text-emerald-300/90">Tamam</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-zinc-500">Kaynak satırı raporu yok.</p>
                                    )}
                                    <p className="text-[10px] text-zinc-500">
                                        Sayfa yenilendiğinde aynı özet üstteki «Son veri çekme» kutusunda da görünür.
                                    </p>
                                </div>
                            ) : null}
                            {crawlJobProgress.active_source &&
                            (crawlJobProgress.state === 'queued' || crawlJobProgress.state === 'running') ? (
                                <p className="font-mono text-[10px] text-zinc-500">
                                    Kaynak: {crawlJobProgress.active_source}
                                </p>
                            ) : null}
                            {crawlJobProgress.state === 'queued' || crawlJobProgress.state === 'running' ? (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-zinc-400">
                                        <span>
                                            {crawlJobProgress.phase === 'crawl' ? 'Tarama' : 'Kayıt yazma'} ·{' '}
                                            {crawlJobProgress.current.toLocaleString('tr-TR')} /{' '}
                                            {crawlJobProgress.total.toLocaleString('tr-TR')}
                                        </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                                        <div
                                            className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
                                            style={{
                                                width: `${(() => {
                                                    if (crawlJobProgress.state === 'queued') {
                                                        return 4;
                                                    }
                                                    return Math.min(
                                                        100,
                                                        (crawlJobProgress.current / crawlJobProgress.total) * 100,
                                                    );
                                                })()}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                    {crawlTransportError ? (
                        <div
                            className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100"
                            role="alert"
                        >
                            <p className="font-semibold">İstek hatası</p>
                            <p className="mt-1">{crawlTransportError}</p>
                        </div>
                    ) : null}
                    {crawlValidationMessages.length > 0 && (
                        <div
                            className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
                            role="alert"
                        >
                            <p className="font-semibold">Form doğrulama</p>
                            <ul className="mt-1 list-inside list-disc space-y-0.5">
                                {crawlValidationMessages.map((m) => (
                                    <li key={m}>{m}</li>
                                ))}
                            </ul>
                        </div>
                    )}
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
                            Başlangıç tarihi <span className="text-rose-600 dark:text-rose-400">*</span>
                            <input
                                type="date"
                                value={crawlForm.data.date_from}
                                onChange={(e) => crawlForm.setData('date_from', e.target.value)}
                                className={selectClass}
                                disabled={previewLoading || crawlBusy}
                                required
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Bitiş tarihi <span className="text-rose-600 dark:text-rose-400">*</span>
                            <input
                                type="date"
                                value={crawlForm.data.date_to}
                                onChange={(e) => crawlForm.setData('date_to', e.target.value)}
                                className={selectClass}
                                disabled={previewLoading || crawlBusy}
                                required
                            />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Kayıt limiti (filtre sonrası)
                            <input
                                type="number"
                                min={1}
                                max={2000}
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
                                                                            rel="noopener noreferrer"
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
                                    <div>
                                        <dt className="font-medium text-zinc-500 dark:text-zinc-400">İlk indirme</dt>
                                        <dd>{formatAdminInstant(detailItem.created_at, appTimezone)}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium text-zinc-500 dark:text-zinc-400">Son çekimde güncellendi</dt>
                                        <dd>{formatAdminInstant(detailItem.last_crawled_at, appTimezone)}</dd>
                                    </div>
                                </dl>
                                {detailItem.description ? (
                                    <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">{detailItem.description}</p>
                                ) : (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Açıklama metni liste yükünü azaltmak için burada gösterilmez; tam metin için kaynak bağlantısını açın.
                                    </p>
                                )}
                                {detailItem.external_url ? (
                                    <a
                                        href={detailItem.external_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
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
                    className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8"
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
                        className={`${selectClass} sm:col-span-2 xl:col-span-2`}
                    />
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 xl:col-span-1">
                        Etkinlik tarihi ≥
                        <input
                            type="date"
                            value={queryForm.data.date_from}
                            onChange={(e) => queryForm.setData('date_from', e.target.value)}
                            className={selectClass}
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 xl:col-span-1">
                        Etkinlik tarihi ≤
                        <input
                            type="date"
                            value={queryForm.data.date_to}
                            onChange={(e) => queryForm.setData('date_to', e.target.value)}
                            className={selectClass}
                        />
                    </label>
                    <button
                        type="submit"
                        className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 sm:col-span-2 xl:col-span-1"
                    >
                        Filtrele
                    </button>
                </form>

                <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
                    <div className="flex flex-wrap items-center gap-2">
                        {selectAllMatching ? (
                            <button
                                type="button"
                                onClick={clearSelection}
                                className="rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                            >
                                Seçimi kaldır
                            </button>
                        ) : typeof items.total === 'number' && items.total > 0 ? (
                            <button
                                type="button"
                                onClick={pickAllMatching}
                                className="rounded-lg border border-amber-500/60 bg-amber-100/90 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25"
                            >
                                Filtreyle tümünü seç ({items.total.toLocaleString('tr-TR')} kayıt)
                            </button>
                        ) : null}
                    </div>
                    {selectAllMatching && typeof items.total === 'number' && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            Bu filtreyle eşleşen{' '}
                            <strong className="tabular-nums">{items.total.toLocaleString('tr-TR')}</strong> kaydın{' '}
                            <strong>tamamı</strong> toplu işleme dahil (tüm sayfalar). Tablodaki kutular gezinirken işaretli
                            görünür; tek tek kaldırmak için önce «Seçimi kaldır»a basın.
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                        <button
                            type="button"
                            onClick={() => runBulk('sync')}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                            disabled={bulkDisabled}
                        >
                            Seçilileri aktar
                        </button>
                        <button
                            type="button"
                            onClick={() => runBulk('reject')}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40"
                            disabled={bulkDisabled}
                        >
                            Seçilileri reddet
                        </button>
                        <button
                            type="button"
                            onClick={() => runBulk('destroy')}
                            className="rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/50 disabled:opacity-40 dark:border-red-900/60"
                            disabled={bulkDisabled}
                        >
                            Seçilileri sil
                        </button>
                    </div>
                </div>

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
                                        <input
                                            ref={selectAllCheckboxRef}
                                            type="checkbox"
                                            checked={headerSelectChecked}
                                            onChange={toggleSelectAll}
                                            aria-label="Filtreyle eşleşen tüm kayıtları seç veya seçimi kaldır"
                                        />
                                    </th>
                                    <th className="px-4 py-3">Başlık</th>
                                    <th className="px-4 py-3">Kaynak</th>
                                    <th className="px-4 py-3">Mekan / şehir</th>
                                    <th className="px-4 py-3">Tarih</th>
                                    <th className="min-w-[11rem] px-4 py-3">
                                        Sistem kaydı
                                        <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-zinc-500 dark:text-zinc-500">
                                            çekim zamanı (etkinlik tarihi değil)
                                        </span>
                                    </th>
                                    <th className="px-4 py-3">Durum</th>
                                    <th className="min-w-[14rem] whitespace-normal px-4 py-3 text-right">İşlemler</th>
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
                                                    checked={selectAllMatching || selectedIds.includes(item.id)}
                                                    disabled={selectAllMatching}
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
                                                        rel="noopener noreferrer"
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
                                            <td className="min-w-[10rem] px-4 py-3 text-xs leading-snug text-zinc-600 dark:text-zinc-400">
                                                <span className="block" title="Sunucuda «Verileri çek» bu satırı en son ne zaman işledi">
                                                    <span className="font-medium text-zinc-700 dark:text-zinc-200">Son çekim:</span>{' '}
                                                    {formatAdminInstant(item.last_crawled_at, appTimezone)}
                                                </span>
                                                <span
                                                    className="mt-1 block text-[11px] text-zinc-500 dark:text-zinc-500"
                                                    title="Bu aday kaydı ilk kez oluşturulduğunda"
                                                >
                                                    <span className="font-medium text-zinc-600 dark:text-zinc-400">İlk kayıt:</span>{' '}
                                                    {formatAdminInstant(item.created_at, appTimezone)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}>{st.label}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right align-top">
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
                                        checked={selectAllMatching || selectedIds.includes(item.id)}
                                        disabled={selectAllMatching}
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
                                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                                            <span title="«Verileri çek» bu satırı en son ne zaman güncelledi">
                                                Son çekim: {formatAdminInstant(item.last_crawled_at, appTimezone)}
                                            </span>
                                            <br />
                                            <span title="Kayıt ilk kez oluşturulduğunda">İlk kayıt: {formatAdminInstant(item.created_at, appTimezone)}</span>
                                        </p>
                                        {item.external_url && (
                                            <a
                                                href={item.external_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
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
