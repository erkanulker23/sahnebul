<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
                'name' => 'Bu isimde bir sanatçı zaten kayıtlı. Listeden bünyenize ekleyebilir veya farklı bir ad kullanabilirsiniz.',
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
            ->with('success', 'Sanatçı kaydı oluşturuldu. Site yönetimi onayından sonra yayında görünür.');
    }

    public function attach(Request $request, Artist $artist): RedirectResponse
    {
        $this->assertManager($request);

        if ($artist->status !== 'approved') {
            return back()->with('error', 'Yalnızca onaylı sanatçılar bünyeye eklenebilir.');
        }

        if ($artist->managed_by_user_id !== null) {
            if ((int) $artist->managed_by_user_id === (int) $request->user()->id) {
                return back()->with('success', 'Bu sanatçı zaten bünyenizde.');
            }

            return back()->with('error', 'Bu sanatçı başka bir organizasyona bağlı. Önce mevcut bağlantının kaldırılması gerekir.');
        }

        $artist->update(['managed_by_user_id' => $request->user()->id]);

        return back()->with('success', 'Sanatçı bünyenize eklendi.');
    }

    public function detach(Request $request, Artist $artist): RedirectResponse
    {
        $this->assertManager($request);

        if ((int) $artist->managed_by_user_id !== (int) $request->user()->id) {
            abort(403);
        }

        $artist->update(['managed_by_user_id' => null]);

        return back()->with('success', 'Sanatçı bünyenizden çıkarıldı.');
    }

    private function assertManager(Request $request): void
    {
        abort_unless($request->user()?->isManagerOrganization(), 403, 'Bu sayfa yalnızca organizasyon firması hesapları içindir.');
    }
}
