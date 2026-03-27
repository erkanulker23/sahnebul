<?php

namespace App\Models;

use App\Support\CatalogEntityNew;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Venue extends Model
{
    protected $fillable = [
        'user_id', 'category_id', 'city_id', 'district_id', 'neighborhood_id',
        'name', 'slug', 'description', 'address', 'latitude', 'longitude', 'google_maps_url',
        'capacity', 'phone', 'whatsapp', 'website', 'social_links', 'cover_image',
        'promo_video_path', 'promo_embed_url', 'promo_gallery',
        'status', 'is_featured', 'is_active',
        'rating_avg', 'review_count', 'view_count',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'view_count' => 'integer',
        'social_links' => 'array',
        'promo_gallery' => 'array',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'is_new_on_platform',
    ];

    public function getIsNewOnPlatformAttribute(): bool
    {
        return CatalogEntityNew::isWithinBadgeWindow(
            $this->created_at,
            CatalogEntityNew::venueEligible((string) $this->status, (bool) $this->is_active),
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function neighborhood(): BelongsTo
    {
        return $this->belongsTo(Neighborhood::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(VenueMedia::class)->orderBy('order');
    }

    public function publicEditSuggestions(): MorphMany
    {
        return $this->morphMany(PublicEditSuggestion::class, 'suggestable');
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'venue_followers')->withTimestamps();
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    /** Ziyaretçi arayüzünde listelenir ve mekân sayfası açılır: onaylı + yayında. */
    public function scopeListedPublicly($query)
    {
        return $query->where('status', 'approved')->where('is_active', true);
    }
}
