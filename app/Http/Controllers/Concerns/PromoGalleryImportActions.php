<?php

namespace App\Http\Controllers\Concerns;

use App\Services\EventMediaImportFromUrlService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        ]);

        $appendPromo = (bool) ($validated['append_promo'] ?? true);
        $urlsText = trim((string) ($validated['urls_text'] ?? ''));
        $urlSingle = trim((string) ($validated['url'] ?? ''));

        if ($urlsText !== '') {
            $lines = preg_split('/\r\n|\r|\n/', $urlsText);
            $urls = array_values(array_filter(array_map('trim', $lines), fn (string $l) => $l !== ''));
            $result = $importer->importMany($model->fresh(), $urls, $validated['mode'], $appendPromo);
        } elseif ($urlSingle !== '') {
            $result = $importer->import($model->fresh(), $urlSingle, $validated['mode'], $appendPromo);
        } else {
            return back()->with('error', 'En az bir bağlantı veya satır girin.');
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
            'append_promo' => ['sometimes', 'boolean'],
        ]);

        $append = (bool) ($validated['append_promo'] ?? true);
        $video = $request->file('promo_video_upload');
        $poster = $request->file('promo_poster_upload');

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
