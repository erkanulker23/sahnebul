<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class City extends Model
{
    protected $fillable = ['name', 'slug', 'latitude', 'longitude', 'external_id'];

    /**
     * TurkiyeAPI ile eşleşen iller (external_id dolu) — formlar ve API seçim listeleri.
     */
    public function scopeTurkiyeProvinces(Builder $query): Builder
    {
        return $query->whereNotNull('external_id')->orderBy('name');
    }

    public function districts(): HasMany
    {
        return $this->hasMany(District::class);
    }

    public function venues(): HasMany
    {
        return $this->hasMany(Venue::class);
    }
}
