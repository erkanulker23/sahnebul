<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArtistMedia extends Model
{
    protected $table = 'artist_media';

    protected $fillable = ['artist_id', 'type', 'path', 'thumbnail', 'title', 'order'];

    public function artist(): BelongsTo
    {
        return $this->belongsTo(Artist::class);
    }
}
