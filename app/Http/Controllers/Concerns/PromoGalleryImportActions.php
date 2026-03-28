<?php

namespace App\Http\Controllers\Concerns;

use App\Jobs\ProcessPromoGalleryUrlImportJob;
use App\Services\EventMediaImportFromUrlService;
use App\Support\PromoGalleryUrlImportStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

trait PromoGalleryImportActions
{
    protected function promoImportMediaFromUrlResponse(
        Request $request,
        Model $model,
        EventMediaImportFromUrlService $importer,
        bool $promoVideoOnly,
    ): RedirectResponse {
        $modes = $promoVideoOnly ? ['promo_video'] : ['image_cover', 'image_listing', 'promo_video'];
        $validated = $request->validate([
            'url' => ['nullable', 'string', 'max:2048'],
            'urls_text' => ['nullable', 'string', 'max:65535'],
            'mode' => ['required', 'string', Rule::in($modes)],
            'append_promo' => ['sometimes', 'boolean'],
            'promo_import_background' => ['sometimes', 'boolean'],
            'promo_poster_embed_only' => ['sometimes', 'boolean'],
        ]);

        $appendPromo = (bool) ($validated['append_promo'] ?? true);
        $posterEmbedOnly = (bool) ($validated['promo_poster_embed_only'] ?? false);
        $urlsText = trim((string) ($validated['urls_text'] ?? ''));
        $urlSingle = trim((string) ($validated['url'] ?? ''));

        if ($urlsText !== '') {
            $lines = preg_split('/\r\n|\r|\n/', $urlsText);
            $urls = array_values(array_filter(array_map('trim', $lines), fn (string $l) => $l !== ''));
        } elseif ($urlSingle !== '') {
            $urls = [$urlSingle];
        } else {
            return back()->with('error', 'En az bir bağlantı veya satır girin.');
        }

        $useQueue = $validated['mode'] === 'promo_video'
            && ! $posterEmbedOnly
            && $request->has('promo_import_background')
            && $request->boolean('promo_import_background');

        if ($useQueue) {
            $user = $request->user();
            if ($user === null) {
                return back()->with('error', 'Oturum gerekli.');
            }

            $statusId = (string) Str::uuid();
            PromoGalleryUrlImportStatus::boot($statusId, (int) $user->id, count($urls));

            ProcessPromoGalleryUrlImportJob::dispatch(
                $statusId,
                $model::class,
                $model->getKey(),
                $urls,
                $appendPromo,
                $posterEmbedOnly,
                (int) $user->id,
            );

            $n = count($urls);
            $queueHint = config('queue.default') === 'sync'
                ? ' '
                : ' Sunucuda «php artisan queue:work» çalışıyor olmalı. ';

            return back()
                ->with(
                    'success',
                    $n.' bağlantı arka planda işleniyor.'.$queueHint.'İlerleme aşağıda görünür; bittiğinde liste yenilenir.'
                )
                ->with('promo_import_status_id', $statusId);
        }

        if (count($urls) > 1) {
            $result = $importer->importMany($model->fresh(), $urls, $validated['mode'], $appendPromo, $posterEmbedOnly);
        } else {
            $result = $importer->import($model->fresh(), $urls[0], $validated['mode'], $appendPromo, $posterEmbedOnly);
        }

        if (! $result['success']) {
            return back()->with('error', $result['message']);
        }

        return back()->with('success', $result['message']);
    }

