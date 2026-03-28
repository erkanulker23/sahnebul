<?php

namespace App\Jobs;

use App\Services\EventMediaImportFromUrlService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Tanıtım galerisi için çoklu URL içe aktarımını kuyrukta sırayla işler (yt-dlp uzun sürebilir).
 */
class ProcessPromoGalleryUrlImportsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 900;

    /**
     * @param  class-string<Model>  $modelClass
     * @param  list<string>  $urls
     */
    public function __construct(
        public string $modelClass,
        public int|string $modelId,
        public array $urls,
        public string $mode,
        public bool $appendPromo,
        public bool $promoPosterEmbedOnly = false,
    ) {}

    public function handle(EventMediaImportFromUrlService $importer): void
    {
        if ($this->mode !== 'promo_video') {
            Log::warning('ProcessPromoGalleryUrlImportsJob: yalnızca promo_video desteklenir.', ['mode' => $this->mode]);

            return;
        }

        if (! class_exists($this->modelClass) || ! is_a($this->modelClass, Model::class, true)) {
            return;
        }

        /** @var Model|null $model */
        $model = $this->modelClass::query()->find($this->modelId);
        if ($model === null) {
            return;
        }

        if (! $this->appendPromo) {
            $importer->purgePromoGallery($model);
            $model->refresh();
        }

        $failures = [];
        $ok = 0;
        foreach ($this->urls as $url) {
            $url = trim((string) $url);
            if ($url === '') {
                continue;
            }
            $r = $importer->import($model->fresh(), $url, $this->mode, true, $this->promoPosterEmbedOnly);
            if ($r['success']) {
                $ok++;
            } else {
                $failures[] = Str::limit($url, 96).' — '.$r['message'];
            }
        }

        Log::info('promo gallery URL import job tamamlandı', [
            'model' => $this->modelClass,
            'id' => $this->modelId,
            'ok' => $ok,
            'lines' => count($this->urls),
            'failures' => array_slice($failures, 0, 12),
        ]);
    }
}
