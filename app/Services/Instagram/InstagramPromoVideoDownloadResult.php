<?php

namespace App\Services\Instagram;

/**
 * Instagram tanıtım videosu indirme pipeline çıktısı.
 */
final class InstagramPromoVideoDownloadResult
{
    /**
     * @param  list<string>  $successMessages
     */
    public function __construct(
        public readonly ?string $publicStoragePath,
        public readonly ?string $ytdlpDiagnosticError,
        public readonly array $successMessages,
    ) {}

    public function saved(): bool
    {
        return is_string($this->publicStoragePath) && trim($this->publicStoragePath) !== '';
    }
}
