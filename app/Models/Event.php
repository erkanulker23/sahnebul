<?php

namespace App\Models;

use App\Services\SahnebulMail;
use App\Support\EventPromoVenueProfileModeration;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class Event extends Model
{
    protected static function booted(): void
    {
        static::created(function (Event $event): void {
            if ($event->status === 'published') {
                SahnebulMail::eventPublishedForFavoriteArtists($event->load(['venue', 'artists']));
            }
        });

        static::updated(function (Event $event): void {
            if ($event->wasChanged('status')
                && $event->status === 'published'
                && $event->getOriginal('status') !== 'published') {
                SahnebulMail::eventPublishedForFavoriteArtists($event->load(['venue', 'artists']));
            }
        });
    }

    protected $fillable = [
        'venue_id', 'title', 'slug', 'event_type', 'description', 'start_date', 'end_date',
        'event_rules', 'ticket_price', 'entry_is_paid', 'capacity', 'sold_count', 'view_count', 'is_full', 'cover_image', 'listing_image', 'promo_video_path', 'promo_embed_url', 'promo_gallery', 'status',
        'sahnebul_reservation_enabled', 'ticket_outlets', 'ticket_purchase_note', 'ticket_acquisition_mode',
        'promo_show_on_venue_profile_posts', 'promo_show_on_venue_profile_videos', 'promo_venue_profile_moderation',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'ticket_price' => 'decimal:2',
        'entry_is_paid' => 'boolean',
        'is_full' => 'boolean',
        'view_count' => 'integer',
        'sahnebul_reservation_enabled' => 'boolean',
        'ticket_outlets' => 'array',
        'promo_gallery' => 'array',
        'promo_show_on_venue_profile_posts' => 'boolean',
        'promo_show_on_venue_profile_videos' => 'boolean',
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

    /**
     * @param  array<string, mixed>  $validated
     * @param  list<array{name: string, description: string|null, price: float, sort_order: int}>  $ticketTiers
     * @return array{0: array<string, mixed>, 1: list<array{name: string, description: string|null, price: float, sort_order: int}>}
     */
    public static function applyEntryPaidToValidated(array $validated, array $ticketTiers): array
    {
        $paid = (bool) ($validated['entry_is_paid'] ?? true);
        $validated['entry_is_paid'] = $paid;
        if (! $paid) {
            $validated['ticket_price'] = null;
            $ticketTiers = [];
        }

        return [$validated, $ticketTiers];
    }

    /** En düşük bilet fiyatı (kategoriler veya tek fiyat). */
    public function minPrice(): ?float
    {
        if (! ($this->entry_is_paid ?? true)) {
            return null;
        }
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

    /**
     * Genel liste, arama ve şehir seç: henüz “takvimde” sayılır — başlamamış veya end_date ile sürüyor.
     * Tek gün + başlangıç geçmişse gösterilmez (yakın etkinlik API’si ile aynı kural).
     *
     * @param  Builder<Event>  $query
     * @return Builder<Event>
     */
    public function scopeWhereStillVisibleOnPublicListing($query)
    {
        $table = $query->getModel()->getTable();

        return $query->where(function ($q) use ($table) {
            $q->where("{$table}.start_date", '>=', now())
                ->orWhere(function ($q2) use ($table) {
                    $q2->whereNotNull("{$table}.end_date")
                        ->where("{$table}.end_date", '>=', now())
                        ->where("{$table}.start_date", '<=', now());
                });
        });
    }

    /**
     * scopeWhereStillVisibleOnPublicListing tersi — geçmiş (çok günlük sürüyor değil).
     *
     * @param  Builder<Event>  $query
     * @return Builder<Event>
     */
    public function scopeWherePastOnPublicListing($query)
    {
        $table = $query->getModel()->getTable();

        return $query->where(function ($q) use ($table) {
            $q->where("{$table}.start_date", '<', now())
                ->whereNot(function ($q2) use ($table) {
                    $q2->whereNotNull("{$table}.end_date")
                        ->where("{$table}.end_date", '>=', now())
                        ->where("{$table}.start_date", '<=', now());
                });
        });
    }

    /**
     * Mekân profilinde tanıtımın gösterileceği son an (bitiş günü sonu; bitiş yoksa başlangıç günü sonu).
     */
    public function promoVenueDisplayUntil(): ?Carbon
    {
        if ($this->start_date === null) {
            return null;
        }
        if ($this->end_date !== null) {
            return $this->end_date->copy()->endOfDay();
        }

        return $this->start_date->copy()->endOfDay();
    }

    /**
     * Ziyaretçi mekân sayfasında bu etkinliğin tanıtımı listelensin mi (onay + tik + süre).
     */
    public function isPromoEligibleForVenueProfilePage(): bool
    {
        if ($this->status !== 'published') {
            return false;
        }
        $mod = $this->promo_venue_profile_moderation ?? EventPromoVenueProfileModeration::APPROVED;
        if ($mod !== EventPromoVenueProfileModeration::APPROVED) {
            return false;
        }
        if (! ($this->promo_show_on_venue_profile_posts ?? false) && ! ($this->promo_show_on_venue_profile_videos ?? false)) {
            return false;
        }
        $until = $this->promoVenueDisplayUntil();
        if ($until === null) {
            return false;
        }

        return $until->gte(now());
    }

    /**
     * Zamanlanmış görev: etkinlik süresi bittiyse tanıtım dosyaları silinebilir mi?
     */
    public function shouldPurgePromoMediaBySchedule(): bool
    {
        $until = $this->promoVenueDisplayUntil();
        if ($until === null) {
            return false;
        }
        if ($until->gte(now())) {
            return false;
        }
        $gallery = is_array($this->promo_gallery) ? $this->promo_gallery : [];
        $embed = is_string($this->promo_embed_url) ? trim($this->promo_embed_url) : '';

        return $gallery !== []
            || (is_string($this->promo_video_path) && trim($this->promo_video_path) !== '')
            || $embed !== '';
    }

    /**
     * @param  array<string, mixed>  $row
     */
    public static function promoRowKindForPublic(array $row): string
    {
        $vp = isset($row['video_path']) && is_string($row['video_path']) && trim($row['video_path']) !== '';
        if ($vp) {
            return 'story';
        }
        $pk = $row['promo_kind'] ?? null;
        if ($pk === 'story') {
            return 'story';
        }
        if ($pk === 'post') {
            return 'post';
        }
        $embed = isset($row['embed_url']) && is_string($row['embed_url']) ? $row['embed_url'] : '';
        $poster = isset($row['poster_path']) && is_string($row['poster_path']) && trim($row['poster_path']) !== '';
        if ($poster || str_contains($embed, 'instagram.com')) {
            return 'post';
        }

        return 'story';
    }

    /**
     * @param  array<string, mixed>  $row
     */
    public static function promoRowHasPublicContent(array $row): bool
    {
        if (isset($row['video_path']) && is_string($row['video_path']) && trim($row['video_path']) !== '') {
            return true;
        }
        if (isset($row['poster_path']) && is_string($row['poster_path']) && trim($row['poster_path']) !== '') {
            return true;
        }
        $embed = isset($row['embed_url']) && is_string($row['embed_url']) ? trim($row['embed_url']) : '';

        return $embed !== '';
    }

    /**
     * promo_video_path galeri satırlarında yoksa (eski senk / elle müdahale), videoyu JSON galerinin başına ekler; panel ve silme indeksleri tutarlı kalsın.
     */
    public function mergePromoGalleryOrphanLegacyVideoIntoGallery(): bool
    {
        $legacyVp = is_string($this->promo_video_path) ? trim($this->promo_video_path) : '';
        if ($legacyVp === '') {
            return false;
        }
        $raw = $this->promo_gallery;
        if (! is_array($raw) || $raw === []) {
            return false;
        }
        $list = array_values($raw);
        foreach ($list as $row) {
            if (! is_array($row)) {
                continue;
            }
            $vp = isset($row['video_path']) && is_string($row['video_path']) ? trim($row['video_path']) : '';
            if ($vp === $legacyVp) {
                return false;
            }
        }
        $legacyEu = is_string($this->promo_embed_url) ? trim($this->promo_embed_url) : '';
        array_unshift($list, [
            'embed_url' => $legacyEu !== '' ? $legacyEu : null,
            'video_path' => $legacyVp,
            'poster_path' => null,
            'promo_kind' => 'story',
        ]);
        $this->promo_gallery = array_values($list);

        return true;
    }

    /**
     * Ziyaretçi sayfası ile uyumlu, sıralı tanıtım satırları (galeri + tek alanlı eski kayıt).
     *
     * @return list<array{embed_url: string|null, video_path: string|null, poster_path: string|null, promo_kind: string|null}>
     */
    public function normalizedPromoGalleryRowsForPublic(): array
    {
        $raw = $this->promo_gallery;
        $out = [];
        if (is_array($raw) && $raw !== []) {
            $list = array_is_list($raw) ? $raw : array_values($raw);
            foreach ($list as $item) {
                if (! is_array($item)) {
                    continue;
                }
                $eu = $item['embed_url'] ?? null;
                $vp = $item['video_path'] ?? null;
                $pp = $item['poster_path'] ?? null;
                $pk = $item['promo_kind'] ?? null;
                $out[] = [
                    'embed_url' => is_string($eu) && trim($eu) !== '' ? trim($eu) : null,
                    'video_path' => is_string($vp) && trim($vp) !== '' ? trim($vp) : null,
                    'poster_path' => is_string($pp) && trim($pp) !== '' ? trim($pp) : null,
                    'promo_kind' => in_array($pk, ['post', 'story'], true) ? $pk : null,
                ];
            }

            $legacyVp = is_string($this->promo_video_path) ? trim($this->promo_video_path) : '';
            $legacyEu = is_string($this->promo_embed_url) ? trim($this->promo_embed_url) : '';
            if ($legacyVp !== '' && ! collect($out)->contains(fn (array $row): bool => ($row['video_path'] ?? '') === $legacyVp)) {
                array_unshift($out, [
                    'embed_url' => $legacyEu !== '' ? $legacyEu : null,
                    'video_path' => $legacyVp,
                    'poster_path' => null,
                    'promo_kind' => 'story',
                ]);
            }

            return $out;
        }

        $vp = is_string($this->promo_video_path) ? trim($this->promo_video_path) : '';
        $eu = is_string($this->promo_embed_url) ? trim($this->promo_embed_url) : '';
        if ($vp !== '' || $eu !== '') {
            return [[
                'embed_url' => $eu !== '' ? $eu : null,
                'video_path' => $vp !== '' ? $vp : null,
                'poster_path' => null,
                'promo_kind' => 'story',
            ]];
        }

        return [];
    }

    /**
     * Mekân profilinde gösterilecek öğeler (tik’lere göre; önce videolar, sonra gönderiler).
     *
     * @return list<array{embed_url: string|null, video_path: string|null, poster_path: string|null, promo_kind: string|null}>
     */
    public function promoItemsForVenueProfilePage(): array
    {
        $rows = $this->normalizedPromoGalleryRowsForPublic();
        $videos = [];
        $posts = [];
        foreach ($rows as $row) {
            if (! self::promoRowHasPublicContent($row)) {
                continue;
            }
            if (self::promoRowKindForPublic($row) === 'story') {
                $videos[] = $row;
            } else {
                $posts[] = $row;
            }
        }
        $merged = [];
        if ($this->promo_show_on_venue_profile_videos ?? false) {
            $merged = array_merge($merged, $videos);
        }
        if ($this->promo_show_on_venue_profile_posts ?? false) {
            $merged = array_merge($merged, $posts);
        }

        return $merged;
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

    /**
     * Ziyaretçi arayüzünde “etkinlik bitmiş” kabulü (bitiş yoksa başlangıç gününün İstanbul takvim günü sonu).
     */
    public function effectiveEndAt(): ?Carbon
    {
        if ($this->start_date === null) {
            return null;
        }
        if ($this->end_date !== null) {
            return $this->end_date->copy();
        }

        return $this->start_date->copy()->endOfDay();
    }

    public function isOngoingNow(?Carbon $at = null): bool
    {
        $at ??= now();
        if ($this->start_date === null || $this->status !== 'published') {
            return false;
        }
        $end = $this->effectiveEndAt();
        if ($end === null) {
            return false;
        }

        return $at->greaterThanOrEqualTo($this->start_date) && $at->lessThanOrEqualTo($end);
    }

    public function hasFinishedAt(?Carbon $at = null): bool
    {
        $at ??= now();
        if ($this->start_date === null) {
            return false;
        }
        if ($this->isOngoingNow($at)) {
            return false;
        }
        if ($at->lessThan($this->start_date)) {
            return false;
        }
        $end = $this->effectiveEndAt();

        return $end !== null && $at->greaterThan($end);
    }

    /**
     * JSON/Inertia’da offset’siz ISO üretilmesini engelle; tarayıcı TZ’sinden bağımsız İstanbul anı.
     */
    protected function serializeDate(\DateTimeInterface $date): string
    {
        return Carbon::instance($date)->timezone('Europe/Istanbul')->toIso8601String();
    }
}
