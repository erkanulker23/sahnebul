import { inputBaseClass } from '@/Components/ui/Input';
import { cn } from '@/lib/cn';
import { router } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';

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
    if (row.poster_path || row.embed_url?.includes('instagram.com')) {
        return 'post';
    }
    if (row.promo_kind === 'post') {
        return 'post';
    }
    if (row.promo_kind === 'story') {
        return 'story';
    }
    return 'story';
}

const COPY = {
    venue: {
        lead: 'Ziyaretçi sayfasında üstte tanıtım videoları, altta gönderi görselleri görünür. Aşağıda önce görselleri (1), sonra videoları (2) ekleyin — yanlış kutuya URL koymayın.',
        postHint: 'Instagram /p/… veya yüklenen görsel; yalnız kare önizleme. Tam reel/MP4 için 2. bölüm.',
        reelHint: 'MP4/WebM dosyası veya reel URL’si; uzun indirmede arka plan kuyruğunu açabilirsiniz.',
    },
    artist: {
        lead: 'Sitede üstte tanıtım videoları, altta gönderi görselleri listelenir. 1 = görsel kutusu, 2 = video kutusu.',
        postHint: 'Duyuru kapakları ve Instagram’dan önizleme; tam video burada indirilmez.',
        reelHint: 'Performans videoları; sunucuda yt-dlp + ffmpeg gerekebilir.',
    },
    event: {
        lead: 'Tanıtım alanı iki parçadır: videolar (Reels) ile gönderi görselleri (Instagram / görsel). Yayında önce videolar, sonra gönderiler sıralanır.',
        postHint: 'Yalnız önizleme görseli veya embed. .mp4 ve tam reel indirmesi için 2. bölümü kullanın.',
        reelHint: 'Dosya veya reel/MP4 bağlantısı; çok URL’de arka plan sırası önerilir.',
    },
} as const;

export default function AdminEntityPromoGalleryPanel({
    entity,
    routes,
    variant,
    showVideoUrlBackgroundOption = true,
}: Readonly<{
    entity: EntityWithPromo;
    routes: AdminEntityPromoGalleryRoutes;
    variant: 'venue' | 'artist' | 'event';
    /** false: yönetim paneli — sunucu zaten senkron işler; arka plan kutusu gösterilmez */
    showVideoUrlBackgroundOption?: boolean;
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
    const [removingPromoIndex, setRemovingPromoIndex] = useState<number | null>(null);

    const appendFormBool = () => (appendPromoToGallery ? '1' : '0');

    const submitPostImagesBulk = () => {
        if (postImageFiles.length === 0) return;
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
        });
    };

    const submitReelVideosBulk = () => {
        if (reelVideoFiles.length === 0) return;
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
        });
    };

    const submitPostUrlsImport = () => {
        if (!postUrlsText.trim()) return;
        setPostUrlsImporting(true);
        router.post(
            routes.importMedia,
            {
                urls_text: postUrlsText,
                mode: 'promo_video',
                append_promo: appendPromoToGallery,
                promo_poster_embed_only: true,
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
                ...(showVideoUrlBackgroundOption && reelUrlsInBackground ? { promo_import_background: true } : {}),
            },
            {
                preserveScroll: true,
                onFinish: () => setReelUrlsImporting(false),
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
        const g = entity.promo_gallery;
        if (Array.isArray(g) && g.length > 0) {
            return g.map((row, galleryIndex) => ({
                video_path: row.video_path?.trim() || null,
                poster_path: row.poster_path?.trim() || null,
                embed_url: row.embed_url?.trim() || null,
                promo_kind:
                    row.promo_kind === 'post' ? ('post' as const) : row.promo_kind === 'story' ? ('story' as const) : null,
                galleryIndex,
            }));
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
                </div>

                <div className="space-y-2">
                    <p className="text-[11px] font-medium text-zinc-400">Dosyadan (JPG, PNG, WebP — çoklu)</p>
                    <input
                        ref={postImagesInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => setPostImageFiles(Array.from(e.target.files ?? []))}
                        className="w-full text-sm text-zinc-300"
                    />
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
                    <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-500">
                        Burada yalnızca önizleme görseli alınır; tam reel/video indirilmez. Reel için 2. bölümü kullanın.
                    </p>
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
                            Video URL’lerini <strong className="text-amber-100/90">yanıt gönderildikten sonra sırayla</strong> işle (uzun indirmede
                            tarayıcı zaman aşımını önler). Kapalı: işlem bitene kadar bu sayfa bekler — sonucu hemen görürsünüz.
                        </span>
                    </label>
                ) : (
                    <p className="rounded-md border border-zinc-700/50 bg-zinc-950/30 p-2.5 text-[11px] text-zinc-500">
                        Yönetim panelinde içe aktarma <strong className="text-zinc-400">anında</strong> tamamlanır; başarı veya hata mesajı hemen gösterilir.
                        Instagram videosu için sunucuda <strong className="text-zinc-400">yt-dlp</strong> ve <strong className="text-zinc-400">ffmpeg</strong>{' '}
                        gerekir — kontrol: <code className="text-amber-200/80">php artisan sahnebul:promo-import-deps</code>
                    </p>
                )}

                <div className="space-y-2">
                    <p className="text-[11px] font-medium text-zinc-400">Dosyadan (MP4, WebM, MOV — çoklu)</p>
                    <input
                        ref={reelVideosInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                        multiple
                        onChange={(e) => setReelVideoFiles(Array.from(e.target.files ?? []))}
                        className="w-full text-sm text-zinc-300"
                    />
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
                        .mp4 / .webm veya Instagram reel. Sunucuda genelde yt-dlp + ffmpeg gerekir.
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
                                        <span className="absolute left-0.5 top-0.5 z-10 rounded bg-fuchsia-600/90 px-1 py-0.5 text-[8px] font-bold uppercase text-white">
                                            Görsel
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
                                        <span className="absolute left-0.5 top-0.5 z-10 rounded bg-amber-600/90 px-1 py-0.5 text-[8px] font-bold uppercase text-zinc-950">
                                            Video
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
