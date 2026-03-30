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
use Throwable;

/**
 * Eski deploy’larda yanlışlıkla bu sınıf adıyla kuyruğa yazılmış işleri bozmamak için.
 * Yeni kod {@see ProcessPromoGalleryUrlImportJob} kullanır; kuyruk temizlendikten sonra bu dosya silinebilir.
 */
final class ProcessPromoGalleryUrlImportsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 900;

    /**
     * @param  list<string>  $urls
     */
    public function __construct(
        public string $modelClass,
        public int|string $modelId,
        public array $urls,
        public string $mode,
        public bool $appendPromo,
        public bool $promoPosterEmbedOnly,
    ) {}

    public function handle(EventMediaImportFromUrlService $importer): void
    {
        if (! class_exists($this->modelClass) || ! is_a($this->modelClass, Model::class, true)) {
            Log::warning('promo URL import (legacy job): geçersiz model sınıfı', ['class' => $this->modelClass]);

            return;
        }

        /** @var Model|null $model */
        $model = $this->modelClass::query()->find($this->modelId);
        if ($model === null) {
            Log::warning('promo URL import (legacy job): model yok', ['class' => $this->modelClass, 'id' => $this->modelId]);

            return;
        }

        if ($this->mode !== 'promo_video') {
            Log::notice('promo URL import (legacy job): yalnızca promo_video desteklenir', ['mode' => $this->mode]);

            return;
        }

        try {
            if (! $this->appendPromo) {
                $importer->purgePromoGallery($model);
                $model->refresh();
            }

            foreach ($this->urls as $url) {
                $url = trim((string) $url);
                if ($url === '') {
                    continue;
                }
                $importer->import($model->fresh(), $url, 'promo_video', true, $this->promoPosterEmbedOnly, null);
            }

            Log::info('promo URL import (legacy ProcessPromoGalleryUrlImportsJob) tamamlandı', [
                'model' => $this->modelClass,
                'id' => $this->modelId,
                'lines' => count($this->urls),
            ]);
        } catch (Throwable $e) {
            Log::error('promo URL import (legacy job) istisna', [
                'model' => $this->modelClass,
                'id' => $this->modelId,
                'exception' => $e->getMessage(),
            ]);
            report($e);
            throw $e;
        }
    }
}
