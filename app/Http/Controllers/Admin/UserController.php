<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\User;
use App\Support\AdminAssignableUserRoles;
use App\Support\UserContactValidation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;
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
            'user' => $user->only(['id', 'name', 'email', 'role', 'is_active']),
            'canAssignElevatedRoles' => $request->user()->isSuperAdmin(),
        ]);
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

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => array_merge(UserContactValidation::emailRequired(), ['unique:users,email,'.$user->id]),
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['required', Rule::in($assignable)],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $payload = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'is_active' => (bool) ($validated['is_active'] ?? true),
        ];

        if (! empty($validated['password'])) {
            $payload['password'] = Hash::make($validated['password']);
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
