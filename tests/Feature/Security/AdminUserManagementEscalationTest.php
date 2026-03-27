<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserManagementEscalationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_cannot_create_super_admin_user(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->post(route('admin.users.store'), [
            'name' => 'Evil',
            'email' => 'evil@example.com',
            'password' => 'secret12',
            'role' => 'super_admin',
            'is_active' => true,
        ])->assertSessionHasErrors('role');

        $this->assertDatabaseMissing('users', ['email' => 'evil@example.com']);
    }

    public function test_super_admin_can_create_super_admin_user(): void
    {
        $super = User::factory()->superAdmin()->create();

        $this->actingAs($super)->post(route('admin.users.store'), [
            'name' => 'Yeni Süper',
            'email' => 'super2@example.com',
            'password' => 'secret12',
            'role' => 'super_admin',
            'is_active' => true,
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('users', [
            'email' => 'super2@example.com',
            'role' => 'super_admin',
        ]);
    }

    public function test_admin_cannot_open_edit_screen_for_another_admin(): void
    {
        $admin = User::factory()->admin()->create();
        $other = User::factory()->admin()->create(['email' => 'other-admin@example.com']);

        $this->actingAs($admin)->get(route('admin.users.edit', $other))->assertForbidden();
    }

    public function test_super_admin_can_open_edit_screen_for_admin(): void
    {
        $super = User::factory()->superAdmin()->create();
        $other = User::factory()->admin()->create(['email' => 'other-admin@example.com']);

        $this->actingAs($super)->get(route('admin.users.edit', $other))->assertOk();
    }

    public function test_admin_cannot_escalate_user_to_super_admin_via_update(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create([
            'role' => 'customer',
            'email' => 'target@example.com',
        ]);

        $this->actingAs($admin)->put(route('admin.users.update', $target), [
            'name' => $target->name,
            'email' => $target->email,
            'role' => 'super_admin',
            'is_active' => true,
        ])->assertSessionHasErrors('role');

        $this->assertSame('customer', $target->fresh()->role);
    }
}
