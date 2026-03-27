<?php

namespace App\Models;

use App\Services\Admin\AdminSubscriptionAssignmentService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    protected $fillable = ['name', 'slug', 'membership_type', 'interval', 'trial_days', 'price', 'is_active', 'show_in_public_catalog', 'features'];

    protected $casts = [
        'price' => 'decimal:2',
        'is_active' => 'boolean',
        'show_in_public_catalog' => 'boolean',
        'trial_days' => 'integer',
    ];

    /**
     * Yönetici ataması: ücretli/yıllık paketler (iç “sınırsız ücretsiz” slug’ları hariç).
     *
     * @param  Builder<SubscriptionPlan>  $query
     * @return Builder<SubscriptionPlan>
     */
    public function scopeAdminAssignableFor($query, string $membershipType)
    {
        return $query
            ->where('is_active', true)
            ->where('membership_type', $membershipType)
            ->whereNotIn('slug', [
                AdminSubscriptionAssignmentService::COMPLIMENTARY_VENUE_SLUG,
                AdminSubscriptionAssignmentService::COMPLIMENTARY_ARTIST_SLUG,
            ])
            ->orderBy('price');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(UserSubscription::class);
    }
}
