<?php

namespace Tests\Feature\Reservation;

use App\Mail\SahnebulTemplateMail;
use App\Models\Category;
use App\Models\City;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ReservationStoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_submit_reservation_with_guest_contact_and_notifies_admins(): void
    {
        Mail::fake();

        User::factory()->create([
            'role' => 'super_admin',
            'email' => 'ops@example.com',
            'is_active' => true,
        ]);

        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'istanbul-'.uniqid()]);
        $owner = User::factory()->create(['role' => 'customer']);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Rezervasyon Mekânı',
            'slug' => 'rez-mekan-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
        ]);

        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer)->post(route('reservations.store'), [
            'venue_id' => $venue->id,
            'guest_name' => 'Ali Veli',
            'guest_phone' => '+905551112233',
            'event_id' => null,
            'reservation_date' => now()->addDay()->format('Y-m-d'),
            'reservation_time' => '20:30',
            'reservation_type' => 'table',
            'guest_count' => 3,
            'quantity' => 1,
            'notes' => 'Doğum günü',
        ])->assertRedirect(route('reservations.index'));

        $this->assertDatabaseHas('reservations', [
            'venue_id' => $venue->id,
            'user_id' => $customer->id,
            'guest_name' => 'Ali Veli',
            'guest_phone' => '0555 111 22 33',
            'guest_count' => 3,
        ]);

        Mail::assertSent(SahnebulTemplateMail::class, function (SahnebulTemplateMail $mail): bool {
            return str_contains($mail->emailSubject, 'Sahnebul rezervasyon talebi');
        });
    }
}
