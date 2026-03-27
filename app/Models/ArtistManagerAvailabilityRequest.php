<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArtistManagerAvailabilityRequest extends Model
{
    protected $fillable = [
        'manager_user_id',
        'artist_id',
        'artist_availability_day_id',
        'requested_date',
        'message',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'requested_date' => 'date',
        ];
    }

    public function managerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_user_id');
    }

    public function artist(): BelongsTo
    {
        return $this->belongsTo(Artist::class);
    }

    public function availabilityDay(): BelongsTo
    {
        return $this->belongsTo(ArtistAvailabilityDay::class, 'artist_availability_day_id');
    }
}
