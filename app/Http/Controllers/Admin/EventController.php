<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Category;
use App\Models\Event;
use App\Models\Venue;
use App\Services\AppSettingsService;
use App\Services\EventMediaImportFromUrlService;
use App\Services\SahnebulMail;
use App\Support\EventListingTypes;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class EventController extends Controller
{
    public function create()
    {
        return Inertia::render('Admin/Events/Create', [
            'venues' => Venue::approved()->orderBy('name')->get(['id', 'name']),
            'artists' => Artist::approved()->notIntlImport()->orderBy('name')->get(['id', 'name', 'avatar']),
            'venuePickerCategories' => Category::orderBy('order')->get(['id', 'name']),
            'googleMapsBrowserKey' => app(AppSettingsService::class)->getGoogleMapsBrowserKey(),
            'eventTypeOptions' => EventListingTypes::options(),
        ]);
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(['draft', 'published', 'cancelled'])],
            'venue_id' => ['nullable', 'integer', Rule::exists('venues', 'id')],
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $searchTerm = isset($validated['search']) ? trim((string) $validated['search']) : '';

        $events = Event::with(['venue', 'artists', 'ticketTiers'])
            ->when($validated['status'] ?? null, fn ($q, string $s) => $q->where('status', $s))
            ->when($validated['venue_id'] ?? null, fn ($q, int $v) => $q->where('venue_id', $v))
            ->when($searchTerm !== '', function ($q) use ($searchTerm): void {
                $like = '%'.addcslashes($searchTerm, '%_\\').'%';
                $q->where('title', 'like', $like);
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        $events->getCollection()->transform(function (Event $event) {
            $visible = $event->status === 'published'
                && $event->venue !== null
                && $event->venue->status === 'approved';
            $event->setAttribute('visible_on_site', $visible);
            $event->setAttribute(
                'public_event_url',
                $visible ? route('events.show', ['event' => $event->publicUrlSegment()], absolute: true) : null,
            );

            return $event;
        });

        return Inertia::render('Admin/Events/Index', [
            'events' => $events,
            'venues' => Venue::query()->orderBy('name')->get(['id', 'name']),
            'filters' => [
                'status' => $validated['status'] ?? '',
                'venue_id' => isset($validated['venue_id']) ? (string) $validated['venue_id'] : '',
                'search' => $searchTerm,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'ticket_tiers' => Event::filterTicketTierRowsFromRequestInput($request->input('ticket_tiers')),
            'description' => $request->input('description') ?: null,
            'event_rules' => $request->input('event_rules') ?: null,
            'start_date' => $request->input('start_date') ?: null,
            'end_date' => $request->input('end_date') ?: null,
            'ticket_price' => $request->input('ticket_price') ?: null,
            'entry_is_paid' => $request->boolean('entry_is_paid', true),
            'capacity' => $request->input('capacity') ?: null,
            'artist_ids' => $request->input('artist_ids') ?: [],
            'cover_image' => $request->input('cover_image') ?: null,
            'listing_image' => $request->input('listing_image') ?: null,
            'event_type' => $request->input('event_type') ?: null,
        ]);

        $validated = $request->validate([
            'venue_id' => ['required', Rule::exists('venues', 'id')->where(fn ($q) => $q->where('status', 'approved'))],
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_rules' => 'nullable|string|max:5000',
            'entry_is_paid' => 'boolean',
            'event_type' => EventListingTypes::nullableSlugRule(),
            'start_date' => 'nullable|date',
            'end_date' => [
                'nullable',
                'date',
                function (string $attribute, mixed $value, \Closure $fail) use ($request): void {
                    if ($value === null || $value === '') {
                        return;
                    }
                    $start = $request->input('start_date');
                    if (! $start) {
                        return;
                    }
                    try {
                        if (Carbon::parse($value)->lt(Carbon::parse($start))) {
                            $fail('Bitiş tarihi başlangıçtan önce olamaz.');
                        }
                    } catch (\Throwable) {
                        $fail('Geçerli bir bitiş tarihi girin.');
                    }
                },
            ],
            'ticket_price' => 'nullable|numeric|min:0',
            'capacity' => 'nullable|integer|min:1',
            'status' => 'required|in:draft,published,cancelled',
            'artist_ids' => 'nullable|array',
            'artist_ids.*' => ['integer', Artist::ruleExistsInPublicCatalog()],
            'ticket_tiers' => 'nullable|array',
            'ticket_tiers.*.name' => 'required|string|max:255',
            'ticket_tiers.*.description' => 'nullable|string|max:500',
            'ticket_tiers.*.price' => 'required|numeric|min:0',
            'ticket_tiers.*.sort_order' => 'nullable|integer|min:0',
            'cover_image' => 'nullable|string|max:2048',
            'cover_upload' => 'nullable|image|max:10240',
            'listing_image' => 'nullable|string|max:2048',
            'listing_upload' => 'nullable|image|max:10240',
            'ticket_acquisition_mode' => 'required|string|in:external_platforms,sahnebul,phone_only',
            'ticket_outlets' => 'nullable|array|max:15',
            'ticket_outlets.*.label' => 'nullable|string|max:120',
            'ticket_outlets.*.url' => 'nullable|string|max:2048',
            'ticket_purchase_note' => 'nullable|string|max:5000',
        ]);

        $ticketTiers = $validated['ticket_tiers'] ?? [];
        unset($validated['ticket_tiers']);
        [$validated, $ticketTiers] = Event::applyEntryPaidToValidated($validated, $ticketTiers);

        unset($validated['cover_upload'], $validated['listing_upload']);
        if ($request->hasFile('cover_upload')) {
            $validated['cover_image'] = $request->file('cover_upload')->store('event-covers', 'public');
        }
        if ($request->hasFile('listing_upload')) {
            $validated['listing_image'] = $request->file('listing_upload')->store('event-listings', 'public');
        }

        $validated['ticket_purchase_note'] = isset($validated['ticket_purchase_note']) && trim((string) $validated['ticket_purchase_note']) !== ''
            ? trim((string) $validated['ticket_purchase_note'])
            : null;

        $validated = Event::applyTicketAcquisitionToValidatedArray($validated);

        $validated['event_type'] = isset($validated['event_type']) && $validated['event_type'] !== ''
            ? (string) $validated['event_type']
            : null;

        $artistIds = $validated['artist_ids'];
        unset($validated['artist_ids']);

        $event = DB::transaction(function () use ($validated, $ticketTiers, $artistIds): Event {
            $event = Event::create([
                ...$validated,
                'slug' => Str::slug($validated['title']).'-'.Str::lower(Str::random(4)),
            ]);

            $event->syncTicketTiers($ticketTiers);
            $event->syncArtistsByIds($artistIds);

            return $event;
        });

        return redirect()->route('admin.events.edit', $event)->with('success', 'Etkinlik eklendi. Detayları düzenleyebilirsiniz.');
    }

    public function edit(Event $event)
    {
        $event->load(['venue', 'artists', 'ticketTiers']);
        $event->repairSwappedStorageFoldersIfNeeded();
        $event->refresh();

        return Inertia::render('Admin/Events/Edit', [
            'event' => $event,
            'venues' => Venue::approved()->orderBy('name')->get(['id', 'name']),
            'artists' => Artist::approved()->notIntlImport()->orderBy('name')->get(['id', 'name', 'avatar']),
            'venuePickerCategories' => Category::orderBy('order')->get(['id', 'name']),
            'googleMapsBrowserKey' => app(AppSettingsService::class)->getGoogleMapsBrowserKey(),
            'eventTypeOptions' => EventListingTypes::options(),
        ]);
    }

    public function update(Request $request, Event $event)
    {
        $request->merge([
            'ticket_tiers' => Event::filterTicketTierRowsFromRequestInput($request->input('ticket_tiers')),
            'description' => $request->input('description') ?: null,
            'event_rules' => $request->input('event_rules') ?: null,
            'start_date' => $request->input('start_date') ?: null,
            'end_date' => $request->input('end_date') ?: null,
            'ticket_price' => $request->input('ticket_price') ?: null,
            'entry_is_paid' => $request->boolean('entry_is_paid', true),
            'capacity' => $request->input('capacity') ?: null,
            'artist_ids' => $request->input('artist_ids') ?: [],
            'cover_image' => $request->input('cover_image') ?: null,
            'listing_image' => $request->input('listing_image') ?: null,
            'event_type' => $request->input('event_type') ?: null,
        ]);

        $validated = $request->validate([
            'venue_id' => ['required', Rule::exists('venues', 'id')->where(fn ($q) => $q->where('status', 'approved'))],
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_rules' => 'nullable|string|max:5000',
            'entry_is_paid' => 'boolean',
            'event_type' => EventListingTypes::nullableSlugRule(),
            'start_date' => 'nullable|date',
            'end_date' => [
                'nullable',
                'date',
                function (string $attribute, mixed $value, \Closure $fail) use ($request): void {
                    if ($value === null || $value === '') {
                        return;
                    }
                    $start = $request->input('start_date');
                    if (! $start) {
                        return;
                    }
                    try {
                        if (Carbon::parse($value)->lt(Carbon::parse($start))) {
                            $fail('Bitiş tarihi başlangıçtan önce olamaz.');
                        }
                    } catch (\Throwable) {
                        $fail('Geçerli bir bitiş tarihi girin.');
                    }
                },
            ],
            'ticket_price' => 'nullable|numeric|min:0',
            'capacity' => 'nullable|integer|min:1',
            'status' => 'required|in:draft,published,cancelled',
            'artist_ids' => 'nullable|array',
            'artist_ids.*' => ['integer', Artist::ruleExistsInPublicCatalog()],
            'ticket_tiers' => 'nullable|array',
            'ticket_tiers.*.name' => 'required|string|max:255',
            'ticket_tiers.*.description' => 'nullable|string|max:500',
            'ticket_tiers.*.price' => 'required|numeric|min:0',
            'ticket_tiers.*.sort_order' => 'nullable|integer|min:0',
            'cover_image' => 'nullable|string|max:2048',
            'cover_upload' => 'nullable|image|max:10240',
            'listing_image' => 'nullable|string|max:2048',
            'listing_upload' => 'nullable|image|max:10240',
            'ticket_acquisition_mode' => 'required|string|in:external_platforms,sahnebul,phone_only',
            'ticket_outlets' => 'nullable|array|max:15',
            'ticket_outlets.*.label' => 'nullable|string|max:120',
            'ticket_outlets.*.url' => 'nullable|string|max:2048',
            'ticket_purchase_note' => 'nullable|string|max:5000',
        ]);

        $ticketTiers = $validated['ticket_tiers'] ?? [];
        unset($validated['ticket_tiers']);
        [$validated, $ticketTiers] = Event::applyEntryPaidToValidated($validated, $ticketTiers);

        unset($validated['cover_upload'], $validated['listing_upload']);

        $validated['cover_image'] = isset($validated['cover_image']) && trim((string) $validated['cover_image']) !== ''
            ? trim((string) $validated['cover_image'])
            : null;
        $validated['listing_image'] = isset($validated['listing_image']) && trim((string) $validated['listing_image']) !== ''
            ? trim((string) $validated['listing_image'])
            : null;

        if ($request->hasFile('cover_upload')) {
            if ($event->cover_image && ! Str::startsWith($event->cover_image, ['http://', 'https://'])) {
                Storage::disk('public')->delete($event->cover_image);
            }
            $validated['cover_image'] = $request->file('cover_upload')->store('event-covers', 'public');
        }
        if ($request->hasFile('listing_upload')) {
            if ($event->listing_image && ! Str::startsWith($event->listing_image, ['http://', 'https://'])) {
                Storage::disk('public')->delete($event->listing_image);
            }
            $validated['listing_image'] = $request->file('listing_upload')->store('event-listings', 'public');
        }

        if (($validated['cover_image'] ?? null) === null && $event->cover_image && ! Str::startsWith($event->cover_image, ['http://', 'https://'])) {
            Storage::disk('public')->delete($event->cover_image);
        }
        if (($validated['listing_image'] ?? null) === null && $event->listing_image && ! Str::startsWith($event->listing_image, ['http://', 'https://'])) {
            Storage::disk('public')->delete($event->listing_image);
        }

        $validated['ticket_purchase_note'] = isset($validated['ticket_purchase_note']) && trim((string) $validated['ticket_purchase_note']) !== ''
            ? trim((string) $validated['ticket_purchase_note'])
            : null;

        $validated = Event::applyTicketAcquisitionToValidatedArray($validated);

        $validated['event_type'] = isset($validated['event_type']) && $validated['event_type'] !== ''
            ? (string) $validated['event_type']
            : null;

        if ($event->title !== $validated['title']) {
            $validated['slug'] = Str::slug($validated['title']).'-'.Str::lower(Str::random(4));
        }

        $artistIds = $validated['artist_ids'];
        unset($validated['artist_ids']);

        DB::transaction(function () use ($event, $validated, $ticketTiers, $artistIds): void {
            $event->update($validated);

            $event->syncTicketTiers($ticketTiers);
            $event->syncArtistsByIds($artistIds);
        });

        return redirect()->route('admin.events.edit', $event)->with('success', 'Etkinlik güncellendi.');
    }

    public function approve(Event $event)
    {
        $block = $this->publishBlockReason($event);
        if ($block !== null) {
            return back()->with('error', $block);
        }
        $event->update(['status' => 'published']);

        return back()->with('success', 'Etkinlik yayınlandı.');
    }

    public function bulkPublish(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['integer', 'exists:events,id'],
        ]);

        $ids = array_values(array_unique(array_map('intval', $validated['ids'])));

        $published = 0;
        $skipped = 0;

        foreach ($ids as $id) {
            $event = Event::query()->find($id);
            if (! $event || $event->status !== 'draft') {
                $skipped++;

                continue;
            }
            if ($this->publishBlockReason($event) !== null) {
                $skipped++;

                continue;
            }
            $event->update(['status' => 'published']);
            $published++;
        }

        $query = $request->only(['status', 'venue_id', 'search']);

        if ($published === 0 && $skipped === 0) {
            return redirect()->route('admin.events.index', $query)->with('error', 'Seçili kayıt bulunamadı.');
        }

        if ($published === 0) {
            return redirect()->route('admin.events.index', $query)->with(
                'error',
                'Hiçbir etkinlik yayınlanamadı. Seçilenler taslak değil veya yayın şartlarını (sanatçı, bilet bağlantısı vb.) sağlamıyor.',
            );
        }

        $suffix = $skipped > 0 ? " {$skipped} kayıt taslak değil veya şartları sağlamadığı için atlandı." : '';

        return redirect()->route('admin.events.index', $query)->with(
            'success',
            "{$published} etkinlik yayınlandı.".$suffix,
        );
    }

    /** Tekil / toplu yayın için aynı kurallar. */
    private function publishBlockReason(Event $event): ?string
    {
        if ($event->artists()->count() === 0) {
            return 'Yayınlamak için etkinliğe en az bir onaylı sanatçı bağlanmalıdır.';
        }
        if ($event->ticket_acquisition_mode === Event::TICKET_MODE_EXTERNAL
            && count(Event::normalizeTicketOutletsInput($event->ticket_outlets)) === 0) {
            return 'Harici platform modunda yayınlamak için en az bir geçerli bilet bağlantısı (https) ekleyin veya bilet satış modunu “Sahnebul” / “Telefon” olarak değiştirin.';
        }

        return null;
    }

    public function destroy(Event $event)
    {
        $this->performEventDelete($event);

        return redirect()->route('admin.events.index')->with('success', 'Etkinlik silindi.');
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['integer', 'exists:events,id'],
        ]);

        $ids = array_values(array_unique(array_map('intval', $validated['ids'])));

        $count = (int) DB::transaction(function () use ($ids): int {
            $n = 0;
            foreach ($ids as $id) {
                $event = Event::query()->find($id);
                if ($event) {
                    $this->performEventDelete($event);
                    $n++;
                }
            }

            return $n;
        });

        return redirect()->route('admin.events.index', $request->only(['status', 'venue_id', 'search']))->with('success', "{$count} etkinlik silindi.");
    }

    public function importMediaFromUrl(Request $request, Event $event, EventMediaImportFromUrlService $importer)
    {
        $validated = $request->validate([
            'url' => ['nullable', 'string', 'max:2048'],
            'urls_text' => ['nullable', 'string', 'max:65535'],
            'mode' => ['required', 'string', 'in:image_cover,image_listing,promo_video'],
            'append_promo' => ['sometimes', 'boolean'],
        ]);

        $appendPromo = (bool) ($validated['append_promo'] ?? true);
        $urlsText = trim((string) ($validated['urls_text'] ?? ''));
        $urlSingle = trim((string) ($validated['url'] ?? ''));

        if ($urlsText !== '') {
            $lines = preg_split('/\r\n|\r|\n/', $urlsText);
            $urls = array_values(array_filter(array_map('trim', $lines), fn (string $l) => $l !== ''));
            $result = $importer->importMany($event->fresh(), $urls, $validated['mode'], $appendPromo);
        } elseif ($urlSingle !== '') {
            $result = $importer->import($event->fresh(), $urlSingle, $validated['mode'], $appendPromo);
        } else {
            return back()->with('error', 'En az bir bağlantı veya satır girin.');
        }

        if (! $result['success']) {
            return back()->with('error', $result['message']);
        }

        return back()->with('success', $result['message']);
    }

    public function appendPromoFiles(Request $request, Event $event, EventMediaImportFromUrlService $importer)
    {
        $validated = $request->validate([
            'promo_video_upload' => ['nullable', 'file', 'max:102400', 'mimetypes:video/mp4,video/webm,video/quicktime'],
            'promo_poster_upload' => ['nullable', 'file', 'max:12288', 'image'],
            'append_promo' => ['sometimes', 'boolean'],
        ]);

        $append = (bool) ($validated['append_promo'] ?? true);
        $video = $request->file('promo_video_upload');
        $poster = $request->file('promo_poster_upload');

        $result = $importer->appendPromoFromUploads($event->fresh(), $video, $poster, $append);

        if (! $result['success']) {
            return back()->with('error', $result['message']);
        }

        return back()->with('success', $result['message']);
    }

    public function clearPromoMedia(Event $event, EventMediaImportFromUrlService $importer)
    {
        $importer->purgePromoGallery($event);

        return back()->with('success', 'Tanıtım medyası kaldırıldı.');
    }

    private function performEventDelete(Event $event): void
    {
        SahnebulMail::eventDeletedNotifyStakeholders($event);

        foreach (['cover_image', 'listing_image', 'promo_video_path'] as $field) {
            $path = $event->{$field} ?? null;
            if (is_string($path) && $path !== '' && ! Str::startsWith($path, ['http://', 'https://'])) {
                Storage::disk('public')->delete($path);
            }
        }
        $gallery = is_array($event->promo_gallery) ? $event->promo_gallery : [];
        foreach ($gallery as $item) {
            if (! is_array($item)) {
                continue;
            }
            foreach (['video_path', 'poster_path'] as $key) {
                $path = $item[$key] ?? null;
                if (is_string($path) && $path !== '' && ! Str::startsWith($path, ['http://', 'https://'])) {
                    Storage::disk('public')->delete($path);
                }
            }
        }
        $event->delete();
    }
}
