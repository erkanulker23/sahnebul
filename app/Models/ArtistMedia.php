<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArtistMedia extends Model
{
    public const MODERATION_APPROVED = 'approved';

    public const MODERATION_PENDING = 'pending';

    public const MODERATION_REJECTED = 'rejected';

    protected $table = 'artist_media';

    protected $fillable = [
        'artist_id', 'type', 'path', 'thumbnail', 'title', 'order',
        'moderation_status', 'moderation_note',
    ];

    public function artist(): BelongsTo
    {
        return $this->belongsTo(Artist::class);
    }

    public function scopeModerationApproved($query)
    {
        return $query->where('moderation_status', self::MODERATION_APPROVED);
    }

    public function scopeModerationPending($query)
    {
        return $query->where('moderation_status', self::MODERATION_PENDING);
    }
}
