import { coercePromoGalleryRows } from '@/Components/PublicPromoGallerySection';
import { inputBaseClass } from '@/Components/ui/Input';
import { cn } from '@/lib/cn';
import type { PageProps } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

export type AdminEntityPromoGalleryRoutes = {
    importMedia: string;
    appendPromoFiles: string;
    clearPromoMedia: string;
    removePromoItem: string;
};

type PromoRow = {
    embed_url?: string | null;
    video_path?: string | null;
    poster_path?: string | null;
    promo_kind?: 'story' | 'post' | null;
};

type EntityWithPromo = {
    id: number;
    promo_gallery?: PromoRow[] | null;
    promo_video_path?: string | null;
    promo_embed_url?: string | null;
};

export type EventVenueProfilePromoToggles = {
    showPosts: boolean;
    showVideos: boolean;
    onChangeShowPosts: (v: boolean) => void;
    onChangeShowVideos: (v: boolean) => void;
    moderationStatus?: string | null;
};

type AdminPromoPreviewRow = {
    video_path: string | null;
    poster_path: string | null;
    embed_url: string | null;
    promo_kind: 'story' | 'post' | null;
    galleryIndex: number;
};

function storageUrl(path: string | null): string | null {
    if (!path || path.trim() === '') return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `/storage/${path}`;
}

function adminPromoRowKind(row: Pick<AdminPromoPreviewRow, 'promo_kind' | 'video_path' | 'embed_url' | 'poster_path'>): 'story' | 'post' {
    if (row.video_path) {
        return 'story';
    }
    if (row.promo_kind === 'story') {
        return 'story';
    }
    if (row.promo_kind === 'post') {
        return 'post';
    }
    const embed = row.embed_url?.trim() ?? '';
    if (embed.includes('instagram.com')) {
        return 'story';
    }
    if (row.poster_path) {
        return 'post';
    }
    return 'story';
}

const COPY = {
    venue: {
        lead: 'Ziyaretçi sayfasında üstte tanıtım videoları, altta gönderi görselleri görünür. Aşağıda önce görselleri (1), sonra videoları (2) ekleyin — yanlış kutuya URL koymayın.',
        postHint:
            'Satırların hepsi instagram.com ise önce tam video indirilir; olmazsa önizleme kalır. Karışık satırda yalnız kapak. Tam .mp4 için 2. bölüm.',
        reelHint: 'MP4/WebM dosyası veya reel URL’si; uzun indirmede arka plan kuyruğunu açabilirsiniz.',
    },
    artist: {
        lead: 'Sitede üstte tanıtım videoları, altta gönderi görselleri listelenir. 1 = görsel kutusu, 2 = video kutusu.',
        postHint:
            'Satırların hepsi instagram.com ise önce tam video indirilir; olmazsa önizleme kalır. Karışık satırda yalnız kapak.',
        reelHint: 'Performans videoları; sunucuda yt-dlp + ffmpeg gerekebilir.',
    },
    event: {
        lead: 'Tanıtım alanı iki parçadır: videolar (Reels) ile gönderi görselleri (Instagram / görsel). Yayında önce videolar, sonra gönderiler sıralanır.',
        postHint:
            'Bu kutuya yalnızca instagram.com satırları yapıştırdıysanız sistem önce tam videoyu indirmeyi dener (yt-dlp / Cobalt / çerez); inmezse önizleme ve embed kalır. Tüm satırlar gönderi veya Reels (/p/, /reel/, /share/…; hikâye yoksa) ise kayıt yine «Tanıtım videoları» bölümünde tutulur (yanlış kutuya yapıştırma). Karışık veya Instagram dışı URL’lerde yalnız kapak alınır. Doğrudan .mp4 için 2. bölüm.',
        reelHint: 'Dosya veya reel/MP4 bağlantısı; çok URL’de arka plan sırası önerilir.',
    },
} as const;

