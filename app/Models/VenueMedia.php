<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueMedia extends Model
{
    protected $fillable = ['venue_id', 'type', 'path', 'thumbnail', 'title', 'order'];

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }
}
