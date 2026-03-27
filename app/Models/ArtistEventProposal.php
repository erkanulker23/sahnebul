<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArtistEventProposal extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'user_id',
        'artist_id',
        'status',
        'venue_payload',
        'event_payload',
        'admin_message',
        'reviewed_by_user_id',
        'reviewed_at',
        'created_venue_id',
        'created_event_id',
    ];

    protected function casts(): array
    {
        return [
            'venue_payload' => 'array',
            'event_payload' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function artist(): BelongsTo
    {
        return $this->belongsTo(Artist::class);
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }

    public function createdVenue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'created_venue_id');
    }

    public function createdEvent(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'created_event_id');
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }
}
