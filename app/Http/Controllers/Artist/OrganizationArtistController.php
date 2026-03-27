<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\PublicEditSuggestion;
use App\Services\SahnebulMail;
use App\Support\ArtistEditSuggestionPayload;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationArtistController extends Controller
{
    public function index(Request $request): Response
    {
        $this->assertManager($request);

        $roster = Artist::query()
            ->where('managed_by_user_id', $request->user()->id)
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->paginate(12, ['*'], 'roster_page')
            ->withQueryString();

        $catalogSearch = trim((string) $request->input('catalog_search', ''));
        $catalogQuery = Artist::query()
            ->where('status', 'approved')
            ->whereNull('managed_by_user_id')
            ->orderBy('name');

        if ($catalogSearch !== '') {
            $escaped = addcslashes($catalogSearch, '%_\\');
            $catalogQuery->where('name', 'like', '%'.$escaped.'%');
        }

        $catalog = $catalogQuery
            ->paginate(10, ['*'], 'catalog_page')
            ->withQueryString();

        return Inertia::render('Artist/Organization/ArtistsIndex', [
            'roster' => $roster,
            'catalog' => $catalog,
            'filters' => ['catalog_search' => $catalogSearch],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->assertManager($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:8000'],
        ]);

        $normalizedName = mb_strtolower(trim($validated['name']));
        if ($normalizedName !== '' && Artist::query()->whereRaw('LOWER(TRIM(name)) = ?', [$normalizedName])->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Bu isimde bir sanatçı zaten kayıtlı. Katalogdan kadronuza ekleyebilir veya farklı bir ad kullanabilirsiniz.',
            ]);
        }

        Artist::query()->create([
            'user_id' => null,
            'managed_by_user_id' => $request->user()->id,
            'name' => trim($validated['name']),
            'slug' => Str::slug($validated['name']).'-'.Str::lower(Str::random(4)),
            'bio' => isset($validated['bio']) && is_string($validated['bio']) && trim($validated['bio']) !== ''
                ? trim($validated['bio'])
                : null,
            'status' => 'pending',
            'country_code' => 'TR',
        ]);

        return redirect()
            ->route('artist.organization.artists.index')
            ->with('success', 'Sanatçı kaydı oluşturuldu. Site yönetimi onayından sonra yayında görünür ve kadronuzda kalır.');
    }

    public function attach(Request $request, Artist $artist): RedirectResponse
    {
        $this->assertManager($request);

        if ($artist->status !== 'approved') {
            return back()->with('error', 'Yalnızca onaylı sanatçılar kadroya eklenebilir.');
        }

        if ($artist->managed_by_user_id !== null) {
            if ((int) $artist->managed_by_user_id === (int) $request->user()->id) {
                return back()->with('success', 'Bu sanatçı zaten kadronuzda.');
            }

            return back()->with('error', 'Bu sanatçı başka bir organizasyona bağlı. Önce mevcut bağlantının kaldırılması gerekir.');
        }

        $artist->update(['managed_by_user_id' => $request->user()->id]);

        SahnebulMail::organizationArtistRosterAttached($artist->fresh(), $request->user());

        return back()->with('success', 'Sanatçı kadronuza eklendi.');
    }

    public function detach(Request $request, Artist $artist): RedirectResponse
    {
        $this->assertManager($request);

        if ((int) $artist->managed_by_user_id !== (int) $request->user()->id) {
            abort(403);
        }

        $artist->update(['managed_by_user_id' => null]);

        return back()->with('success', 'Sanatçı kadronuzdan çıkarıldı.');
    }

    /**
     * Kadrodaki sanatçı için site yönetimine düzenleme önerisi (PublicEditSuggestion — admin inceler).
     */
    public function proposeUpdate(Request $request, Artist $artist): RedirectResponse
    {
        $this->assertManager($request);

        if ((int) $artist->managed_by_user_id !== (int) $request->user()->id) {
            abort(403);
        }

        if ($artist->status === 'approved') {
            $payload = ArtistEditSuggestionPayload::validateAndNormalize($request);
        } else {
            $payload = $this->validatePendingManagedArtistProposal($request);
        }

        $row = PublicEditSuggestion::create([
            'suggestable_type' => $artist->getMorphClass(),
            'suggestable_id' => $artist->getKey(),
            'user_id' => $request->user()->id,
            'guest_name' => null,
            'guest_email' => null,
            'message' => $payload['message'],
            'proposed_changes' => $payload['proposed_changes'],
            'status' => 'pending',
        ]);

        $row->load(['user', 'suggestable']);
        SahnebulMail::publicEditSuggestionSubmitted($row);

        return back()->with(
            'success',
            'Düzenleme öneriniz site yönetimine iletildi. Onaylandığında profil güncellenir.'
        );
    }

    /**
     * @return array{message: string, proposed_changes: array<string, mixed>|null}
     */
    private function validatePendingManagedArtistProposal(Request $request): array
    {
        $validated = Validator::make($request->all(), [
            'message' => ['nullable', 'string', 'max:5000'],
            'name' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:12000'],
        ])->validate();

        $name = isset($validated['name']) && is_string($validated['name']) ? trim($validated['name']) : '';
        $bio = isset($validated['bio']) && is_string($validated['bio']) ? trim($validated['bio']) : '';
        $message = isset($validated['message']) && is_string($validated['message']) ? trim($validated['message']) : '';

        $proposed = array_filter([
            'name' => $name !== '' ? $name : null,
            'bio' => $bio !== '' ? $bio : null,
        ], fn ($v) => $v !== null);

        if ($proposed === [] && mb_strlen($message) < 20) {
            throw ValidationException::withMessages([
                'message' => 'İsim veya biyografi girin ya da en az 20 karakterlik bir not yazın.',
            ]);
        }

        return [
            'message' => $message,
            'proposed_changes' => $proposed === [] ? null : $proposed,
        ];
    }

    private function assertManager(Request $request): void
    {
        abort_unless($request->user()?->isManagerOrganization(), 403, 'Bu sayfa yalnızca organizasyon firması hesapları içindir.');
    }
}
