<?php

namespace App\Http\Controllers\Concerns;

use App\Services\EventMediaImportFromUrlService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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

        // Admin paneli: her zaman senkron yanıt (gerçek başarı/hata mesajı). Arka plan yalnızca sanatçı/mekân panelinde.
        $useQueue = ! $request->is('admin/*')
            && $validated['mode'] === 'promo_video'
            && $request->has('promo_import_background')
            && $request->boolean('promo_import_background');

        if ($useQueue) {
            $modelClass = $model::class;
            $modelId = $model->getKey();
            $mode = $validated['mode'];
            $urlsCopy = $urls;
            $append = $appendPromo;
            $posterOnly = $posterEmbedOnly;

            dispatch(function () use ($modelClass, $modelId, $urlsCopy, $mode, $append, $posterOnly): void {
                if ($mode !== 'promo_video') {
                    Log::warning('promo URL import (afterResponse): yalnızca promo_video desteklenir.', ['mode' => $mode]);

                    return;
                }
                if (! class_exists($modelClass) || ! is_a($modelClass, Model::class, true)) {
                    return;
                }
                /** @var Model|null $freshModel */
                $freshModel = $modelClass::query()->find($modelId);
                if ($freshModel === null) {
                    Log::warning('promo URL import (afterResponse): model bulunamadı.', ['class' => $modelClass, 'id' => $modelId]);

                    return;
                }

                $importer = app(EventMediaImportFromUrlService::class);

                try {
                    if (! $append) {
                        $importer->purgePromoGallery($freshModel);
                        $freshModel->refresh();
                    }

                    $failures = [];
                    $ok = 0;
                    foreach ($urlsCopy as $url) {
                        $url = trim((string) $url);
                        if ($url === '') {
                            continue;
                        }
                        $r = $importer->import($freshModel->fresh(), $url, $mode, true, $posterOnly);
                        if ($r['success']) {
                            $ok++;
                        } else {
                            $failures[] = Str::limit($url, 96).' — '.$r['message'];
                        }
                    }

                    Log::info('promo gallery URL import (afterResponse) tamamlandı', [
                        'model' => $modelClass,
                        'id' => $modelId,
                        'ok' => $ok,
                        'lines' => count($urlsCopy),
                        'failures' => array_slice($failures, 0, 12),
                    ]);

                    if ($failures !== [] && $ok === 0) {
                        Log::warning('promo gallery URL import: tüm satırlar başarısız', [
                            'model' => $modelClass,
                            'id' => $modelId,
                            'failures' => $failures,
                        ]);
                    }
                } catch (\Throwable $e) {
                    Log::error('promo gallery URL import (afterResponse) istisna', [
                        'model' => $modelClass,
                        'id' => $modelId,
                        'exception' => $e->getMessage(),
                    ]);
                    report($e);
                }
            })->afterResponse();

            $n = count($urls);

            return back()->with(
                'success',
                $n.' bağlantı yanıt gönderildikten sonra sunucuda sırayla işleniyor (queue worker gerekmez). Bir süre sonra sayfayı yenileyin; sorun olursa sunucu günlüğüne bakın.'
            );
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
        $validated = $request->validate([
            'promo_video_upload' => ['nullable', 'file', 'max:102400', 'mimetypes:video/mp4,video/webm,video/quicktime'],
            'promo_poster_upload' => ['nullable', 'file', 'max:12288', 'image'],
            'promo_videos' => ['nullable', 'array', 'max:24'],
            'promo_videos.*' => ['file', 'max:102400', 'mimetypes:video/mp4,video/webm,video/quicktime'],
            'promo_post_images' => ['nullable', 'array', 'max:24'],
            'promo_post_images.*' => ['file', 'max:12288', 'image'],
            'append_promo' => ['sometimes', 'boolean'],
        ]);

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
