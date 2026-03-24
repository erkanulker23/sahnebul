<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * MusicBrainz Web Service — anahtar gerekmez; resmi kural: istekler arasında ≥1 sn ve tanımlı User-Agent.
 *
 * @see https://musicbrainz.org/doc/MusicBrainz_API
 */
class MusicBrainzClient
{
    private float $lastRequestAt = 0.0;

    /**
     * @param  array<string, scalar|null>  $query
     * @return array<string, mixed>|null
     */
    public function get(string $path, array $query = []): ?array
    {
        $this->throttle();

        $ua = (string) config('services.musicbrainz.user_agent', 'Sahnebul/1.0');
        $url = 'https://musicbrainz.org/ws/2/'.ltrim($path, '/');

        for ($attempt = 0; $attempt < 4; $attempt++) {
            try {
                $response = Http::timeout(30)
                    ->withHeaders([
                        'User-Agent' => $ua,
                        'Accept' => 'application/json',
                    ])
                    ->get($url, $query);

                if (! $response->ok()) {
                    return null;
                }

                /** @var array<string, mixed> */
                return $response->json();
            } catch (\Illuminate\Http\Client\ConnectionException) {
                if ($attempt === 3) {
                    return null;
                }
                sleep(2 + $attempt);
            }
        }

        return null;
    }

    private function throttle(): void
    {
        $minInterval = (float) config('services.musicbrainz.min_interval_seconds', 1.1);
        $now = microtime(true);
        $elapsed = $now - $this->lastRequestAt;
        if ($elapsed < $minInterval) {
            usleep((int) (($minInterval - $elapsed) * 1_000_000));
        }
        $this->lastRequestAt = microtime(true);
    }
}
