<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Auth\MustVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'pending_venue_name', 'organization_display_name', 'organization_tax_office', 'organization_tax_number', 'email', 'phone', 'password', 'role', 'city', 'interests', 'avatar', 'google_id', 'instagram_id', 'is_active', 'browser_notifications_enabled', 'event_reminder_email_enabled', 'event_reminder_sms_enabled', 'event_reminder_email_hour'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmailContract
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, MustVerifyEmail, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'interests' => 'array',
            'is_active' => 'boolean',
            'browser_notifications_enabled' => 'boolean',
            'event_reminder_email_enabled' => 'boolean',
            'event_reminder_sms_enabled' => 'boolean',
            'event_reminder_email_hour' => 'integer',
        ];
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    /**
     * Etkinlik değerlendirmesi: yalnızca bu etkinliğe bağlı onaylanmış veya tamamlanmış rezervasyon.
     */
    public function canSubmitEventReviewForEvent(int $eventId): bool
    {
        return $this->reservations()
            ->where('event_id', $eventId)
            ->whereIn('status', ['confirmed', 'completed'])
            ->exists();
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function venues(): HasMany
    {
        return $this->hasMany(Venue::class);
    }

    /** Organizasyon firması hesabının yönettiği sanatçı kayıtları (`artists.managed_by_user_id`). */
    public function managedArtists(): HasMany
    {
        return $this->hasMany(Artist::class, 'managed_by_user_id');
    }

    public function favoriteArtists(): BelongsToMany
    {
        return $this->belongsToMany(Artist::class, 'user_favorite_artists')->withTimestamps();
    }

    public function remindedEvents(): BelongsToMany
    {
        return $this->belongsToMany(Event::class, 'user_event_reminders')
            ->withTimestamps()
            ->withPivot('reminder_sent_at');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(UserSubscription::class);
    }

    public function activeSubscription(): ?UserSubscription
    {
        return $this->subscriptions()
            ->where('status', 'active')
            ->where('ends_at', '>', now())
            ->latest('ends_at')
            ->first();
    }

    public function hasActiveGoldSubscription(): bool
    {
        return $this->subscriptions()
            ->where('status', 'active')
            ->where('ends_at', '>', now())
            ->whereHas('plan', fn ($q) => $q->whereIn('slug', [
                'gold-monthly',
                'gold-yearly',
                'org-monthly',
                'org-yearly',
            ]))
            ->exists();
    }

    public function hasActiveMembership(string $type): bool
    {
        return $this->subscriptions()
            ->where('status', 'active')
            ->where('ends_at', '>', now())
            ->whereHas('plan', fn ($q) => $q->where('membership_type', $type))
            ->exists();
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['admin', 'super_admin'], true);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isArtist(): bool
    {
        return $this->role === 'artist';
    }

    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }

    /**
     * Favori sanatçı ve etkinlik hatırlatması (takip): giriş + doğrulanmış e-posta; yönetici hesapları hariç.
     */
    public function canUsePublicEngagementFeatures(): bool
    {
        if ($this->email_verified_at === null) {
            return false;
        }

        return ! $this->isAdmin();
    }

    /** Sanatçıyı favorilere ekle/çıkar (e-posta doğrulaması gerekmez; admin hesapları hariç). */
    public function canFavoriteArtists(): bool
    {
        return ! $this->isAdmin();
    }

    public function isVenueOwner(): bool
    {
        return $this->role === 'venue_owner';
    }

    public function isManagerOrganization(): bool
    {
        return $this->role === 'manager_organization';
    }

    /**
     * /sahne paneli ve mekan/etkinlik yönetimi (sanatçı, mekân sahibi, organizasyon yöneticisi veya bağlı içerik).
     */
    public function canAccessStagePanel(): bool
    {
        /** Platform personeli (admin / süper admin) sahne paneline erişemez — ayrıcalık sızıntısı ve veri karışıklığını önler. */
        if ($this->isAdmin()) {
            return false;
        }

        if ($this->isArtist() || $this->isVenueOwner() || $this->isManagerOrganization()) {
            return true;
        }

        $pendingVenue = is_string($this->pending_venue_name) && trim($this->pending_venue_name) !== '';

        return $pendingVenue
            || $this->venues()->exists()
            || $this->hasActiveMembership('venue')
            || $this->hasActiveMembership('manager');
    }
}
