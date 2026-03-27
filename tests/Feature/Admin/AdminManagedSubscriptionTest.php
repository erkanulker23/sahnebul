<?php

namespace Tests\Feature\Admin;

use App\Models\Category;
use App\Models\City;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminManagedSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private function seedVenuePlansForSqlite(): void
    {
        SubscriptionPlan::query()->create([
            'name' => 'Mekan Aylık Test',
            'slug' => 'gold-monthly',
            'membership_type' => 'venue',
            'interval' => 'monthly',
            'trial_days' => 0,
            'price' => 100,
            'is_active' => true,
            'show_in_public_catalog' => true,
            'features' => null,
        ]);
        SubscriptionPlan::query()->create([
            'name' => 'Yönetici sınırsız mekân',
            'slug' => 'admin-complimentary-unlimited-venue',
            'membership_type' => 'venue',
            'interval' => 'yearly',
            'trial_days' => 0,
            'price' => 0,
            'is_active' => true,
            'show_in_public_catalog' => false,
            'features' => null,
        ]);
    }

    public function test_admin_assigns_complimentary_venue_subscription_to_owner(): void
    {
        $this->seedVenuePlansForSqlite();

        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create(['role' => 'venue_owner']);
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'istanbul-'.uniqid()]);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Test Mekân',
            'slug' => 'test-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
        ]);

        $this->actingAs($admin)
            ->post(route('admin.venues.subscription.update', $venue), [
                'subscription_mode' => 'complimentary',
            ])
            ->assertRedirect();

        $sub = UserSubscription::query()->where('user_id', $owner->id)->where('status', 'active')->first();
        $this->assertNotNull($sub);
        $plan = SubscriptionPlan::query()->find($sub->subscription_plan_id);
        $this->assertNotNull($plan);
        $this->assertSame('admin-complimentary-unlimited-venue', $plan->slug);
        $this->assertTrue($sub->ends_at->year >= 2099);
    }

    public function test_admin_assigns_plan_with_end_date(): void
    {
        $this->seedVenuePlansForSqlite();

        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create(['role' => 'venue_owner']);
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'istanbul-'.uniqid()]);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Test Mekân',
            'slug' => 'test-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
        ]);

        $plan = SubscriptionPlan::query()->where('slug', 'gold-monthly')->firstOrFail();
        $ends = now()->addMonths(6)->format('Y-m-d H:i:s');

        $this->actingAs($admin)
            ->post(route('admin.venues.subscription.update', $venue), [
                'subscription_mode' => 'plan',
                'subscription_plan_id' => $plan->id,
                'subscription_ends_at' => $ends,
            ])
            ->assertRedirect();

        $sub = UserSubscription::query()->where('user_id', $owner->id)->where('status', 'active')->first();
        $this->assertNotNull($sub);
        $this->assertSame($plan->id, (int) $sub->subscription_plan_id);
    }

    public function test_venues_list_orders_featured_first(): void
    {
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'istanbul-list']);
        $base = [
            'user_id' => null,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'address' => 'A',
            'status' => 'approved',
        ];
        $v1 = Venue::query()->create([...$base, 'name' => 'Zebra', 'slug' => 'zebra-'.uniqid(), 'is_featured' => false]);
        $v2 = Venue::query()->create([...$base, 'name' => 'Alpha', 'slug' => 'alpha-'.uniqid(), 'is_featured' => true]);

        $response = $this->get('/mekanlar?city=istanbul-list');
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Venues/Index')
            ->has('venues.data', 2)
            ->where('venues.data.0.id', $v2->id)
            ->where('venues.data.1.id', $v1->id));
    }
}
