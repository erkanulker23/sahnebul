<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\User;
use App\Support\UserContactValidation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
            ->paginate(20)
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
        ]);
    }

    public function toggleActive(User $user)
    {
        if ($user->id === auth()->id()) {
            return back()->with('error', 'Kendi hesabınızı devre dışı bırakamazsınız.');
        }
        if ($user->isAdmin()) {
            return back()->with('error', 'Admin hesapları devre dışı bırakılamaz.');
        }
        $user->update(['is_active' => ! $user->is_active]);

        return back()->with('success', $user->is_active ? 'Kullanıcı aktifleştirildi.' : 'Hesap donduruldu.');
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return back()->with('error', 'Kendi hesabınızı silemezsiniz.');
        }
        if ($user->isAdmin()) {
            return back()->with('error', 'Admin hesapları silinemez.');
        }
        $user->delete();

        return back()->with('success', 'Kullanıcı silindi.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => array_merge(UserContactValidation::emailRequired(), ['unique:users,email']),
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', 'in:customer,artist,venue_owner,manager_organization,admin,super_admin'],
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
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => array_merge(UserContactValidation::emailRequired(), ['unique:users,email,'.$user->id]),
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['required', 'in:customer,artist,venue_owner,manager_organization,admin,super_admin'],
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

        return back()->with('success', 'Kullanıcı güncellendi.');
    }
}
