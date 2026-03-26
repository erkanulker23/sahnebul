<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class Event extends Model
{
    protected $fillable = [
        'venue_id', 'title', 'slug', 'description', 'start_date', 'end_date',
        'event_rules', 'ticket_price', 'capacity', 'sold_count', 'view_count', 'is_full', 'cover_image', 'listing_image', 'status',
        'sahnebul_reservation_enabled', 'ticket_outlets', 'ticket_purchase_note', 'ticket_acquisition_mode',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'ticket_price' => 'decimal:2',
        'is_full' => 'boolean',
        'view_count' => 'integer',
        'sahnebul_reservation_enabled' => 'boolean',
        'ticket_outlets' => 'array',
    ];

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function artists(): BelongsToMany
    {
        return $this->belongsToMany(Artist::class, 'event_artists')
            ->withPivot('is_headliner', 'order')
            ->withTimestamps();
    }

    public function artistReports(): HasMany
    {
        return $this->hasMany(EventArtistReport::class);
    }

    /**
     * @param  list<int|string>  $artistIds
     */
    public function syncArtistsByIds(array $artistIds): void
    {
        $ordered = array_values(array_unique(array_map('intval', $artistIds)));
        $ordered = array_values(array_filter($ordered, fn (int $id) => $id > 0));
        $sync = [];
        foreach ($ordered as $order => $id) {
            $sync[$id] = ['is_headliner' => $order === 0, 'order' => $order];
        }
        $this->artists()->sync($sync);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function eventReviews(): HasMany
    {
        return $this->hasMany(EventReview::class);
    }

    public function ticketTiers(): HasMany
    {
        return $this->hasMany(EventTicketTier::class)->orderBy('sort_order');
    }

    /** En düşük bilet fiyatı (kategoriler veya tek fiyat). */
    public function minPrice(): ?float
    {
        if ($this->relationLoaded('ticketTiers') && $this->ticketTiers->isNotEmpty()) {
            return (float) $this->ticketTiers->min('price');
        }
        if ($this->ticket_price !== null) {
            return (float) $this->ticket_price;
        }

        return null;
    }

    /**
     * @param  array<int, array{name?: string, description?: string|null, price?: mixed, sort_order?: int}>|null  $tiers
     */
    public function syncTicketTiers(?array $tiers): void
    {
        $this->ticketTiers()->delete();
        if (empty($tiers)) {
            return;
        }
        foreach (array_values($tiers) as $i => $row) {
            $name = isset($row['name']) ? trim((string) $row['name']) : '';
            if ($name === '' || ! isset($row['price'])) {
                continue;
            }
            $this->ticketTiers()->create([
                'name' => $name,
                'description' => isset($row['description']) ? trim((string) $row['description']) ?: null : null,
                'price' => $row['price'],
                'sort_order' => (int) ($row['sort_order'] ?? $i),
            ]);
        }
    }

    /**
     * İstek gövdesindeki bilet kategorilerinden yalnızca adı ve geçerli fiyatı dolu satırları alır (boş şablon satırlarını atar).
     *
     * @return list<array{name: string, description: string|null, price: float, sort_order: int}>
     */
    public static function filterTicketTierRowsFromRequestInput(mixed $raw): array
    {
        if (! is_array($raw)) {
            return [];
        }
        $out = [];
        foreach ($raw as $row) {
            if (! is_array($row)) {
                continue;
            }
            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $priceRaw = $row['price'] ?? null;
            if ($priceRaw === '' || $priceRaw === null) {
                continue;
            }
            if (! is_numeric($priceRaw)) {
                continue;
            }
            $price = (float) $priceRaw;
            if ($price < 0) {
                continue;
            }
            $desc = $row['description'] ?? null;
            $description = is_string($desc) ? (trim($desc) !== '' ? trim($desc) : null) : null;
            $out[] = [
                'name' => $name,
                'description' => $description,
                'price' => $price,
                'sort_order' => count($out),
            ];
        }

        return $out;
    }

    public function scopePublished($query)
    {
        return $query->where($query->getModel()->getTable().'.status', 'published');
    }

    public function scopeUpcoming($query)
    {
        return $query->where('start_date', '>=', now());
    }

    public function scopePast($query)
    {
        return $query->where('start_date', '<', now());
    }

    /** Kamu detay URL’si: /etkinlikler/{slug}-{id} */
    public function publicUrlSegment(): string
    {
        return $this->slug.'-'.$this->id;
    }

    /**
     * Liste / kart görseli yolu: önce listeleme, yoksa kapak (frontend ile aynı kural).
     */
    public function listingThumbnailPath(): ?string
    {
        foreach ([$this->listing_image, $this->cover_image] as $p) {
            if (is_string($p) && trim($p) !== '') {
                return trim($p);
            }
        }

        return null;
    }

    /**
     * Kapak dosyası event-listings’a, liste dosyası event-covers’a yazılmışsa sütunları düzeltir.
     */
    public function repairSwappedStorageFoldersIfNeeded(): bool
    {
        $cover = $this->cover_image;
        $listing = $this->listing_image;
        if (! is_string($cover) || trim($cover) === '' || ! is_string($listing) || trim($listing) === '') {
            return false;
        }
        $c = Str::lower($cover);
        $l = Str::lower($listing);
        $coverLooksListing = str_contains($c, 'event-listings');
        $listingLooksCover = str_contains($l, 'event-covers');
        if (! $coverLooksListing || ! $listingLooksCover) {
            return false;
        }
        $this->forceFill([
            'cover_image' => trim($listing),
            'listing_image' => trim($cover),
        ])->saveQuietly();

        return true;
    }

    /**
     * @param  array<int, mixed>|null  $raw
     * @return list<array{label: string, url: string}>
     */
    public static function normalizeTicketOutletsInput(?array $raw): array
    {
        if ($raw === null || $raw === []) {
            return [];
        }

        $out = [];
        foreach ($raw as $row) {
            if (! is_array($row)) {
                continue;
            }
            $label = trim((string) ($row['label'] ?? ''));
            $url = trim((string) ($row['url'] ?? ''));
            if ($label === '' || $url === '') {
                continue;
            }
            if (filter_var($url, FILTER_VALIDATE_URL) === false || ! preg_match('#^https?://#i', $url)) {
                continue;
            }
            $out[] = ['label' => $label, 'url' => $url];
        }

        return array_slice($out, 0, 15);
    }

    public const TICKET_MODE_EXTERNAL = 'external_platforms';

    public const TICKET_MODE_SAHNEBUL = 'sahnebul';

    public const TICKET_MODE_PHONE = 'phone_only';

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public static function applyTicketAcquisitionToValidatedArray(array $validated): array
    {
        $mode = $validated['ticket_acquisition_mode'] ?? self::TICKET_MODE_SAHNEBUL;
        if (! in_array($mode, [self::TICKET_MODE_EXTERNAL, self::TICKET_MODE_SAHNEBUL, self::TICKET_MODE_PHONE], true)) {
            $mode = self::TICKET_MODE_SAHNEBUL;
        }
        $validated['ticket_acquisition_mode'] = $mode;

        $outlets = self::normalizeTicketOutletsInput($validated['ticket_outlets'] ?? null);

        if ($mode === self::TICKET_MODE_EXTERNAL && count($outlets) === 0) {
            $status = $validated['status'] ?? 'draft';
            if ($status === 'published') {
                throw ValidationException::withMessages([
                    'ticket_outlets' => 'Yayında durumunda harici platform seçiliyse en az bir geçerli bağlantı girin (https ile başlayan bilet sayfası). Taslak olarak kaydedip bağlantıları sonra ekleyebilirsiniz.',
                ]);
            }
        }

        if ($mode === self::TICKET_MODE_EXTERNAL) {
            $validated['ticket_outlets'] = $outlets;
            $validated['sahnebul_reservation_enabled'] = false;
        } elseif ($mode === self::TICKET_MODE_SAHNEBUL) {
            $validated['ticket_outlets'] = $outlets;
            $validated['sahnebul_reservation_enabled'] = true;
        } else {
            $validated['ticket_outlets'] = [];
            $validated['sahnebul_reservation_enabled'] = false;
        }

        return $validated;
    }
}
