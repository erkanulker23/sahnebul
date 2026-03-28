<?php

namespace Tests\Feature\User;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventReminderPreferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_update_reminder_preferences(): void
    {
        $user = User::factory()->create([
            'role' => 'customer',
            'event_reminder_email_enabled' => true,
            'event_reminder_sms_enabled' => false,
            'event_reminder_email_hour' => 10,
        ]);

        $this->actingAs($user)
            ->patch(route('user.event-reminders.preferences', absolute: false), [
                'event_reminder_email_enabled' => true,
                'event_reminder_sms_enabled' => true,
                'event_reminder_email_hour' => 18,
                'phone' => '+90 555 111 2233',
            ])
            ->assertRedirect();

        $user->refresh();
        $this->assertTrue($user->event_reminder_email_enabled);
        $this->assertTrue($user->event_reminder_sms_enabled);
        $this->assertSame(18, $user->event_reminder_email_hour);
        $this->assertSame('+90 555 111 2233', $user->phone);
    }

    public function test_sms_on_requires_phone(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        $this->actingAs($user)
            ->patch(route('user.event-reminders.preferences', absolute: false), [
                'event_reminder_email_enabled' => true,
                'event_reminder_sms_enabled' => true,
                'event_reminder_email_hour' => 9,
                'phone' => '',
            ])
            ->assertSessionHasErrors('phone');
    }
}
