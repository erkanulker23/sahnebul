<?php

namespace App\Models;

use App\Support\CatalogEntityNew;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

class Artist extends Model
{
    protected $fillable = [
        'user_id',
        'managed_by_user_id',
        'name',
        'slug',
        'bio',
        'avatar',
        'banner_image',
        'genre',
        'music_genres',
        'website',
        'social_links',
        'manager_info',
        'public_contact',
        'status',
        'country_code',
        'view_count',
        'spotify_id',
        'spotify_url',
        'spotify_genres',
        'spotify_popularity',
        'spotify_followers',
        'spotify_albums',
        'spotify_auto_link_disabled',
        'availability_visible_to_managers',
        'promo_video_path', 'promo_embed_url', 'promo_gallery',
    ];

    protected $casts = [
        'spotify_auto_link_disabled' => 'boolean',
        'availability_visible_to_managers' => 'boolean',
        'social_links' => 'array',
        'manager_info' => 'array',
        'public_contact' => 'array',
        'view_count' => 'integer',
        'spotify_genres' => 'array',
        'spotify_albums' => 'array',
        'spotify_popularity' => 'integer',
        'spotify_followers' => 'integer',
        'music_genres' => 'array',
        'promo_gallery' => 'array',
    ];

    protected $appends = [
        'is_new_on_platform',
    ];

    public function getIsNewOnPlatformAttribute(): bool
    {
        return CatalogEntityNew::isWithinBadgeWindow(
            $this->created_at,
            CatalogEntityNew::artistEligible((string) $this->status),
        );
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Organizasyon / menajer hesabı (admin atar). */
    public function managedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'managed_by_user_id');
    }

    public function events(): BelongsToMany
    {
        return $this->belongsToMany(Event::class, 'event_artists')
            ->withPivot('is_headliner', 'order')
            ->withTimestamps();
    }

    /** Kullanıcı favorilerinde bu sanatçıyı ekleyenler */
    public function favoritedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_favorite_artists')->withTimestamps();
    }

    public function media(): HasMany
    {
        return $this->hasMany(ArtistMedia::class)->orderBy('order');
    }

    /** Kamu sanatçı sayfası — yalnızca onaylı galeri görselleri */
    public function approvedGalleryMedia(): HasMany
    {
        return $this->hasMany(ArtistMedia::class)
            ->where('moderation_status', ArtistMedia::MODERATION_APPROVED)
            ->orderBy('order');
    }

    public function publicEditSuggestions(): MorphMany
    {
        return $this->morphMany(PublicEditSuggestion::class, 'suggestable');
    }

    public function availabilityDays(): HasMany
    {
        return $this->hasMany(ArtistAvailabilityDay::class)->orderBy('date');
    }

    public function managerAvailabilityRequests(): HasMany
    {
        return $this->hasMany(ArtistManagerAvailabilityRequest::class);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /** Spotify keşif havuzu (INT) ile işaretlenen yabancı içe aktarımları listeden çıkarır. */
    public function scopeNotIntlImport($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('country_code')
                ->orWhere('country_code', '!=', 'INT');
        });
    }

    /**
     * MusicBrainz / Spotify meta etiketleri (ör. "Added For Google Code In 2016", "2010s") tür filtresinde gösterilmez.
     */
    /** Kamuya açık etkinlik formlarında: yalnızca onaylı, INT içe aktarma olmayan sanatçılar. */
    public static function ruleExistsInPublicCatalog(): Exists
    {
        return Rule::exists('artists', 'id')->where(function ($q) {
            $q->where('status', 'approved')
                ->where(function ($q2) {
                    $q2->whereNull('country_code')->orWhere('country_code', '!=', 'INT');
                });
        });
    }

    public static function isUsableCatalogGenre(?string $g): bool
    {
        if ($g === null) {
            return false;
        }
        $g = trim($g);
        if ($g === '' || mb_strlen($g) > 48) {
            return false;
        }
        $lower = mb_strtolower($g);
        foreach (['google', 'code in', 'added for', 'wikidata', 'musicbrainz'] as $bad) {
            if (str_contains($lower, $bad)) {
                return false;
            }
        }
        if (preg_match('/^\d{3,4}s?$/iu', $g)) {
            return false;
        }

        return true;
    }

    /**
     * `genre` sütununda virgülle ayrılmış birden fazla etiket olabilir.
     *
     * @return list<string>
     */
    public static function splitGenreFieldIntoLabels(?string $field): array
    {
        if ($field === null) {
            return [];
        }
        $field = trim($field);
        if ($field === '') {
            return [];
        }
        $parts = preg_split('/\s*,\s*/u', $field) ?: [];
        $out = [];
        foreach ($parts as $part) {
            $part = trim((string) $part);
            if ($part !== '') {
                $out[] = $part;
            }
        }

        return $out;
    }

    /**
     * @param  iterable<int, string|null>  $genreColumnValues
     * @return list<string>
     */
    public static function normalizeDistinctCatalogGenreLabels(iterable $genreColumnValues): array
    {
        $set = [];
        foreach ($genreColumnValues as $row) {
            if (! is_string($row)) {
                continue;
            }
            foreach (self::splitGenreFieldIntoLabels($row) as $label) {
                if (self::isUsableCatalogGenre($label)) {
                    $set[$label] = true;
                }
            }
        }
        $labels = array_keys($set);
        sort($labels);

        return $labels;
    }

    private static function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }

    /**
     * Tek bir katalog etiketi; `genre` değeri virgülle ayrılmış liste içinde geçebilir.
     *
     * @param  Builder<Artist>  $query
     * @return Builder<Artist>
     */
    public function scopeWhereGenreLabelMatches(Builder $query, string $label): Builder
    {
        $label = trim($label);
        if ($label === '') {
            return $query->whereRaw('1 = 0');
        }
        $e = self::escapeLike($label);

        return $query->where(function ($q) use ($label, $e) {
            $q->where('genre', $label)
                ->orWhere('genre', 'like', $e.',%')
                ->orWhere('genre', 'like', '%, '.$e)
                ->orWhere('genre', 'like', '%,'.$e)
                ->orWhere('genre', 'like', '%, '.$e.',%')
                ->orWhere('genre', 'like', '%,'.$e.',%');
        });
    }

    /**
     * @param  iterable<int, self>  $artists
     */
    public static function hydrateDisplayImages(iterable $artists): void
    {
        if ($artists instanceof \Illuminate\Database\Eloquent\Collection) {
            $models = $artists;
        } elseif ($artists instanceof Collection) {
            $models = new \Illuminate\Database\Eloquent\Collection($artists->all());
        } else {
            $models = new \Illuminate\Database\Eloquent\Collection(
                is_array($artists) ? $artists : iterator_to_array($artists)
            );
        }

        if ($models->isEmpty()) {
            return;
        }

        $models->loadMissing([
            'media' => fn ($m) => $m->where('moderation_status', ArtistMedia::MODERATION_APPROVED)->orderBy('order')->limit(1),
        ]);
        foreach ($models as $artist) {
            $fallback = $artist->media->first();
            $path = $artist->avatar ?? $fallback?->path ?? $fallback?->thumbnail;
            $artist->setAttribute('display_image', $path);
        }
    }
}
