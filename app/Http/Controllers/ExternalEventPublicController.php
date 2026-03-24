<?php

namespace App\Http\Controllers;

use App\Models\ExternalEvent;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ExternalEventPublicController extends Controller
{
    /**
     * Kamu URL: /etkinlikler/dis{id} (şehir seç dış kaynak kartları).
     */
    public function showForPublicSegment(int $id, string $requestedSegment): Response|RedirectResponse
    {
        $canonical = 'dis'.$id;
        if (strtolower($requestedSegment) !== $canonical) {
            return redirect()->route('events.show', ['event' => $canonical], 301);
        }

        $externalEvent = ExternalEvent::query()
            ->where('source', 'bubilet_sehir_sec')
            ->whereKey($id)
            ->firstOrFail();

        $internal = $externalEvent->internalPublicUrlSegment();
        if ($internal !== null) {
            return redirect()->route('events.show', ['event' => $internal], 301);
        }

        $meta = is_array($externalEvent->meta) ? $externalEvent->meta : [];

        return Inertia::render('SehirSec/ExternalEventShow', [
            'event' => [
                'id' => $externalEvent->id,
                'public_segment' => $canonical,
                'title' => $externalEvent->title,
                'image_url' => $externalEvent->image_url,
                'venue_name' => $externalEvent->venue_name,
                'city_name' => $externalEvent->city_name,
                'category_name' => $externalEvent->category_name,
                'dates_line' => $meta['dates_line'] ?? null,
                'price_label' => $meta['price_label'] ?? null,
                'rank' => $meta['rank'] ?? null,
                'city_slug' => $meta['city_slug'] ?? null,
                'external_url' => $externalEvent->external_url,
                'description' => $externalEvent->description,
            ],
        ]);
    }
}
