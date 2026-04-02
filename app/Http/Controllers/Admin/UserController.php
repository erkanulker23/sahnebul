<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Event;
use App\Models\User;
use App\Models\Venue;
use App\Support\AdminAssignableUserRoles;
use App\Support\ArtistProfileInputs;
use App\Support\ManagementPublicProfile;
use App\Support\UserContactValidation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::query()
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%"))
            ->when($request->role, fn ($q) => $q->where('role', $request->role))
            ->when($request->status === 'active', fn ($q) => $q->where('is_active', true))
            ->when($request->status === 'inactive', fn ($q) => $q->where('is_active', false))
            ->latest()
            ->paginate(50)
            ->withQueryString();

        $userIds = $users->getCollection()->pluck('id');
        $linkedArtistIdByUser = $userIds->isEmpty()
            ? collect()
            : Artist::query()
                ->whereIn('user_id', $userIds)
                ->orderBy('id')
                ->get(['id', 'user_id'])
                ->unique('user_id')
                ->pluck('id', 'user_id');

        $users->getCollection()->transform(function (User $user) use ($linkedArtistIdByUser) {
            $aid = $linkedArtistIdByUser->get($user->id);
            $user->setAttribute('linked_artist_id', $aid !== null ? (int) $aid : null);

            return $user;
        });

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => $request->only(['search', 'role', 'status']),
            'canAssignElevatedRoles' => $request->user()->isSuperAdmin(),
        ]);
    }

    public function edit(Request $request, User $user)
    {
        $this->authorizeAdminUserEdit($request->user(), $user);

        return Inertia::render('Admin/Users/Edit', [
            'user' => $user->only([
                'id', 'name', 'email', 'role', 'is_active', 'stage_trusted_publisher',
                'organization_display_name',
                'organization_public_slug',
                'organization_about',
                'organization_cover_image',
                'organization_website',
                'organization_social_links',
                'organization_meta_description',
                'organization_profile_published',
            ]),
            'canAssignElevatedRoles' => $request->user()->isSuperAdmin(),
            'stage_activity' => self::stageActivityPayload($user),
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function stageActivityPayload(User $user): ?array
    {
        if ($user->isManagementAccount()) {
            $managed = Artist::query()
                ->where('managed_by_user_id', $user->id)
                ->latest()
                ->limit(10)
                ->get(['id', 'name', 'slug', 'status', 'created_at']);

            $events = Event::query()
                ->where('created_by_user_id', $user->id)
                ->with(['venue:id,name,slug'])
                ->latest()
                ->limit(10)
                ->get(['id', 'venue_id', 'title', 'status', 'start_date', 'created_at']);

            return [
                'kind' => 'organization',
                'counts' => [
                    'managed_artists' => Artist::query()->where('managed_by_user_id', $user->id)->count(),
                    'events_created' => Event::query()->where('created_by_user_id', $user->id)->count(),
                ],
                'managed_artists' => $managed,
                'events_created' => $events,
            ];
        }

        if ($user->isVenueOwner()) {
            $venues = Venue::query()
                ->where('user_id', $user->id)
                ->latest()
                ->limit(10)
                ->get(['id', 'name', 'slug', 'status', 'created_at']);

            $events = Event::query()
                ->where('created_by_user_id', $user->id)
                ->with(['venue:id,name,slug'])
                ->latest()
                ->limit(10)
                ->get(['id', 'venue_id', 'title', 'status', 'start_date', 'created_at']);

            return [
                'kind' => 'venue_owner',
                'counts' => [
                    'venues' => Venue::query()->where('user_id', $user->id)->count(),
                    'events_created' => Event::query()->where('created_by_user_id', $user->id)->count(),
                ],
                'venues' => $venues,
                'events_created' => $events,
            ];
        }

        return null;
    }

    public function toggleActive(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Kendi hesabınızı devre dışı bırakamazsınız.');
        }

        if ($user->isSuperAdmin()) {
            return back()->with('error', 'Süper yönetici hesapları dondurulamaz.');
        }

        if ($user->isAdmin() && ! $request->user()->isSuperAdmin()) {
            return back()->with('error', 'Admin hesaplarını yalnızca süper yönetici dondurabilir.');
        }

        $user->update(['is_active' => ! $user->is_active]);

        return back()->with('success', $user->is_active ? 'Kullanıcı aktifleştirildi.' : 'Hesap donduruldu.');
    }

    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Kendi hesabınızı silemezsiniz.');
        }

        if ($user->isSuperAdmin()) {
            return back()->with('error', 'Süper yönetici hesapları silinemez.');
        }

        if ($user->isAdmin() && ! $request->user()->isSuperAdmin()) {
            return back()->with('error', 'Admin hesaplarını yalnızca süper yönetici silebilir.');
        }

        $user->delete();

        return back()->with('success', 'Kullanıcı silindi.');
    }

    public function store(Request $request)
    {
        $actor = $request->user();
        $assignable = AdminAssignableUserRoles::forActor($actor);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => array_merge(UserContactValidation::emailRequired(), ['unique:users,email']),
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', Rule::in($assignable)],
            'is_active' => ['nullable', 'boolean'],
        ]);

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_active' => (bool) ($validated['is_active'] ?? true),
        ]);

        return back()->with('success', 'Kullanıcı eklendi.');
    }

    public function update(Request $request, User $user)
    {
        $this->authorizeAdminUserEdit($request->user(), $user);

        $actor = $request->user();
        $assignable = AdminAssignableUserRoles::forActor($actor);

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => array_merge(UserContactValidation::emailRequired(), ['unique:users,email,'.$user->id]),
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['required', Rule::in($assignable)],
            'is_active' => ['nullable', 'boolean'],
            'stage_trusted_publisher' => ['nullable', 'boolean'],
        ];

        if ($request->input('role') === 'manager_organization') {
            $rules['organization_display_name'] = ['nullable', 'string', 'max:255'];
            $rules['organization_public_slug'] = ManagementPublicProfile::slugValidationRules($user->id);
            $rules['organization_about'] = ['nullable', 'string', 'max:200000'];
            $rules['organization_cover_image'] = ['nullable', 'string', 'max:2048'];
            $rules['organization_website'] = ['nullable', 'string', 'max:2048'];
            $rules['organization_meta_description'] = ['nullable', 'string', 'max:512'];
            $rules['organization_profile_published'] = ['nullable', 'boolean'];
            $rules['organization_social_links'] = ['nullable', 'array'];
            $rules['organization_social_links.*'] = ['nullable', 'string', 'max:2048'];
        }

        $validated = $request->validate($rules);

        $trustedApplicable = in_array($validated['role'], ['manager_organization', 'venue_owner'], true);
        $stageTrusted = $trustedApplicable && $request->boolean('stage_trusted_publisher');

        $payload = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'is_active' => (bool) ($validated['is_active'] ?? true),
            'stage_trusted_publisher' => $stageTrusted,
        ];

        if (! empty($validated['password'])) {
            $payload['password'] = Hash::make($validated['password']);
        }

        if ($validated['role'] === 'manager_organization') {
            $slug = trim((string) ($validated['organization_public_slug'] ?? ''));
            $published = $request->boolean('organization_profile_published');
            if ($published && $slug === '') {
                throw ValidationException::withMessages([
                    'organization_public_slug' => 'Kamu profili yayımlanırken profil adresi (slug) zorunludur.',
                ]);
            }
            $social = ArtistProfileInputs::normalizeSocialLinks($request->input('organization_social_links'));
            $about = trim((string) ($validated['organization_about'] ?? ''));
            $website = trim((string) ($validated['organization_website'] ?? ''));
            $cover = trim((string) ($validated['organization_cover_image'] ?? ''));
            $meta = trim((string) ($validated['organization_meta_description'] ?? ''));
            $displayName = trim((string) ($validated['organization_display_name'] ?? ''));

            $payload['organization_display_name'] = $displayName !== '' ? $displayName : null;
            $payload['organization_public_slug'] = $slug !== '' ? $slug : null;
            $payload['organization_about'] = $about !== '' ? $about : null;
            $payload['organization_cover_image'] = $cover !== '' ? $cover : null;
            $payload['organization_website'] = $website !== '' ? $website : null;
            $payload['organization_social_links'] = $social;
            $payload['organization_meta_description'] = $meta !== '' ? $meta : null;
            $payload['organization_profile_published'] = $published && $slug !== '';
        } else {
            $payload['organization_public_slug'] = null;
            $payload['organization_about'] = null;
            $payload['organization_cover_image'] = null;
            $payload['organization_website'] = null;
            $payload['organization_social_links'] = null;
            $payload['organization_meta_description'] = null;
            $payload['organization_profile_published'] = false;
        }

        $user->update($payload);

        return redirect()
            ->route('admin.users.edit', $user)
            ->with('success', 'Kullanıcı güncellendi.');
    }

    public function sendPasswordReset(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Kendi hesabınız için bu işlemi kullanamazsınız.');
        }

        if (($user->isAdmin() || $user->isSuperAdmin()) && ! $request->user()->isSuperAdmin()) {
            abort(403, 'Yönetici hesapları için şifre sıfırlama yalnızca süper yönetici tarafından tetiklenebilir.');
        }

        $status = Password::sendResetLink(['email' => $user->email]);

        return $status === Password::RESET_LINK_SENT
            ? back()->with('success', 'Şifre sıfırlama bağlantısı e-posta ile gönderildi.')
            : back()->with('error', 'Şifre sıfırlama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    }

    private function authorizeAdminUserEdit(User $actor, User $target): void
    {
        if ($target->isAdmin() && ! AdminAssignableUserRoles::canManageAdminOrSuperAdminAccounts($actor)) {
            abort(403, 'Yönetici hesaplarını yalnızca süper yönetici düzenleyebilir.');
        }
    }
}
