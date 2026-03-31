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
        $this->assertSame('0555 111 22 33', $user->phone);
    }

    public function test_phone_can_be_saved_when_sms_reminders_off(): void
    {
        $user = User::factory()->create([
            'role' => 'customer',
            'phone' => null,
            'event_reminder_sms_enabled' => false,
        ]);

        $this->actingAs($user)
            ->patch(route('user.event-reminders.preferences', absolute: false), [
                'event_reminder_email_enabled' => true,
                'event_reminder_sms_enabled' => false,
                'event_reminder_email_hour' => 11,
                'phone' => '0532 999 8877',
            ])
            ->assertRedirect();

        $user->refresh();
        $this->assertSame('0532 999 88 77', $user->phone);
    }

    public function test_empty_phone_with_sms_off_does_not_clear_existing_number(): void
    {
        $user = User::factory()->create([
            'role' => 'customer',
            'phone' => '0532 111 22 33',
            'event_reminder_sms_enabled' => false,
        ]);

        $this->actingAs($user)
            ->patch(route('user.event-reminders.preferences', absolute: false), [
                'event_reminder_email_enabled' => true,
                'event_reminder_sms_enabled' => false,
                'event_reminder_email_hour' => 9,
                'phone' => '',
            ])
            ->assertRedirect();

        $user->refresh();
        $this->assertSame('0532 111 22 33', $user->phone);
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
