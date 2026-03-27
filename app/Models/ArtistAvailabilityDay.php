<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ArtistAvailabilityDay extends Model
{
    protected $fillable = ['artist_id', 'date', 'note'];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    public function artist(): BelongsTo
    {
        return $this->belongsTo(Artist::class);
    }

    public function managerRequests(): HasMany
    {
        return $this->hasMany(ArtistManagerAvailabilityRequest::class, 'artist_availability_day_id');
    }
}
