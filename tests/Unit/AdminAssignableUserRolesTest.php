<?php

namespace Tests\Unit;

use App\Models\User;
use App\Support\AdminAssignableUserRoles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAssignableUserRolesTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_assign_all_roles(): void
    {
        $actor = User::factory()->superAdmin()->create();
        $roles = AdminAssignableUserRoles::forActor($actor);

        $this->assertContains('super_admin', $roles);
        $this->assertContains('admin', $roles);
        $this->assertContains('customer', $roles);
    }

    public function test_regular_admin_cannot_assign_elevated_roles_via_list(): void
    {
        $actor = User::factory()->admin()->create();
        $roles = AdminAssignableUserRoles::forActor($actor);

        $this->assertNotContains('super_admin', $roles);
        $this->assertNotContains('admin', $roles);
    }
}
