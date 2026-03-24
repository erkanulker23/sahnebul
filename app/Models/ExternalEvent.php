<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExternalEvent extends Model
{
    protected $fillable = [
        'source',
        'fingerprint',
        'title',
        'external_url',
        'image_url',
        'venue_name',
        'city_name',
        'category_name',
        'start_date',
        'description',
        'meta',
        'synced_event_id',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'meta' => 'array',
    ];

    public function syncedEvent(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'synced_event_id');
    }

    /**
     * Platformda yayınlanmış eşleşen etkinlik varsa kamu detay URL segmenti (slug-id), yoksa null.
     */
    public function internalPublicUrlSegment(): ?string
    {
        if ($this->synced_event_id === null) {
            return null;
        }

        $event = $this->relationLoaded('syncedEvent')
            ? $this->syncedEvent
            : $this->syncedEvent()->first(['id', 'slug', 'status', 'venue_id']);

        if ($event === null || $event->status !== 'published') {
            return null;
        }

        if (! $event->relationLoaded('venue')) {
            $event->load(['venue' => fn ($q) => $q->select('id', 'status')]);
        }

        if (($event->venue?->status ?? '') !== 'approved') {
            return null;
        }

        return $event->publicUrlSegment();
    }
}
