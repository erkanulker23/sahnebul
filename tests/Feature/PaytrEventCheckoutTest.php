<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\User;
use App\Models\Venue;
use App\Services\PaytrDirectApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaytrEventCheckoutTest extends TestCase
{
    use RefreshDatabase;

    private function seedPaidEvent(): Event
    {
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'ist-'.uniqid()]);
        $venueOwner = User::factory()->create(['role' => 'customer']);
        $venue = Venue::query()->create([
            'user_id' => $venueOwner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Mekan',
            'slug' => 'mekan-'.uniqid(),
            'address' => 'Adres 1',
            'status' => 'approved',
            'is_active' => true,
        ]);

        return Event::query()->create([
            'venue_id' => $venue->id,
            'title' => 'Ücretli Konser',
            'slug' => 'ucretli-'.uniqid(),
            'start_date' => now()->addWeek(),
            'end_date' => now()->addWeek()->addHours(3),
            'status' => 'published',
            'entry_is_paid' => true,
            'ticket_price' => 150.00,
            'ticket_acquisition_mode' => Event::TICKET_MODE_SAHNEBUL_CARD,
            'sahnebul_reservation_enabled' => false,
            'paytr_checkout_enabled' => true,
        ]);
    }

    private function seedPaytrOperational(): void
    {
        $paytr = app(PaytrDirectApiService::class);
        $paytr->persistSettings([
            'paytr_enabled' => true,
            'paytr_test_mode' => true,
            'paytr_merchant_id' => '123456',
        ], 'test-merchant-key-32-chars-minimum-', 'test-merchant-salt-32-chars-minxx');
    }

    public function test_guest_is_redirected_from_checkout(): void
    {
        $event = $this->seedPaidEvent();
        $this->seedPaytrOperational();

        $this->get(route('paytr.event-checkout.show', ['segment' => $event->publicUrlSegment()]))
            ->assertRedirect();
    }

    public function test_customer_with_phone_sees_checkout_form(): void
    {
        $event = $this->seedPaidEvent();
        $this->seedPaytrOperational();

        $user = User::factory()->create([
            'role' => 'customer',
            'phone' => '0532 111 2233',
        ]);

        $this->actingAs($user)
            ->get(route('paytr.event-checkout.show', ['segment' => $event->publicUrlSegment()]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Paytr/EventCheckout'));
    }

    public function test_checkout_blocked_when_event_disables_paytr_card(): void
    {
        $event = $this->seedPaidEvent();
        $event->update([
            'ticket_acquisition_mode' => Event::TICKET_MODE_SAHNEBUL_RESERVATION,
            'paytr_checkout_enabled' => false,
            'sahnebul_reservation_enabled' => true,
        ]);
        $this->seedPaytrOperational();

        $user = User::factory()->create([
            'role' => 'customer',
            'phone' => '0532 111 2233',
        ]);

        $this->actingAs($user)
            ->get(route('paytr.event-checkout.show', ['segment' => $event->publicUrlSegment()]))
            ->assertRedirect(route('events.show', ['event' => $event->publicUrlSegment()]));
    }
}
