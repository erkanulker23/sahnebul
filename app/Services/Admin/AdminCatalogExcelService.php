<?php

namespace App\Services\Admin;

use App\Models\Artist;
use App\Models\Category;
use App\Models\City;
use App\Models\District;
use App\Models\Event;
use App\Models\MusicGenre;
use App\Models\Neighborhood;
use App\Models\User;
use App\Models\Venue;
use App\Support\ArtistProfileInputs;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class AdminCatalogExcelService
{
    /** @var list<string> */
    private const VENUE_HEADERS = [
        'id', 'user_id', 'category_id', 'city_id', 'district_id', 'neighborhood_id',
        'name', 'slug', 'description', 'address', 'latitude', 'longitude', 'capacity',
        'phone', 'whatsapp', 'website', 'social_links', 'cover_image', 'status',
        'is_featured', 'rating_avg', 'review_count', 'view_count', 'created_at', 'updated_at',
    ];

    /** @var list<string> */
    private const EVENT_HEADERS = [
        'id', 'venue_id', 'title', 'slug', 'description', 'event_rules', 'start_date', 'end_date',
        'ticket_price', 'capacity', 'sold_count', 'view_count', 'is_full', 'cover_image', 'status',
        'sahnebul_reservation_enabled', 'ticket_acquisition_mode', 'ticket_outlets', 'ticket_purchase_note',
        'artist_ids', 'ticket_tiers', 'created_at', 'updated_at',
    ];

    /** @var list<string> */
    private const ARTIST_HEADERS = [
        'id', 'user_id', 'name', 'slug', 'bio', 'avatar', 'genre', 'music_genres', 'website',
        'social_links', 'manager_info', 'public_contact', 'status', 'country_code', 'view_count',
        'spotify_id', 'spotify_url', 'spotify_genres', 'spotify_popularity', 'spotify_followers', 'spotify_albums',
        'created_at', 'updated_at',
    ];

    /** @var list<string> */
    private const CATEGORY_HEADERS = ['id', 'name', 'slug', 'icon', 'order', 'created_at', 'updated_at'];

    /** @var list<string> */
    private const MUSIC_GENRE_HEADERS = ['id', 'name', 'slug', 'order', 'created_at', 'updated_at'];

    public static function exportVenues(): StreamedResponse
    {
        $rows = Venue::query()->orderBy('id')->get()->map(function (Venue $v) {
            return [
                (string) $v->id,
                self::scalar($v->user_id),
                (string) $v->category_id,
                (string) $v->city_id,
                self::scalar($v->district_id),
                self::scalar($v->neighborhood_id),
                $v->name,
                $v->slug,
                self::scalar($v->description),
                $v->address,
                self::scalar($v->latitude),
                self::scalar($v->longitude),
                self::scalar($v->capacity),
                self::scalar($v->phone),
                self::scalar($v->whatsapp),
                self::scalar($v->website),
                self::jsonCell($v->social_links),
                self::scalar($v->cover_image),
                $v->status,
                $v->is_featured ? '1' : '0',
                (string) $v->rating_avg,
                (string) $v->review_count,
                (string) $v->view_count,
                self::dt($v->created_at),
                self::dt($v->updated_at),
            ];
        })->all();

        return AdminSpreadsheetIo::downloadXlsx('mekanlar.xlsx', self::VENUE_HEADERS, $rows);
    }

    public static function importVenues(UploadedFile $file): RedirectResponse
    {
        $sheet = AdminSpreadsheetIo::readAssocRows($file);
        if ($sheet === []) {
            return back()->with('error', 'Excel dosyasında veri satırı bulunamadı.');
        }

        $created = 0;
        $updated = 0;
        $errors = [];

        $venueRules = [
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'city_id' => ['required', 'integer', 'exists:cities,id'],
            'district_id' => ['nullable', 'integer', 'exists:districts,id'],
            'neighborhood_id' => ['nullable', 'integer', 'exists:neighborhoods,id'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'address' => ['required', 'string', 'max:1000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'phone' => ['nullable', 'string', 'max:40'],
            'whatsapp' => ['nullable', 'string', 'max:40'],
            'website' => ['nullable', 'url', 'max:255'],
            'social_links' => ['nullable', 'array'],
            'social_links.*' => ['nullable', 'string', 'max:500'],
            'cover_image' => ['nullable', 'string', 'max:4096'],
            'status' => ['required', 'in:pending,approved,rejected'],
            'is_featured' => ['boolean'],
            'rating_avg' => ['integer', 'min:0'],
            'review_count' => ['integer', 'min:0'],
            'view_count' => ['integer', 'min:0'],
        ];

        foreach ($sheet as $idx => $row) {
            $line = $idx + 2;
            try {
                $id = self::rowIdOrNull($row['id'] ?? null);
                $social = self::decodeJsonArrayish($row['social_links'] ?? null);
                if (is_array($social)) {
                    $social = ArtistProfileInputs::normalizeSocialLinks($social);
                }

                $payload = [
                    'user_id' => self::positiveIntOrNull($row['user_id'] ?? null),
                    'category_id' => (int) ($row['category_id'] ?? 0),
                    'city_id' => (int) ($row['city_id'] ?? 0),
                    'district_id' => self::positiveIntOrNull($row['district_id'] ?? null),
                    'neighborhood_id' => self::positiveIntOrNull($row['neighborhood_id'] ?? null),
                    'name' => $row['name'] ?? '',
                    'slug' => $row['slug'] ?? null,
                    'description' => $row['description'] ?? null,
                    'address' => $row['address'] ?? '',
                    'latitude' => self::floatOrNull($row['latitude'] ?? null),
                    'longitude' => self::floatOrNull($row['longitude'] ?? null),
                    'capacity' => self::intOrNull($row['capacity'] ?? null),
                    'phone' => $row['phone'] ?? null,
                    'whatsapp' => $row['whatsapp'] ?? null,
                    'website' => self::emptyToNull($row['website'] ?? null),
                    'social_links' => $social,
                    'cover_image' => $row['cover_image'] ?? null,
                    'status' => $row['status'] ?? 'pending',
                    'is_featured' => self::boolish($row['is_featured'] ?? null),
                    'rating_avg' => self::intOrNull($row['rating_avg'] ?? null) ?? 0,
                    'review_count' => self::intOrNull($row['review_count'] ?? null) ?? 0,
                    'view_count' => self::intOrNull($row['view_count'] ?? null) ?? 0,
                ];

                $venue = self::resolveVenueForExcelImport($id, $row);

                if ($venue !== null) {
                    $payload = self::applyVenueFkFallbacksFromExisting($venue, $row, $payload);
                    Validator::make($payload, $venueRules)->validate();
                    $slug = Str::slug((string) ($payload['slug'] ?: $venue->slug));
                    Validator::make(['slug' => $slug], [
                        'slug' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('venues', 'slug')->ignore($venue->id)],
                    ])->validate();
                    $payload['slug'] = $slug;
                    $venue->update($payload);
                    $updated++;
                } else {
                    $payload = self::applyVenueOptionalFksForNewRow($row, $payload);
                    Validator::make($payload, $venueRules)->validate();

                    $slugCell = trim((string) ($row['slug'] ?? ''));
                    if ($slugCell !== '') {
                        $candidate = Str::slug($slugCell);
                        $collision = Venue::query()->where('slug', $candidate)->first();
                        if ($collision !== null) {
                            $payload = self::applyVenueFkFallbacksFromExisting($collision, $row, $payload);
                            Validator::make($payload, $venueRules)->validate();
                            $slug = Str::slug((string) ($payload['slug'] ?: $collision->slug));
                            Validator::make(['slug' => $slug], [
                                'slug' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('venues', 'slug')->ignore($collision->id)],
                            ])->validate();
                            $payload['slug'] = $slug;
                            $collision->update($payload);
                            $updated++;

                            continue;
                        }
                        $slug = $candidate;
                    } else {
                        $slugBase = Str::slug($payload['name']);
                        $slug = Str::slug($slugBase.'-'.Str::lower(Str::random(4)));
                        while (Venue::query()->where('slug', $slug)->exists()) {
                            $slug = Str::slug($slugBase.'-'.Str::lower(Str::random(4)));
                        }
                    }
                    Validator::make(['slug' => $slug], [
                        'slug' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('venues', 'slug')],
                    ])->validate();
                    $payload['slug'] = $slug;
                    Venue::query()->create($payload);
                    $created++;
                }
            } catch (ValidationException $e) {
                $errors[] = 'Satır '.$line.': '.self::flattenValidation($e);
            } catch (\Throwable $e) {
                $errors[] = 'Satır '.$line.': '.$e->getMessage();
            }
        }

        return self::importRedirectResponse($created, $updated, $errors, 'Mekan');
    }

    private static function resolveVenueForExcelImport(?int $id, array $row): ?Venue
    {
        if ($id !== null && Venue::query()->whereKey($id)->exists()) {
            return Venue::query()->find($id);
        }

        $rawSlug = trim((string) ($row['slug'] ?? ''));
        if ($rawSlug === '') {
            return null;
        }
        $norm = Str::slug($rawSlug);

        return $norm === '' ? null : Venue::query()->where('slug', $norm)->first();
    }

    /**
     * Güncellemede: Excel’de boş veya bu veritabanında olmayan FK’ler için mevcut kayıttaki değer korunur.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private static function applyVenueFkFallbacksFromExisting(Venue $venue, array $row, array $payload): array
    {
        $p = $payload;

        $cell = trim((string) ($row['user_id'] ?? ''));
        if ($cell === '' || ! User::query()->whereKey((int) $cell)->exists()) {
            $p['user_id'] = $venue->user_id;
        }

        $cell = trim((string) ($row['category_id'] ?? ''));
        if ($cell === '' || ! Category::query()->whereKey((int) $cell)->exists()) {
            $p['category_id'] = $venue->category_id;
        }

        $cell = trim((string) ($row['city_id'] ?? ''));
        if ($cell === '' || ! City::query()->whereKey((int) $cell)->exists()) {
            $p['city_id'] = $venue->city_id;
        }

        $cell = trim((string) ($row['district_id'] ?? ''));
        if ($cell === '' || ! District::query()->whereKey((int) $cell)->exists()) {
            $p['district_id'] = $venue->district_id;
        }

        $cell = trim((string) ($row['neighborhood_id'] ?? ''));
        if ($cell === '' || ! Neighborhood::query()->whereKey((int) $cell)->exists()) {
            $p['neighborhood_id'] = $venue->neighborhood_id;
        }

        return $p;
    }

    /**
     * Yeni mekanda: isteğe bağlı FK’ler yalnızca geçerliyse yazılır; değilse null.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private static function applyVenueOptionalFksForNewRow(array $row, array $payload): array
    {
        $p = $payload;

        $cell = trim((string) ($row['user_id'] ?? ''));
        $p['user_id'] = ($cell !== '' && User::query()->whereKey((int) $cell)->exists()) ? (int) $cell : null;

        $cell = trim((string) ($row['district_id'] ?? ''));
        $p['district_id'] = ($cell !== '' && District::query()->whereKey((int) $cell)->exists()) ? (int) $cell : null;

        $cell = trim((string) ($row['neighborhood_id'] ?? ''));
        $p['neighborhood_id'] = ($cell !== '' && Neighborhood::query()->whereKey((int) $cell)->exists()) ? (int) $cell : null;

        return $p;
    }

    public static function exportEvents(): StreamedResponse
    {
        $rows = Event::query()->with(['artists', 'ticketTiers'])->orderBy('id')->get()->map(function (Event $e) {
            $artistIds = $e->artists->sortBy(fn ($a) => $a->pivot->order)->pluck('id')->implode(',');

            $tiers = $e->ticketTiers->map(fn ($t) => [
                'name' => $t->name,
                'description' => $t->description,
                'price' => (float) $t->price,
                'sort_order' => (int) $t->sort_order,
            ])->values()->all();

            return [
                (string) $e->id,
                (string) $e->venue_id,
                $e->title,
                $e->slug,
                self::scalar($e->description),
                self::scalar($e->event_rules),
                self::dt($e->start_date),
                self::dt($e->end_date),
                self::scalar($e->ticket_price),
                self::scalar($e->capacity),
                (string) $e->sold_count,
                (string) $e->view_count,
                $e->is_full ? '1' : '0',
                self::scalar($e->cover_image),
                $e->status,
                $e->sahnebul_reservation_enabled ? '1' : '0',
                $e->ticket_acquisition_mode,
                self::jsonCell($e->ticket_outlets),
                self::scalar($e->ticket_purchase_note),
                $artistIds,
                self::jsonCell($tiers),
                self::dt($e->created_at),
                self::dt($e->updated_at),
            ];
        })->all();

        return AdminSpreadsheetIo::downloadXlsx('etkinlikler.xlsx', self::EVENT_HEADERS, $rows);
    }

    public static function importEvents(UploadedFile $file): RedirectResponse
    {
        $sheet = AdminSpreadsheetIo::readAssocRows($file);
        if ($sheet === []) {
            return back()->with('error', 'Excel dosyasında veri satırı bulunamadı.');
        }

        $created = 0;
        $updated = 0;
        $errors = [];

        foreach ($sheet as $idx => $row) {
            $line = $idx + 2;
            try {
                $id = self::rowIdOrNull($row['id'] ?? null);
                $artistIds = self::parseIdList($row['artist_ids'] ?? '');
                if (count($artistIds) < 1) {
                    throw ValidationException::withMessages(['artist_ids' => 'En az bir sanatçı ID gerekli.']);
                }

                foreach ($artistIds as $aid) {
                    if (! Artist::query()->whereKey($aid)->exists()) {
                        throw ValidationException::withMessages(['artist_ids' => 'Geçersiz sanatçı ID: '.$aid]);
                    }
                }

                $tiersRaw = self::decodeJsonArrayish($row['ticket_tiers'] ?? null);
                $ticketTiers = [];
                if (is_array($tiersRaw)) {
                    foreach ($tiersRaw as $t) {
                        if (! is_array($t)) {
                            continue;
                        }
                        $ticketTiers[] = [
                            'name' => isset($t['name']) ? trim((string) $t['name']) : '',
                            'description' => isset($t['description']) ? trim((string) $t['description']) : null,
                            'price' => $t['price'] ?? null,
                            'sort_order' => isset($t['sort_order']) ? (int) $t['sort_order'] : null,
                        ];
                    }
                }

                $outlets = self::decodeJsonArrayish($row['ticket_outlets'] ?? null);
                if (! is_array($outlets)) {
                    $outlets = [];
                }
                $outlets = Event::normalizeTicketOutletsInput($outlets);

                $payload = [
                    'venue_id' => (int) ($row['venue_id'] ?? 0),
                    'title' => $row['title'] ?? '',
                    'slug' => $row['slug'] ?? '',
                    'description' => $row['description'] ?? null,
                    'event_rules' => $row['event_rules'] ?? null,
                    'start_date' => $row['start_date'] ?? '',
                    'end_date' => $row['end_date'] ?? null,
                    'ticket_price' => self::floatOrNull($row['ticket_price'] ?? null),
                    'capacity' => self::intOrNull($row['capacity'] ?? null),
                    'sold_count' => self::intOrNull($row['sold_count'] ?? null) ?? 0,
                    'view_count' => self::intOrNull($row['view_count'] ?? null) ?? 0,
                    'is_full' => self::boolish($row['is_full'] ?? null),
                    'cover_image' => $row['cover_image'] ?? null,
                    'status' => $row['status'] ?? 'draft',
                    'sahnebul_reservation_enabled' => self::boolish($row['sahnebul_reservation_enabled'] ?? null),
                    'ticket_acquisition_mode' => $row['ticket_acquisition_mode'] ?? Event::TICKET_MODE_SAHNEBUL,
                    'ticket_outlets' => $outlets,
                    'ticket_purchase_note' => $row['ticket_purchase_note'] ?? null,
                ];

                Validator::make($payload, [
                    'venue_id' => ['required', 'integer', Rule::exists('venues', 'id')->where(fn ($q) => $q->where('status', 'approved'))],
                    'title' => ['required', 'string', 'max:255'],
                    'slug' => ['required', 'string', 'max:255'],
                    'description' => ['nullable', 'string'],
                    'event_rules' => ['nullable', 'string', 'max:5000'],
                    'start_date' => ['required', 'date'],
                    'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
                    'ticket_price' => ['nullable', 'numeric', 'min:0'],
                    'capacity' => ['nullable', 'integer', 'min:1'],
                    'sold_count' => ['integer', 'min:0'],
                    'view_count' => ['integer', 'min:0'],
                    'is_full' => ['boolean'],
                    'cover_image' => ['nullable', 'string', 'max:2048'],
                    'status' => ['required', 'in:draft,published,cancelled'],
                    'sahnebul_reservation_enabled' => ['boolean'],
                    'ticket_acquisition_mode' => ['required', 'string', 'in:external_platforms,sahnebul,phone_only'],
                    'ticket_outlets' => ['nullable', 'array', 'max:15'],
                    'ticket_outlets.*.label' => ['nullable', 'string', 'max:120'],
                    'ticket_outlets.*.url' => ['nullable', 'string', 'max:2048'],
                    'ticket_purchase_note' => ['nullable', 'string', 'max:5000'],
                ])->validate();

                $payload = Event::applyTicketAcquisitionToValidatedArray($payload);
                unset($payload['artist_ids']);

                $slug = Str::slug($payload['slug']);

                $op = DB::transaction(function () use ($id, $payload, $slug, $ticketTiers, $artistIds): string {
                    if ($id !== null && Event::query()->whereKey($id)->exists()) {
                        /** @var Event $event */
                        $event = Event::query()->findOrFail($id);
                        Validator::make([
                            'venue_id' => $payload['venue_id'],
                            'slug' => $slug,
                        ], [
                            'venue_id' => ['required', 'integer', Rule::exists('venues', 'id')->where(fn ($q) => $q->where('status', 'approved'))],
                            'slug' => ['required', 'string', 'max:255', Rule::unique('events', 'slug')->where(fn ($q) => $q->where('venue_id', $payload['venue_id']))->ignore($event->id)],
                        ])->validate();
                        $payload['slug'] = $slug;
                        $event->update($payload);
                        $event->syncTicketTiers($ticketTiers);
                        $event->syncArtistsByIds($artistIds);

                        return 'u';
                    }
                    while (Event::query()->where('venue_id', $payload['venue_id'])->where('slug', $slug)->exists()) {
                        $slug = Str::slug($payload['title']).'-'.Str::lower(Str::random(4));
                    }
                    $payload['slug'] = $slug;
                    $event = Event::query()->create($payload);
                    $event->syncTicketTiers($ticketTiers);
                    $event->syncArtistsByIds($artistIds);

                    return 'c';
                });
                if ($op === 'u') {
                    $updated++;
                } else {
                    $created++;
                }
            } catch (ValidationException $e) {
                $errors[] = 'Satır '.$line.': '.self::flattenValidation($e);
            } catch (\Throwable $e) {
                $errors[] = 'Satır '.$line.': '.$e->getMessage();
            }
        }

        return self::importRedirectResponse($created, $updated, $errors, 'Etkinlik');
    }

    public static function exportArtists(): StreamedResponse
    {
        $rows = Artist::query()->orderBy('id')->get()->map(function (Artist $a) {
            return [
                (string) $a->id,
                self::scalar($a->user_id),
                $a->name,
                $a->slug,
                self::scalar($a->bio),
                self::scalar($a->avatar),
                self::scalar($a->genre),
                self::jsonCell($a->music_genres),
                self::scalar($a->website),
                self::jsonCell($a->social_links),
                self::jsonCell($a->manager_info),
                self::jsonCell($a->public_contact),
                $a->status,
                self::scalar($a->country_code),
                (string) $a->view_count,
                self::scalar($a->spotify_id),
                self::scalar($a->spotify_url),
                self::jsonCell($a->spotify_genres),
                self::scalar($a->spotify_popularity),
                self::scalar($a->spotify_followers),
                self::jsonCell($a->spotify_albums),
                self::dt($a->created_at),
                self::dt($a->updated_at),
            ];
        })->all();

        return AdminSpreadsheetIo::downloadXlsx('sanatcilar.xlsx', self::ARTIST_HEADERS, $rows);
    }

    public static function importArtists(UploadedFile $file): RedirectResponse
    {
        $allowedGenres = MusicGenre::optionNamesOrdered();

        $sheet = AdminSpreadsheetIo::readAssocRows($file);
        if ($sheet === []) {
            return back()->with('error', 'Excel dosyasında veri satırı bulunamadı.');
        }

        $created = 0;
        $updated = 0;
        $errors = [];

        foreach ($sheet as $idx => $row) {
            $line = $idx + 2;
            try {
                $id = self::rowIdOrNull($row['id'] ?? null);
                $musicGenres = self::decodeMusicGenres($row['music_genres'] ?? null, $allowedGenres);
                $social = self::decodeJsonArrayish($row['social_links'] ?? null);
                if (is_array($social)) {
                    $social = ArtistProfileInputs::normalizeSocialLinks($social);
                }
                $manager = self::decodeJsonArrayish($row['manager_info'] ?? null);
                if (is_array($manager)) {
                    $manager = ArtistProfileInputs::normalizeStringMap($manager, ['name', 'company', 'phone', 'email']);
                }
                $public = self::decodeJsonArrayish($row['public_contact'] ?? null);
                if (is_array($public)) {
                    $public = ArtistProfileInputs::normalizeStringMap($public, ['email', 'phone', 'note']);
                }
                $spotifyGenres = self::decodeJsonArrayish($row['spotify_genres'] ?? null);
                if (! is_array($spotifyGenres)) {
                    $spotifyGenres = null;
                }
                $spotifyAlbums = self::decodeJsonArrayish($row['spotify_albums'] ?? null);
                if (! is_array($spotifyAlbums)) {
                    $spotifyAlbums = null;
                }

                $mg = array_values(array_unique(array_filter($musicGenres)));
                $payload = [
                    'user_id' => self::positiveIntOrNull($row['user_id'] ?? null),
                    'name' => $row['name'] ?? '',
                    'slug' => $row['slug'] ?? null,
                    'bio' => $row['bio'] ?? null,
                    'avatar' => $row['avatar'] ?? null,
                    'genre' => $mg === [] ? null : implode(', ', $mg),
                    'music_genres' => $mg === [] ? null : $mg,
                    'website' => self::emptyToNull($row['website'] ?? null),
                    'social_links' => $social,
                    'manager_info' => $manager,
                    'public_contact' => $public,
                    'status' => $row['status'] ?? 'pending',
                    'country_code' => $row['country_code'] ?? null,
                    'view_count' => self::intOrNull($row['view_count'] ?? null) ?? 0,
                    'spotify_id' => $row['spotify_id'] ?? null,
                    'spotify_url' => $row['spotify_url'] ?? null,
                    'spotify_genres' => $spotifyGenres,
                    'spotify_popularity' => self::intOrNull($row['spotify_popularity'] ?? null),
                    'spotify_followers' => self::intOrNull($row['spotify_followers'] ?? null),
                    'spotify_albums' => $spotifyAlbums,
                ];

                $rules = [
                    'user_id' => ['nullable', 'integer', 'exists:users,id'],
                    'name' => ['required', 'string', 'max:255'],
                    'slug' => ['nullable', 'string', 'max:255'],
                    'bio' => ['nullable', 'string'],
                    'avatar' => ['nullable', 'string', 'max:2048'],
                    'genre' => ['nullable', 'string', 'max:500'],
                    'music_genres' => ['nullable', 'array'],
                    'music_genres.*' => ['string', Rule::in($allowedGenres)],
                    'website' => ['nullable', 'url', 'max:255'],
                    'status' => ['required', 'in:pending,approved,rejected'],
                    'social_links' => ['nullable', 'array'],
                    'social_links.*' => ['nullable', 'string', 'max:500'],
                    'manager_info' => ['nullable', 'array'],
                    'manager_info.name' => ['nullable', 'string', 'max:255'],
                    'manager_info.company' => ['nullable', 'string', 'max:255'],
                    'manager_info.phone' => ['nullable', 'string', 'max:80'],
                    'manager_info.email' => ['nullable', 'email', 'max:255'],
                    'public_contact' => ['nullable', 'array'],
                    'public_contact.email' => ['nullable', 'email', 'max:255'],
                    'public_contact.phone' => ['nullable', 'string', 'max:80'],
                    'public_contact.note' => ['nullable', 'string', 'max:2000'],
                    'country_code' => ['nullable', 'string', 'max:8'],
                    'view_count' => ['integer', 'min:0'],
                    'spotify_id' => ['nullable', 'string', 'max:64'],
                    'spotify_url' => ['nullable', 'string', 'max:512'],
                    'spotify_genres' => ['nullable', 'array'],
                    'spotify_popularity' => ['nullable', 'integer', 'min:0'],
                    'spotify_followers' => ['nullable', 'integer', 'min:0'],
                    'spotify_albums' => ['nullable', 'array'],
                ];

                Validator::make($payload, $rules)->validate();
                self::applySpotifyFromSocial($payload);

                if ($id !== null && Artist::query()->whereKey($id)->exists()) {
                    /** @var Artist $artist */
                    $artist = Artist::query()->findOrFail($id);
                    $slug = Str::slug((string) ($payload['slug'] ?: $artist->slug));
                    Validator::make(['slug' => $slug], [
                        'slug' => ['required', 'string', 'max:255', Rule::unique('artists', 'slug')->ignore($artist->id)],
                    ])->validate();
                    $payload['slug'] = $slug;
                    $artist->update($payload);
                    $updated++;
                } else {
                    $slugBase = Str::slug($payload['name']);
                    $slug = Str::slug((string) ($payload['slug'] ?: $slugBase.'-'.Str::lower(Str::random(4))));
                    while (Artist::query()->where('slug', $slug)->exists()) {
                        $slug = Str::slug($slugBase.'-'.Str::lower(Str::random(4)));
                    }
                    Validator::make(['slug' => $slug], [
                        'slug' => ['required', 'string', 'max:255', Rule::unique('artists', 'slug')],
                    ])->validate();
                    $payload['slug'] = $slug;
                    Artist::query()->create($payload);
                    $created++;
                }
            } catch (ValidationException $e) {
                $errors[] = 'Satır '.$line.': '.self::flattenValidation($e);
            } catch (\Throwable $e) {
                $errors[] = 'Satır '.$line.': '.$e->getMessage();
            }
        }

        return self::importRedirectResponse($created, $updated, $errors, 'Sanatçı');
    }

    public static function exportCategories(): StreamedResponse
    {
        $rows = Category::query()->orderBy('order')->orderBy('id')->get()->map(fn (Category $c) => [
            (string) $c->id,
            $c->name,
            $c->slug,
            self::scalar($c->icon),
            (string) $c->order,
            self::dt($c->created_at),
            self::dt($c->updated_at),
        ])->all();

        return AdminSpreadsheetIo::downloadXlsx('kategoriler.xlsx', self::CATEGORY_HEADERS, $rows);
    }

    public static function importCategories(UploadedFile $file): RedirectResponse
    {
        $sheet = AdminSpreadsheetIo::readAssocRows($file);
        if ($sheet === []) {
            return back()->with('error', 'Excel dosyasında veri satırı bulunamadı.');
        }

        $created = 0;
        $updated = 0;
        $errors = [];

        foreach ($sheet as $idx => $row) {
            $line = $idx + 2;
            try {
                $id = self::rowIdOrNull($row['id'] ?? null);
                $name = trim((string) ($row['name'] ?? ''));
                if ($name === '') {
                    throw ValidationException::withMessages(['name' => 'Ad zorunlu.']);
                }
                $slug = Str::slug((string) ($row['slug'] ?? Str::slug($name)));
                $order = self::intOrNull($row['order'] ?? null) ?? 0;
                $icon = self::emptyToNull($row['icon'] ?? null);

                if ($id !== null && Category::query()->whereKey($id)->exists()) {
                    /** @var Category $cat */
                    $cat = Category::query()->findOrFail($id);
                    Validator::make(['slug' => $slug], [
                        'slug' => ['required', 'string', 'max:255', Rule::unique('categories', 'slug')->ignore($cat->id)],
                    ])->validate();
                    $cat->update(['name' => $name, 'slug' => $slug, 'icon' => $icon, 'order' => $order]);
                    $updated++;
                } else {
                    Validator::make(['slug' => $slug], [
                        'slug' => ['required', 'string', 'max:255', Rule::unique('categories', 'slug')],
                    ])->validate();
                    Category::query()->create(['name' => $name, 'slug' => $slug, 'icon' => $icon, 'order' => $order]);
                    $created++;
                }
            } catch (ValidationException $e) {
                $errors[] = 'Satır '.$line.': '.self::flattenValidation($e);
            } catch (\Throwable $e) {
                $errors[] = 'Satır '.$line.': '.$e->getMessage();
            }
        }

        return self::importRedirectResponse($created, $updated, $errors, 'Kategori');
    }

    public static function exportMusicGenres(): StreamedResponse
    {
        $rows = MusicGenre::query()->orderBy('order')->orderBy('id')->get()->map(fn (MusicGenre $g) => [
            (string) $g->id,
            $g->name,
            $g->slug,
            (string) $g->order,
            self::dt($g->created_at),
            self::dt($g->updated_at),
        ])->all();

        return AdminSpreadsheetIo::downloadXlsx('muzik-turleri.xlsx', self::MUSIC_GENRE_HEADERS, $rows);
    }

    public static function importMusicGenres(UploadedFile $file): RedirectResponse
    {
        $sheet = AdminSpreadsheetIo::readAssocRows($file);
        if ($sheet === []) {
            return back()->with('error', 'Excel dosyasında veri satırı bulunamadı.');
        }

        $created = 0;
        $updated = 0;
        $errors = [];

        foreach ($sheet as $idx => $row) {
            $line = $idx + 2;
            try {
                $id = self::rowIdOrNull($row['id'] ?? null);
                $name = trim((string) ($row['name'] ?? ''));
                if ($name === '') {
                    throw ValidationException::withMessages(['name' => 'Ad zorunlu.']);
                }
                $slug = Str::slug((string) ($row['slug'] ?? Str::slug($name)));
                $order = self::intOrNull($row['order'] ?? null) ?? 0;

                if ($id !== null && MusicGenre::query()->whereKey($id)->exists()) {
                    /** @var MusicGenre $g */
                    $g = MusicGenre::query()->findOrFail($id);
                    Validator::make(['slug' => $slug], [
                        'slug' => ['required', 'string', 'max:255', Rule::unique('music_genres', 'slug')->ignore($g->id)],
                    ])->validate();
                    $g->update(['name' => $name, 'slug' => $slug, 'order' => $order]);
                    $updated++;
                } else {
                    Validator::make(['slug' => $slug], [
                        'slug' => ['required', 'string', 'max:255', Rule::unique('music_genres', 'slug')],
                    ])->validate();
                    MusicGenre::query()->create(['name' => $name, 'slug' => $slug, 'order' => $order]);
                    $created++;
                }
            } catch (ValidationException $e) {
                $errors[] = 'Satır '.$line.': '.self::flattenValidation($e);
            } catch (\Throwable $e) {
                $errors[] = 'Satır '.$line.': '.$e->getMessage();
            }
        }

        return self::importRedirectResponse($created, $updated, $errors, 'Müzik türü');
    }

    private static function importRedirectResponse(int $created, int $updated, array $errors, string $label): RedirectResponse
    {
        $base = $label.' Excel içe aktarma: '.$created.' yeni kayıt, '.$updated.' güncelleme.';
        if ($errors !== []) {
            $detail = ' '.count($errors).' satır atlandı: '.implode(' ', array_slice($errors, 0, 12));
            if (count($errors) > 12) {
                $detail .= ' …';
            }
            if ($created + $updated > 0) {
                return back()->with('success', $base.$detail);
            }

            return back()->with('error', $base.$detail);
        }

        return back()->with('success', $base);
    }

    private static function flattenValidation(ValidationException $e): string
    {
        $messages = $e->validator->errors()->all();

        return implode(' ', $messages);
    }

    /**
     * @return list<int>
     */
    private static function parseIdList(?string $raw): array
    {
        if ($raw === null || trim($raw) === '') {
            return [];
        }
        $parts = preg_split('/[\s,;]+/', trim($raw), -1, PREG_SPLIT_NO_EMPTY);
        if ($parts === false) {
            return [];
        }
        $out = [];
        foreach ($parts as $p) {
            $n = (int) $p;
            if ($n > 0) {
                $out[] = $n;
            }
        }

        return array_values(array_unique($out));
    }

    /**
     * @return list<string>
     */
    private static function decodeMusicGenres(?string $cell, array $allowedGenres): array
    {
        if ($cell === null || trim($cell) === '') {
            return [];
        }
        $decoded = json_decode($cell, true);
        if (is_array($decoded)) {
            $out = [];
            foreach ($decoded as $item) {
                if (is_string($item)) {
                    $t = trim($item);
                    if ($t !== '' && in_array($t, $allowedGenres, true)) {
                        $out[] = $t;
                    }
                }
            }

            return $out;
        }
        $parts = preg_split('/\s*,\s*/', trim($cell), -1, PREG_SPLIT_NO_EMPTY);
        if ($parts === false) {
            return [];
        }
        $out = [];
        foreach ($parts as $p) {
            $t = trim($p);
            if ($t !== '' && in_array($t, $allowedGenres, true)) {
                $out[] = $t;
            }
        }

        return $out;
    }

    private static function decodeJsonArrayish(?string $json): ?array
    {
        if ($json === null || trim($json) === '') {
            return null;
        }
        $decoded = json_decode($json, true);
        if (! is_array($decoded)) {
            return null;
        }

        return $decoded;
    }

    private static function emptyToNull(?string $v): ?string
    {
        if ($v === null || trim($v) === '') {
            return null;
        }

        return $v;
    }

    private static function boolish(?string $v): bool
    {
        if ($v === null) {
            return false;
        }
        $s = strtolower(trim($v));

        return in_array($s, ['1', 'true', 'yes', 'evet', 'on'], true);
    }

    private static function intOrNull(?string $v): ?int
    {
        if ($v === null || trim($v) === '') {
            return null;
        }

        return (int) $v;
    }

    private static function rowIdOrNull(?string $v): ?int
    {
        $i = self::intOrNull($v);
        if ($i === null || $i < 1) {
            return null;
        }

        return $i;
    }

    /** Boş veya 0 Excel hücreleri için (user_id, district_id vb.). */
    private static function positiveIntOrNull(?string $v): ?int
    {
        $i = self::intOrNull($v);
        if ($i === null || $i < 1) {
            return null;
        }

        return $i;
    }

    private static function floatOrNull(?string $v): ?float
    {
        if ($v === null || trim($v) === '') {
            return null;
        }

        return (float) str_replace(',', '.', $v);
    }

    private static function scalar(mixed $v): string
    {
        if ($v === null) {
            return '';
        }

        return is_scalar($v) ? (string) $v : '';
    }

    private static function jsonCell(mixed $v): string
    {
        if ($v === null) {
            return '';
        }
        $enc = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return $enc === false ? '' : $enc;
    }

    private static function dt(mixed $v): string
    {
        if ($v === null) {
            return '';
        }
        if ($v instanceof \DateTimeInterface) {
            return Carbon::parse($v)->timezone((string) config('app.timezone'))->format('Y-m-d H:i:s');
        }

        return '';
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private static function applySpotifyFromSocial(array &$payload): void
    {
        $social = $payload['social_links'] ?? null;
        if (! is_array($social)) {
            return;
        }
        $raw = $social['spotify'] ?? '';
        if (! is_string($raw)) {
            return;
        }
        $raw = trim($raw);
        if ($raw === '') {
            return;
        }
        $id = ArtistProfileInputs::extractSpotifyArtistId($raw);
        if ($id === null) {
            return;
        }
        $payload['spotify_id'] = $id;
        $payload['spotify_url'] = str_starts_with($raw, 'http://') || str_starts_with($raw, 'https://')
            ? $raw
            : 'https://open.spotify.com/artist/'.$id;
    }
}
