<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Notifications\AdminBroadcastNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AdminBroadcastNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_broadcast_form(): void
    {
        $this->get(route('admin.notifications.broadcast'))->assertRedirect();
    }

    public function test_customer_cannot_access_broadcast_form(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        $this->actingAs($user)->get(route('admin.notifications.broadcast'))->assertForbidden();
    }

    public function test_admin_can_send_to_opt_in_audience_only(): void
    {
        Notification::fake();

        $admin = User::factory()->admin()->create();
        $optIn = User::factory()->create([
            'role' => 'customer',
            'browser_notifications_enabled' => true,
        ]);
        $optOut = User::factory()->create([
            'role' => 'customer',
            'browser_notifications_enabled' => false,
        ]);

        $this->actingAs($admin)->post(route('admin.notifications.broadcast.store'), [
            'title' => 'Duyuru',
            'message' => 'Merhaba',
            'action_url' => '/etkinlikler',
            'audience' => 'browser_opt_in',
        ])->assertRedirect(route('admin.notifications.broadcast'));

        Notification::assertSentTo($optIn, AdminBroadcastNotification::class);
        Notification::assertNotSentTo($optOut, AdminBroadcastNotification::class);
    }

    public function test_admin_can_send_to_all_members(): void
    {
        Notification::fake();

        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create([
            'role' => 'customer',
            'browser_notifications_enabled' => false,
        ]);

        $this->actingAs($admin)->post(route('admin.notifications.broadcast.store'), [
            'message' => 'Genel mesaj',
            'audience' => 'all_members',
        ])->assertRedirect(route('admin.notifications.broadcast'));

        Notification::assertSentTo($customer, AdminBroadcastNotification::class);
    }

    public function test_action_url_must_be_internal_path(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->post(route('admin.notifications.broadcast.store'), [
            'message' => 'X',
            'action_url' => 'https://evil.example',
            'audience' => 'all_members',
        ])->assertSessionHasErrors('action_url');
    }

    public function test_broadcast_persists_database_notification_without_queue_worker(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($admin)->post(route('admin.notifications.broadcast.store'), [
            'title' => 'Duyuru',
            'message' => 'İçerik',
            'audience' => 'all_members',
        ])->assertRedirect(route('admin.notifications.broadcast'));

        $this->assertDatabaseCount('notifications', 1);
        $n = $customer->notifications()->first();
        $this->assertNotNull($n);
        $this->assertSame('admin_broadcast', $n->data['kind'] ?? null);
        $this->assertSame('İçerik', $n->data['message'] ?? null);
    }
}