    protected function promoAppendFilesResponse(
        Request $request,
        Model $model,
        EventMediaImportFromUrlService $importer,
    ): RedirectResponse {
        $videoFileRules = ['file', 'max:102400', 'mimes:mp4,m4v,webm,mov'];

        $validated = $request->validate(
            [
                'promo_video_upload' => array_merge(['nullable'], $videoFileRules),
                'promo_poster_upload' => ['nullable', 'file', 'max:12288', 'image'],
                'promo_videos' => ['nullable', 'array', 'max:24'],
                'promo_videos.*' => $videoFileRules,
                'promo_post_images' => ['nullable', 'array', 'max:24'],
                'promo_post_images.*' => ['file', 'max:12288', 'image'],
                'append_promo' => ['sometimes', 'boolean'],
            ],
            [
                'promo_video_upload.uploaded' => 'Video sunucuya yüklenemedi. PHP upload_max_filesize / post_max_size ve Nginx client_max_body_size (ör. 128M) sınırlarını kontrol edin.',
                'promo_video_upload.max' => 'Tek video en fazla 100 MB olabilir.',
                'promo_video_upload.mimes' => 'Video yalnız MP4, M4V, WebM veya MOV olabilir.',
                'promo_videos.*.uploaded' => 'Tanıtım videosu sunucuya yüklenemedi. Ağ kesintisi veya boyut sınırı (PHP post_max_size, upload_max_filesize, Nginx client_max_body_size) olabilir.',
                'promo_videos.*.max' => 'Tek video en fazla 100 MB olabilir.',
                'promo_videos.*.mimes' => 'Tanıtım videosu yalnız MP4, M4V, WebM veya MOV olabilir.',
            ],
            [
                'promo_video_upload' => 'video dosyası',
                'promo_videos.*' => 'tanıtım videosu',
            ],
        );

        $append = (bool) ($validated['append_promo'] ?? true);
        $video = $request->file('promo_video_upload');
        $poster = $request->file('promo_poster_upload');

        $bulkVideos = $request->file('promo_videos', []);
        if (! is_array($bulkVideos)) {
            $bulkVideos = $bulkVideos !== null ? [$bulkVideos] : [];
        }
        $bulkPostImages = $request->file('promo_post_images', []);
        if (! is_array($bulkPostImages)) {
            $bulkPostImages = $bulkPostImages !== null ? [$bulkPostImages] : [];
        }

        $hasBulk = $bulkVideos !== [] || $bulkPostImages !== [];
        $hasLegacy = ($video !== null && $video->isValid()) || ($poster !== null && $poster->isValid());

        if (! $hasBulk && ! $hasLegacy) {
            return back()->with('error', 'Yüklenecek dosya seçin.');
        }

        if ($hasBulk) {
            if (! $append) {
                $importer->purgePromoGallery($model);
                $model->refresh();
            }

            $messages = [];

            if ($bulkPostImages !== []) {
                $r = $importer->appendPromoPostImagesFromUploads($model->fresh(), $bulkPostImages);
                if (! $r['success']) {
                    return back()->with('error', $r['message']);
                }
                $messages[] = $r['message'];
                $model->refresh();
            }

            if ($bulkVideos !== []) {
                $r = $importer->appendPromoVideosFromUploads($model->fresh(), $bulkVideos);
                if (! $r['success']) {
                    return back()->with('error', $r['message']);
                }
                $messages[] = $r['message'];
                $model->refresh();
            }

            if ($hasLegacy) {
                $legacy = $importer->appendPromoFromUploads($model->fresh(), $video, $poster, true);
                if (! $legacy['success']) {
                    return back()->with('error', $legacy['message']);
                }
                $messages[] = $legacy['message'];
            }

            return back()->with('success', implode(' ', $messages));
        }

        $result = $importer->appendPromoFromUploads($model->fresh(), $video, $poster, $append);
        if (! $result['success']) {
            return back()->with('error', $result['message']);
        }

        return back()->with('success', $result['message']);
    }

    protected function promoClearResponse(Model $model, EventMediaImportFromUrlService $importer): RedirectResponse
    {
        $importer->purgePromoGallery($model);

        return back()->with('success', 'Tanıtım medyası kaldırıldı.');
    }

    protected function promoRemoveItemResponse(
        Request $request,
        Model $model,
        EventMediaImportFromUrlService $importer,
    ): RedirectResponse {
        $validated = $request->validate([
            'index' => ['required', 'integer', 'min:0', 'max:50'],
        ]);

        $result = $importer->removePromoGalleryItemAtIndex($model->fresh(), (int) $validated['index']);

        if (! $result['success']) {
            return back()->with('error', $result['message']);
        }

        return back()->with('success', $result['message']);
    }
}
