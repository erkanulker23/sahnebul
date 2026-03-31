<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminReviewsPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_open_admin_reviews(): void
    {
        $this->get(route('admin.reviews.index'))->assertRedirect();
    }

    public function test_customer_cannot_open_admin_reviews(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        $this->actingAs($user)->get(route('admin.reviews.index'))->assertForbidden();
    }

    public function test_admin_can_open_reviews_moderation_page(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get(route('admin.reviews.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Reviews/Index'));
    }
}
