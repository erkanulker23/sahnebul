<?php

namespace App\Jobs;

use App\Models\Event;
use App\Services\EventMediaImportFromUrlService;
use App\Support\EventPromoVenueProfileModeration;
use App\Support\PromoGalleryUrlImportStatus;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;
use Throwable;

final class ProcessPromoGalleryUrlImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 900;

    /**
     * @param  list<string>  $urls
     */
    public function __construct(
        public string $statusId,
        public string $modelClass,
        public int|string $modelId,
        public array $urls,
        public bool $appendPromo,
        public bool $posterEmbedOnly,
        public int $userId,
        public bool $promoFromAdmin = true,
        public ?string $promoGallerySlot = null,
    ) {}

    public function handle(EventMediaImportFromUrlService $importer): void
    {
        if (! class_exists($this->modelClass) || ! is_a($this->modelClass, Model::class, true)) {
            PromoGalleryUrlImportStatus::put($this->statusId, [
                'state' => 'failed',
                'message' => 'Geçersiz kayıt türü.',
            ]);

            return;
        }

        /** @var Model|null $freshModel */
        $freshModel = $this->modelClass::query()->find($this->modelId);
        if ($freshModel === null) {
            PromoGalleryUrlImportStatus::put($this->statusId, [
                'state' => 'failed',
                'message' => 'Kayıt bulunamadı (silinmiş olabilir).',
            ]);

            return;
        }

        PromoGalleryUrlImportStatus::put($this->statusId, [
            'state' => 'running',
            'message' => 'İçe aktarma başladı…',
        ]);

        try {
            if (! $this->appendPromo) {
                $importer->purgePromoGallery($freshModel);
                $freshModel->refresh();
            }

            $failures = [];
            $ok = 0;
            $urls = array_values(array_filter(array_map('trim', $this->urls), fn (string $u) => $u !== ''));
            $total = max(1, count($urls));

            foreach ($urls as $i => $url) {
                $n = $i + 1;
                PromoGalleryUrlImportStatus::put($this->statusId, [
                    'state' => 'running',
                    'current' => $n,
                    'total' => $total,
                    'active_url' => Str::limit($url, 96),
                    'message' => $this->posterEmbedOnly
                        ? "Gönderi görseli işleniyor ({$n}/{$total})…"
                        : "Video indiriliyor ({$n}/{$total})…",
                ]);

                $r = $importer->import(
                    $freshModel->fresh(),
                    $url,
                    'promo_video',
                    true,
                    $this->posterEmbedOnly,
                    $this->promoGallerySlot,
                );
                if ($r['success']) {
                    $ok++;
                    PromoGalleryUrlImportStatus::put($this->statusId, [
                        'ok' => $ok,
                        'message' => $total > 1
                            ? "Tamamlandı: {$n}/{$total} satır işlendi (başarılı: {$ok})."
                            : ($this->posterEmbedOnly ? 'Gönderi işlendi.' : 'Video işlendi.'),
                    ]);
                } else {
                    $failures[] = Str::limit($url, 96).' — '.$r['message'];
                    PromoGalleryUrlImportStatus::put($this->statusId, [
                        'failures' => $failures,
                        'message' => "Satır {$n}/{$total} başarısız; devam ediliyor…",
                    ]);
                }
            }

            $summary = "{$ok}/{$total} bağlantı işlendi.";
            if ($failures !== []) {
                $summary .= ' '.implode(' | ', array_slice($failures, 0, 4));
                if (count($failures) > 4) {
                    $summary .= ' …';
                }
            }

            PromoGalleryUrlImportStatus::put($this->statusId, [
                'state' => $ok > 0 ? 'completed' : 'failed',
                'current' => $total,
                'active_url' => null,
                'message' => $summary,
                'ok' => $ok,
                'failures' => $failures,
            ]);

            $finalModel = $this->modelClass::query()->find($this->modelId);
            if ($finalModel instanceof Event) {
                EventPromoVenueProfileModeration::syncAfterPromoMutationFromAdminFlag($finalModel->fresh(), $this->promoFromAdmin);
            }
        } catch (Throwable $e) {
            report($e);
            PromoGalleryUrlImportStatus::put($this->statusId, [
                'state' => 'failed',
                'active_url' => null,
                'message' => 'İçe aktarma hata verdi: '.$e->getMessage(),
            ]);
        }
    }

    public function failed(?Throwable $exception): void
    {
        $prev = PromoGalleryUrlImportStatus::get($this->statusId) ?? [];
        $msg = $exception !== null ? $exception->getMessage() : 'Kuyruk işi başarısız.';
        PromoGalleryUrlImportStatus::put($this->statusId, array_merge($prev, [
            'state' => 'failed',
            'active_url' => null,
            'message' => 'İşlem tamamlanamadı: '.$msg,
        ]));
    }
}
