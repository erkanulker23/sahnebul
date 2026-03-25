<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

class Artist extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'bio',
        'avatar',
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
    ];

    protected $casts = [
        'social_links' => 'array',
        'manager_info' => 'array',
        'public_contact' => 'array',
        'view_count' => 'integer',
        'spotify_genres' => 'array',
        'spotify_albums' => 'array',
        'spotify_popularity' => 'integer',
        'spotify_followers' => 'integer',
        'music_genres' => 'array',
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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

        $models->loadMissing(['media' => fn ($m) => $m->orderBy('order')->limit(1)]);
        foreach ($models as $artist) {
            $fallback = $artist->media->first();
            $path = $artist->avatar ?? $fallback?->path ?? $fallback?->thumbnail;
            $artist->setAttribute('display_image', $path);
        }
    }
}