export default function AdminEntityPromoGalleryPanel({
    entity,
    routes,
    variant,
    showVideoUrlBackgroundOption = true,
    eventVenueProfilePromoToggles = null,
    eventArtistProfilePromoToggles = null,
}: Readonly<{
    entity: EntityWithPromo;
    routes: AdminEntityPromoGalleryRoutes;
    variant: 'venue' | 'artist' | 'event';
    /** false: yönetim paneli — sunucu zaten senkron işler; arka plan kutusu gösterilmez */
    showVideoUrlBackgroundOption?: boolean;
    /** Yalnız etkinlik: mekân sayfasında gönderi / video tanıtımı tikleri */
    eventVenueProfilePromoToggles?: EventVenueProfilePromoToggles | null;
    /** Yalnız etkinlik: sanatçı sayfasında (kadro) gösterim tikleri */
    eventArtistProfilePromoToggles?: EventVenueProfilePromoToggles | null;
}>) {
    const copy = COPY[variant];
    const fieldResize = cn(
        'mt-1 w-full resize-y font-mono text-sm',
        inputBaseClass,
        'placeholder:text-zinc-500 dark:placeholder:text-zinc-600',
    );

    const [appendPromoToGallery, setAppendPromoToGallery] = useState(true);
    /** Sanatçı/mekân panelinde: uzun indirmede yanıt sonrası sıra (post görselleri her zaman anında). */
    const [reelUrlsInBackground, setReelUrlsInBackground] = useState(false);

    const [postImageFiles, setPostImageFiles] = useState<File[]>([]);
    const [reelVideoFiles, setReelVideoFiles] = useState<File[]>([]);
    const postImagesInputRef = useRef<HTMLInputElement>(null);
    const reelVideosInputRef = useRef<HTMLInputElement>(null);

    const [postUrlsText, setPostUrlsText] = useState('');
    const [reelUrlsText, setReelUrlsText] = useState('');

    const [postImagesUploading, setPostImagesUploading] = useState(false);
    const [reelVideosUploading, setReelVideosUploading] = useState(false);
    const [postUrlsImporting, setPostUrlsImporting] = useState(false);
    const [reelUrlsImporting, setReelUrlsImporting] = useState(false);
    type PromoUrlImportProgress = {
        token: string;
        state: string;
        current: number;
        total: number;
        ok: number;
        message: string;
        failures: string[];
        active_url: string | null;
    };
    const [promoUrlImportProgress, setPromoUrlImportProgress] = useState<PromoUrlImportProgress | null>(null);
    const page = usePage<PageProps<{ flash?: { promo_import_status_id?: string | null } }>>();

    useEffect(() => {
        const raw = page.props.flash?.promo_import_status_id;
        const token = typeof raw === 'string' && raw.length > 0 ? raw : null;
        if (!token) {
            return;
        }

        let cancelled = false;
        let interval: ReturnType<typeof setInterval> | undefined;

        const poll = async (): Promise<void> => {
            try {
                const res = await fetch(route('promo-import.status', { token }), {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                });
                if (cancelled) {
                    return;
                }
                if (res.status === 404) {
                    setPromoUrlImportProgress((p) =>
                        p
                            ? { ...p, state: 'failed', message: 'İlerleme bilgisi bulunamadı veya süresi doldu.' }
                            : {
                                  token,
                                  state: 'failed',
                                  current: 0,
                                  total: 1,
                                  ok: 0,
                                  message: 'İlerleme bilgisi bulunamadı veya süresi doldu.',
                                  failures: [],
                                  active_url: null,
                              },
                    );
                    if (interval) {
                        clearInterval(interval);
                    }
                    return;
                }
                if (!res.ok) {
                    return;
                }
                const j = (await res.json()) as Omit<PromoUrlImportProgress, 'token'>;
                setPromoUrlImportProgress({
                    token,
                    state: j.state,
                    current: j.current,
                    total: Math.max(1, j.total),
                    ok: j.ok,
                    message: j.message,
                    failures: Array.isArray(j.failures) ? j.failures : [],
                    active_url: j.active_url,
                });
                if (j.state === 'completed' || j.state === 'failed') {
                    if (interval) {
                        clearInterval(interval);
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
    }, [page.props.flash?.promo_import_status_id]);
    const [removingPromoIndex, setRemovingPromoIndex] = useState<number | null>(null);
    const [postFilesError, setPostFilesError] = useState<string | null>(null);
    const [reelFilesError, setReelFilesError] = useState<string | null>(null);

    const appendFormBool = () => (appendPromoToGallery ? '1' : '0');

    const firstValidationMessage = (errors: Record<string, string | string[] | undefined>): string => {
        for (const val of Object.values(errors)) {
            if (typeof val === 'string' && val.trim() !== '') {
                return val;
            }
            if (Array.isArray(val) && val[0] && typeof val[0] === 'string') {
                return val[0];
            }
        }
        return 'Yükleme tamamlanamadı. Nginx 413 (dosya boyutu) veya sunucu zaman aşımı olabilir; sayfayı yenileyip tekrar deneyin.';
    };

    const submitPostImagesBulk = () => {
        if (postImageFiles.length === 0) return;
        setPostFilesError(null);
        setPostImagesUploading(true);
        const fd = new FormData();
        postImageFiles.forEach((f) => fd.append('promo_post_images[]', f));
        fd.append('append_promo', appendFormBool());
        router.post(routes.appendPromoFiles, fd, {
            preserveScroll: true,
            forceFormData: true,
            onFinish: () => setPostImagesUploading(false),
            onSuccess: () => {
                setPostImageFiles([]);
                if (postImagesInputRef.current) postImagesInputRef.current.value = '';
            },
            onError: (errors) => setPostFilesError(firstValidationMessage(errors)),
        });
    };

    const submitReelVideosBulk = () => {
        if (reelVideoFiles.length === 0) return;
        setReelFilesError(null);
        setReelVideosUploading(true);
        const fd = new FormData();
        reelVideoFiles.forEach((f) => fd.append('promo_videos[]', f));
        fd.append('append_promo', appendFormBool());
        router.post(routes.appendPromoFiles, fd, {
            preserveScroll: true,
            forceFormData: true,
            onFinish: () => setReelVideosUploading(false),
            onSuccess: () => {
                setReelVideoFiles([]);
                if (reelVideosInputRef.current) reelVideosInputRef.current.value = '';
            },
            onError: (errors) => setReelFilesError(firstValidationMessage(errors)),
        });
    };

    const submitPostUrlsImport = () => {
        if (!postUrlsText.trim()) return;
        const lineList = postUrlsText
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l !== '');
        const allInstagram =
            lineList.length > 0 && lineList.every((l) => /instagram\.com/i.test(l));
        /** Yalnız kapak: karışık satır veya Instagram dışı. Aksi halde tam MP4 denenir (başarısızsa yine önizleme düşer). */
        const posterEmbedOnly = !allInstagram;
        /** Sadece /p/, /reel/, /share/… (hikâye yok) ise aynı «Tanıtım videoları» slotu — yanlışlıkla pembe kutuya yapıştırılan Reels kaybolmasın. */
        const allPostOrReelNoStories =
            lineList.length > 0 &&
            lineList.every((l) => {
                if (!/instagram\.com/i.test(l)) {
                    return false;
                }
                if (/\/stories\//i.test(l)) {
                    return false;
                }
                return (
                    /instagram\.com\/(p|reel|reels|tv)\//i.test(l) ||
                    /instagram\.com\/share\/(p|reel)\//i.test(l)
                );
            });
        const promoGallerySlot = allPostOrReelNoStories ? 'video' : 'post';
        const useVideoQueue =
            showVideoUrlBackgroundOption && allInstagram && lineList.length > 1;
        setPostUrlsImporting(true);
        router.post(
            routes.importMedia,
            {
                urls_text: postUrlsText,
                mode: 'promo_video',
                append_promo: appendPromoToGallery,
                promo_poster_embed_only: posterEmbedOnly,
                promo_gallery_slot: promoGallerySlot,
                ...(useVideoQueue ? { promo_import_background: true } : {}),
            },
            {
                preserveScroll: true,
                onFinish: () => setPostUrlsImporting(false),
                onSuccess: () => setPostUrlsText(''),
            },
        );
    };

    const submitReelUrlsImport = () => {
        if (!reelUrlsText.trim()) return;
        setReelUrlsImporting(true);
        router.post(
            routes.importMedia,
            {
                urls_text: reelUrlsText,
                mode: 'promo_video',
                append_promo: appendPromoToGallery,
                promo_gallery_slot: 'video',
                ...(showVideoUrlBackgroundOption && reelUrlsInBackground ? { promo_import_background: true } : {}),
            },
            {
                preserveScroll: true,
                onFinish: () => setReelUrlsImporting(false),
                onError: () => setReelUrlsImporting(false),
                onSuccess: () => setReelUrlsText(''),
            },
        );
    };

    const clearPromoFromServer = () => {
        if (!confirm('Tüm tanıtım videoları, görseller ve bağlantılar kaldırılsın mı?')) return;
        router.post(routes.clearPromoMedia, {}, { preserveScroll: true });
    };

    const removePromoGalleryItem = (galleryIndex: number) => {
        if (!confirm('Bu öğeyi kaldırmak istiyor musunuz?')) return;
        setRemovingPromoIndex(galleryIndex);
        router.post(
            routes.removePromoItem,
            { index: galleryIndex },
            {
                preserveScroll: true,
                onFinish: () => setRemovingPromoIndex(null),
            },
        );
    };

    const adminPromoGalleryRows = useMemo((): AdminPromoPreviewRow[] => {
        const coerced = coercePromoGalleryRows(entity.promo_gallery);

        const mapRow = (row: unknown, galleryIndex: number): AdminPromoPreviewRow | null => {
            if (!row || typeof row !== 'object') {
                return null;
            }
            const r = row as PromoRow;
            return {
                video_path: r.video_path?.trim() || null,
                poster_path: r.poster_path?.trim() || null,
                embed_url: r.embed_url?.trim() || null,
                promo_kind:
                    r.promo_kind === 'post' ? ('post' as const) : r.promo_kind === 'story' ? ('story' as const) : null,
                galleryIndex,
            };
        };

        if (coerced.length > 0) {
            return coerced
                .map((row, galleryIndex) => mapRow(row, galleryIndex))
                .filter((x): x is AdminPromoPreviewRow => x !== null)
                .map((row, i) => ({ ...row, galleryIndex: i }));
        }
        if (entity.promo_video_path?.trim() || entity.promo_embed_url?.trim()) {
            return [
                {
                    video_path: entity.promo_video_path?.trim() || null,
                    poster_path: null,
                    embed_url: entity.promo_embed_url?.trim() || null,
                    promo_kind: 'story' as const,
                    galleryIndex: 0,
                },
            ];
        }
        return [];
    }, [entity.promo_gallery, entity.promo_video_path, entity.promo_embed_url]);

    const adminVideoPreviewRows = useMemo(
        () => adminPromoGalleryRows.filter((row) => adminPromoRowKind(row) === 'story'),
        [adminPromoGalleryRows],
    );
    const adminPostPreviewRows = useMemo(
        () => adminPromoGalleryRows.filter((row) => adminPromoRowKind(row) === 'post'),
        [adminPromoGalleryRows],
    );

    return (
        <div className="mt-10 max-w-3xl space-y-6 rounded-lg border border-zinc-600/80 bg-zinc-950/40 p-4 sm:p-5">
            <div>
                <h2 className="text-sm font-semibold text-zinc-200">Tanıtım: videolar ve gönderi görselleri</h2>
                <p className="mt-1 text-xs text-zinc-500">{copy.lead}</p>
            </div>

            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-700/80 bg-zinc-900/50 p-3 text-xs text-zinc-400">
                <input
                    type="checkbox"
                    checked={appendPromoToGallery}
                    onChange={(e) => setAppendPromoToGallery(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-zinc-300"
                />
                <span>
                    Mevcut öğelerin <strong className="text-zinc-200">yanına ekle</strong>. Kapalıysa her işlemden önce galeri sıfırlanır.
                </span>
            </label>

            {variant === 'event' && eventVenueProfilePromoToggles?.moderationStatus === 'pending_review' ? (
                <p className="rounded-md border border-amber-500/40 bg-amber-950/35 px-3 py-2 text-[11px] text-amber-100/95">
                    Mekân profili tanıtımı <strong className="text-amber-50">onay bekliyor</strong>. Yönetici onayladıktan sonra mekân sayfasında görünür.
                    Tanıtım dosyası yükleyen kişi yönetici değilse bu akış uygulanır; yönetici düzenlemeleri doğrudan onaylı sayılır.
                </p>
            ) : null}
            {variant === 'event' && eventArtistProfilePromoToggles?.moderationStatus === 'pending_review' ? (
                <p className="rounded-md border border-sky-500/40 bg-sky-950/35 px-3 py-2 text-[11px] text-sky-100/95">
                    Sanatçı profili tanıtımı <strong className="text-sky-50">onay bekliyor</strong>. Yönetici onayladıktan sonra ilgili sanatçı sayfasında görünür.
                </p>
            ) : null}

            {/* —— Post görselleri —— */}
            <section
                className="space-y-4 rounded-xl border border-fuchsia-500/35 bg-fuchsia-950/15 p-4 sm:p-5"
                aria-labelledby={`entity-promo-posts-${entity.id}`}
            >
                <div>
                    <h3 className="text-sm font-semibold text-fuchsia-200" id={`entity-promo-posts-${entity.id}`}>
                        1 · Gönderi görselleri (Instagram / dosya)
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">{copy.postHint}</p>
                    {variant === 'event' && eventVenueProfilePromoToggles ? (
                        <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-fuchsia-500/25 bg-zinc-950/40 p-2.5 text-[11px] text-zinc-400">
                            <input
                                type="checkbox"
                                checked={eventVenueProfilePromoToggles.showPosts}
                                onChange={(e) => eventVenueProfilePromoToggles.onChangeShowPosts(e.target.checked)}
                                className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-fuchsia-500"
                            />
                            <span>
                                Bu gönderi görsellerini <strong className="text-fuchsia-100/90">mekân profil sayfasında</strong> göster. Etkinlik günü
                                sonuna kadar listelenir; süre bittikten sonra dosyalar sunucudan otomatik silinir (etkinlik kaydı kalır). Sayfanın altındaki{' '}
                                <strong className="text-zinc-300">Kaydet</strong> ile tikleri kaydedin.
                            </span>
                        </label>
                    ) : null}
                    {variant === 'event' && eventArtistProfilePromoToggles ? (
                        <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-sky-500/25 bg-zinc-950/40 p-2.5 text-[11px] text-zinc-400">
                            <input
                                type="checkbox"
                                checked={eventArtistProfilePromoToggles.showPosts}
                                onChange={(e) => eventArtistProfilePromoToggles.onChangeShowPosts(e.target.checked)}
                                className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-sky-400"
                            />
                            <span>
                                Bu gönderi görsellerini <strong className="text-sky-100/90">sanatçı profil sayfasında</strong> göster (etkinlik kadrosunda yer
                                alan sanatçılar). Aynı görünürlük süresi ve otomatik silme kuralları geçerlidir. Tikleri{' '}
                                <strong className="text-zinc-300">Kaydet</strong> ile kaydedin.
                            </span>
                        </label>
                    ) : null}
                </div>

                <div className="space-y-2">
                    <p className="text-[11px] font-medium text-zinc-400">Dosyadan (JPG, PNG, WebP — çoklu)</p>
                    <input
                        ref={postImagesInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                            setPostImageFiles(Array.from(e.target.files ?? []));
                            setPostFilesError(null);
                        }}
                        className="w-full text-sm text-zinc-300"
                    />
                    {postFilesError && (
                        <p className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200" role="alert">
                            {postFilesError}
                        </p>
                    )}
                    <p className="text-[11px] text-amber-200/90">
                        Bu bölümde dosya seçtiyseniz, yüklemek için <strong>hemen alttaki turuncu «Kaydet»</strong> düğmesine basın — sayfanın en altındaki
                        genel «Kaydet» yalnızca etkinlik / kayıt formunu kaydeder; bu dosyaları göndermez.
                    </p>
                    <button
                        type="button"
                        disabled={postImagesUploading || postImageFiles.length === 0}
                        onClick={submitPostImagesBulk}
                        className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
                    >
                        {postImagesUploading ? 'Yükleniyor…' : `Kaydet (${postImageFiles.length})`}
                    </button>
                </div>

                <div className="border-t border-fuchsia-500/20 pt-4">
                    <p className="text-[11px] font-medium text-zinc-400">Veya bağlantı (satır başına bir URL)</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-500">{copy.postHint}</p>
                    <textarea
                        id={`entity-post-urls-${entity.id}`}
                        value={postUrlsText}
                        onChange={(e) => setPostUrlsText(e.target.value)}
                        placeholder={
                            'https://www.instagram.com/p/…\nhttps://www.instagram.com/stories/kullanici/1234567890/'
                        }
                        rows={4}
                        className={cn(fieldResize, 'mt-2')}
                    />
                    <button
                        type="button"
                        disabled={postUrlsImporting || !postUrlsText.trim()}
                        onClick={submitPostUrlsImport}
                        className="mt-2 rounded-lg bg-fuchsia-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
                    >
                        {postUrlsImporting ? 'İşleniyor…' : 'URL’lerden içe aktar'}
                    </button>
                </div>
            </section>

            {/* —— Reels / videolar —— */}
            <section
                className="space-y-4 rounded-xl border border-amber-500/35 bg-amber-950/10 p-4 sm:p-5"
                aria-labelledby={`entity-promo-reels-${entity.id}`}
            >
                <div>
                    <h3 className="text-sm font-semibold text-amber-200" id={`entity-promo-reels-${entity.id}`}>
                        2 · Tanıtım videoları (Reels / MP4)
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">{copy.reelHint}</p>
                    <p className="mt-2 rounded-md border border-amber-500/35 bg-amber-950/30 p-2.5 text-[11px] leading-snug text-amber-100/95">
                        <strong className="text-amber-50">MP4 ne zaman iner?</strong> Instagram çoğu gönderi ve hikâyede videoyu{' '}
                        <strong>çerezsiz istekle vermez</strong>. Çerez olmadan içe aktarma başarılı olsa bile yalnızca{' '}
                        <strong className="text-fuchsia-200/90">«Gönderi görselleri»</strong> önizlemesi oluşur; sitede üstteki{' '}
                        <strong className="text-amber-200/90">«Tanıtım videoları»</strong> bölümünde oynatıcı ancak gerçek MP4
                        diske indiğinde görünür. Çözüm: <code className="rounded bg-black/30 px-1 text-amber-200/90">YTDLP_COOKIES_FILE</code>{' '}
                        (Netscape <code className="rounded bg-black/30 px-1">cookies.txt</code>) veya{' '}
                        <code className="rounded bg-black/30 px-1 text-amber-200/90">COBALT_API_URL</code> — kontrol:{' '}
                        <code className="rounded bg-black/30 px-1">php artisan sahnebul:promo-import-deps</code>.
                    </p>
                    {variant === 'event' && eventVenueProfilePromoToggles ? (
                        <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-amber-500/25 bg-zinc-950/40 p-2.5 text-[11px] text-zinc-400">
                            <input
                                type="checkbox"
                                checked={eventVenueProfilePromoToggles.showVideos}
                                onChange={(e) => eventVenueProfilePromoToggles.onChangeShowVideos(e.target.checked)}
                                className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-amber-500"
                            />
                            <span>
                                Bu tanıtım videolarını <strong className="text-amber-100/90">mekân profil sayfasında</strong> göster. Etkinlik günü sonuna
                                kadar; ardından video dosyaları sistemden kaldırılır. Tikleri genel <strong className="text-zinc-300">Kaydet</strong> ile
                                kaydedin.
                            </span>
                        </label>
                    ) : null}
                    {variant === 'event' && eventArtistProfilePromoToggles ? (
                        <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-sky-500/25 bg-zinc-950/40 p-2.5 text-[11px] text-zinc-400">
                            <input
                                type="checkbox"
                                checked={eventArtistProfilePromoToggles.showVideos}
                                onChange={(e) => eventArtistProfilePromoToggles.onChangeShowVideos(e.target.checked)}
                                className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-sky-400"
                            />
                            <span>
                                Bu tanıtım videolarını <strong className="text-sky-100/90">sanatçı profil sayfasında</strong> göster. Süre ve silme kuralları
                                mekân satırı ile aynıdır. Tikleri <strong className="text-zinc-300">Kaydet</strong> ile kaydedin.
                            </span>
                        </label>
                    ) : null}
                </div>

                {showVideoUrlBackgroundOption ? (
                    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-500/25 bg-zinc-950/40 p-2.5 text-[11px] text-zinc-400">
                        <input
                            type="checkbox"
                            checked={reelUrlsInBackground}
                            onChange={(e) => setReelUrlsInBackground(e.target.checked)}
                            disabled={reelUrlsImporting}
                            className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-amber-500"
                        />
                        <span>
                            Video URL’lerini <strong className="text-amber-100/90">arka planda</strong> işle: sayfa kilitlenmez, hangi satırda olduğunuz ve
                            indirmenin gerçekten çalışıp çalışmadığı burada güncellenir. Kapalı: işlem bitene kadar bekler, sonuç tek seferde gelir.
                        </span>
                    </label>
                ) : (
                    <p className="rounded-md border border-zinc-700/50 bg-zinc-950/30 p-2.5 text-[11px] text-zinc-500">
                        Varsayılan: içe aktarma <strong className="text-zinc-400">anında</strong> tamamlanır. Uzun Instagram indirmelerinde üstteki «arka planda»
                        seçeneğini açın. Sunucuda <strong className="text-zinc-400">yt-dlp</strong> + <strong className="text-zinc-400">ffmpeg</strong> gerekir —{' '}
                        <code className="text-amber-200/80">php artisan sahnebul:promo-import-deps</code>
                    </p>
                )}

                {promoUrlImportProgress ? (
                    <div
                        className="space-y-2 rounded-lg border border-amber-400/40 bg-amber-950/30 p-3 text-[11px] text-amber-100/95"
                        role="status"
                        aria-live="polite"
                    >
                        <div className="flex items-center gap-2 font-semibold text-amber-200">
                            <span
                                className="inline-block size-3 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-300"
                                aria-hidden
                            />
                            Tanıtım videoları içe aktarılıyor
                        </div>
                        <p className="text-zinc-200">{promoUrlImportProgress.message}</p>
                        {promoUrlImportProgress.total > 1 ? (
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-zinc-400">
                                    <span>
                                        Satır{' '}
                                        {promoUrlImportProgress.state === 'queued'
                                            ? 0
                                            : promoUrlImportProgress.current}
                                        {' / '}
                                        {promoUrlImportProgress.total}
                                    </span>
                                    <span>Başarılı: {promoUrlImportProgress.ok}</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                                    <div
                                        className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
                                        style={{
                                            width: `${
                                                promoUrlImportProgress.state === 'queued'
                                                    ? 4
                                                    : Math.min(
                                                          100,
                                                          (promoUrlImportProgress.current / promoUrlImportProgress.total) * 100,
                                                      )
                                            }%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="text-[10px] text-zinc-500">
                                Tek URL: indirme sürerken bu kutu güncellenir; bittiğinde sayfa yenilenir.
                            </p>
                        )}
                        {promoUrlImportProgress.active_url ? (
                            <p className="break-all font-mono text-[10px] text-zinc-500">{promoUrlImportProgress.active_url}</p>
                        ) : null}
                        {promoUrlImportProgress.failures.length > 0 ? (
                            <ul className="list-inside list-disc text-[10px] text-red-200/90">
                                {promoUrlImportProgress.failures.slice(0, 4).map((f) => (
                                    <li key={f.slice(0, 80)}>{f}</li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                ) : null}

                <div className="space-y-2">
                    <p className="text-[11px] font-medium text-zinc-400">Dosyadan (MP4, WebM, MOV — çoklu)</p>
                    <input
                        ref={reelVideosInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                        multiple
                        onChange={(e) => {
                            setReelVideoFiles(Array.from(e.target.files ?? []));
                            setReelFilesError(null);
                        }}
                        className="w-full text-sm text-zinc-300"
                    />
                    {reelVideoFiles.length > 0 && (
                        <p className="rounded-md border border-amber-500/50 bg-amber-950/35 px-3 py-2 text-[11px] text-amber-100">
                            <strong>Adım:</strong> Videoyu sunucuya göndermek için <strong>bu kutudaki «Kaydet ({reelVideoFiles.length})»</strong> düğmesine basın.
                            Sayfanın en altındaki «Kaydet» etkinlik bilgisini kaydeder; seçtiğiniz video dosyasını yüklemez.
                        </p>
                    )}
                    {reelFilesError && (
                        <p className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200" role="alert">
                            {reelFilesError}
                        </p>
                    )}
                    <button
                        type="button"
                        disabled={reelVideosUploading || reelVideoFiles.length === 0}
                        onClick={submitReelVideosBulk}
                        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
                    >
                        {reelVideosUploading ? 'Yükleniyor…' : `Kaydet (${reelVideoFiles.length})`}
                    </button>
                </div>

                <div className="border-t border-amber-500/20 pt-4">
                    <p className="text-[11px] font-medium text-zinc-400">Veya bağlantı (satır başına bir URL)</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-500">
                        .mp4 / .webm veya Instagram reel / hikâye. Sunucuda güncel <strong className="text-zinc-500">yt-dlp</strong> + ffmpeg gerekir (
                        <code className="text-zinc-400">apt</code> sürümü çoğu zaman eski; Instagram için{' '}
                        <code className="text-zinc-400">pipx install yt-dlp</code> önerilir). Çoklu satırda işlem dakikalar sürebilir; HTTP 429 için{' '}
                        <code className="text-zinc-400">YTDLP_COOKIES_FILE</code> / <code className="text-zinc-400">INSTAGRAM_FETCH_COOKIES</code> ve Forge’da{' '}
                        <code className="text-zinc-400">fastcgi_read_timeout</code> yükseltin.
                    </p>
                    <textarea
                        id={`entity-reel-urls-${entity.id}`}
                        value={reelUrlsText}
                        onChange={(e) => setReelUrlsText(e.target.value)}
                        placeholder={'https://cdn.ornek.com/tanitim.mp4\nhttps://www.instagram.com/reel/…'}
                        rows={4}
                        className={cn(fieldResize, 'mt-2')}
                    />
                    <button
                        type="button"
                        disabled={reelUrlsImporting || !reelUrlsText.trim()}
                        onClick={submitReelUrlsImport}
                        className="mt-2 rounded-lg bg-amber-600/90 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
                    >
                        {reelUrlsImporting ? 'İşleniyor…' : 'Video URL’lerini içe aktar'}
                    </button>
                </div>
            </section>

            {adminPromoGalleryRows.length > 0 && (
                <div className="space-y-6 rounded-lg border border-zinc-600/80 bg-zinc-950/40 p-4">
                    <div>
                        <p className="text-xs font-medium text-zinc-400">Önizleme</p>
                        <p className="mt-1 text-xs text-zinc-500">
                            Yayında sıra: önce <strong className="text-amber-200/90">tanıtım videoları</strong>, sonra{' '}
                            <strong className="text-fuchsia-200/90">gönderi görselleri</strong> — her biri kendi ızgarasında.
                        </p>
                    </div>

                    {adminPostPreviewRows.length > 0 ? (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-fuchsia-300/90">Gönderi görselleri</p>
                            <ul className="mt-2 grid list-none grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2">
                                {adminPostPreviewRows.map((row) => (
                                    <li
                                        key={`post-prev-${row.galleryIndex}`}
                                        className="relative aspect-square overflow-hidden rounded-md border border-zinc-700 bg-zinc-950"
                                    >
                                        <span className="absolute left-0.5 top-0.5 z-10 max-w-[92%] rounded bg-fuchsia-600/90 px-1 py-0.5 text-[7px] font-bold uppercase leading-tight text-white">
                                            {row.embed_url?.includes('instagram.com') && !row.video_path
                                                ? 'IG · MP4 yok'
                                                : 'Görsel'}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={removingPromoIndex === row.galleryIndex}
                                            onClick={() => removePromoGalleryItem(row.galleryIndex)}
                                            className="absolute right-0.5 top-0.5 z-10 rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-red-500 disabled:opacity-50"
                                            title="Kaldır"
                                        >
                                            ×
                                        </button>
                                        {storageUrl(row.video_path) ? (
                                            <video
                                                src={storageUrl(row.video_path) ?? ''}
                                                controls
                                                playsInline
                                                className="h-full w-full object-cover"
                                                poster={storageUrl(row.poster_path) ?? undefined}
                                            />
                                        ) : storageUrl(row.poster_path) ? (
                                            <img src={storageUrl(row.poster_path) ?? ''} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-zinc-500">
                                                {row.embed_url?.includes('instagram.com') ? 'IG' : '—'}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {adminVideoPreviewRows.length > 0 ? (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-400/90">Tanıtım videoları</p>
                            <ul className="mt-2 grid list-none grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2">
                                {adminVideoPreviewRows.map((row) => (
                                    <li
                                        key={`video-prev-${row.galleryIndex}`}
                                        className="relative aspect-square overflow-hidden rounded-md border border-zinc-700 bg-zinc-950"
                                    >
                                        <span className="absolute left-0.5 top-0.5 z-10 max-w-[92%] rounded bg-amber-600/90 px-1 py-0.5 text-[7px] font-bold uppercase leading-tight text-zinc-950">
                                            {storageUrl(row.video_path) ? 'MP4' : 'MP4 yok'}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={removingPromoIndex === row.galleryIndex}
                                            onClick={() => removePromoGalleryItem(row.galleryIndex)}
                                            className="absolute right-0.5 top-0.5 z-10 rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-red-500 disabled:opacity-50"
                                            title="Kaldır"
                                        >
                                            ×
                                        </button>
                                        {storageUrl(row.video_path) ? (
                                            <video
                                                src={storageUrl(row.video_path) ?? ''}
                                                controls
                                                playsInline
                                                className="h-full w-full object-cover"
                                                poster={storageUrl(row.poster_path) ?? undefined}
                                            />
                                        ) : storageUrl(row.poster_path) ? (
                                            <img src={storageUrl(row.poster_path) ?? ''} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-zinc-500">
                                                {row.embed_url?.includes('instagram.com') ? 'IG' : '—'}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {adminPromoGalleryRows.some((r) => r.embed_url) ? (
                        <p className="text-[10px] text-zinc-500">
                            {adminPromoGalleryRows
                                .map((r) => r.embed_url)
                                .filter(Boolean)
                                .slice(0, 4)
                                .join(' · ')}
                            {adminPromoGalleryRows.filter((r) => r.embed_url).length > 4 ? '…' : ''}
                        </p>
                    ) : null}
                    <button type="button" onClick={clearPromoFromServer} className="text-sm font-medium text-red-400 hover:text-red-300">
                        Tüm tanıtımları kaldır
                    </button>
                </div>
            )}
        </div>
    );
}
