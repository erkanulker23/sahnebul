<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\EventReview;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class EventReviewEligibilityTest extends TestCase
{
    use RefreshDatabase;

    private function makePublishedEvent(): array
    {
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'istanbul-'.uniqid()]);
        $owner = User::factory()->create(['role' => 'venue_owner']);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Test Mekân',
            'slug' => 'test-mekan-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
        ]);

        $event = Event::withoutEvents(fn () => Event::query()->create([
            'venue_id' => $venue->id,
            'title' => 'Konser',
            'slug' => 'konser-'.uniqid(),
            'start_date' => now()->subDay(),
            'end_date' => now()->subDay()->addHours(3),
            'status' => 'published',
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => true,
        ]));

        return [$event, $venue];
    }

    private function makeReservation(User $user, Venue $venue, Event $event, string $status): Reservation
    {
        return Reservation::query()->create([
            'user_id' => $user->id,
            'guest_name' => 'Misafir',
            'guest_phone' => '+905551112233',
            'venue_id' => $venue->id,
            'event_id' => $event->id,
            'reservation_date' => $event->start_date?->toDateString() ?? now()->toDateString(),
            'reservation_time' => '21:00',
            'reservation_type' => 'ticket',
            'guest_count' => 1,
            'quantity' => 1,
            'total_amount' => 100,
            'qr_code' => 'QR-'.strtoupper(Str::random(10)),
            'status' => $status,
        ]);
    }

    public function test_guest_cannot_post_event_review(): void
    {
        [$event] = $this->makePublishedEvent();

        $this->post(route('event-reviews.store', $event->id), [
            'rating' => 5,
            'comment' => 'Harika',
        ])->assertRedirect(route('login', absolute: false));
    }

    public function test_user_without_reservation_cannot_review(): void
    {
        [$event] = $this->makePublishedEvent();
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer)
            ->from('/etkinlikler/'.$event->id)
            ->post(route('event-reviews.store', $event->id), [
                'rating' => 5,
                'comment' => 'Test',
            ])
            ->assertRedirect('/etkinlikler/'.$event->id)
            ->assertSessionHas('error');

        $this->assertSame(0, EventReview::query()->where('event_id', $event->id)->count());
    }

    public function test_user_with_pending_reservation_cannot_review(): void
    {
        [$event, $venue] = $this->makePublishedEvent();
        $customer = User::factory()->create(['role' => 'customer']);
        $this->makeReservation($customer, $venue, $event, 'pending');

        $this->actingAs($customer)
            ->from('/etkinlikler/'.$event->id)
            ->post(route('event-reviews.store', $event->id), [
                'rating' => 4,
                'comment' => null,
            ])
            ->assertSessionHas('error');

        $this->assertSame(0, EventReview::query()->where('event_id', $event->id)->count());
    }

    public function test_user_with_confirmed_reservation_can_review(): void
    {
        [$event, $venue] = $this->makePublishedEvent();
        $customer = User::factory()->create(['role' => 'customer']);
        $this->makeReservation($customer, $venue, $event, 'confirmed');

        $this->actingAs($customer)
            ->from('/etkinlikler/'.$event->id)
            ->post(route('event-reviews.store', $event->id), [
                'rating' => 5,
                'comment' => 'Süper',
            ])
            ->assertSessionHas('success');

        $this->assertSame(1, EventReview::query()->where('event_id', $event->id)->where('user_id', $customer->id)->count());
    }
}
