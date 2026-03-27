<?php

namespace Tests\Feature\Subscription;

use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\UserSubscription;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionPurchaseTest extends TestCase
{
    use RefreshDatabase;

    private function makeArtistPlan(): SubscriptionPlan
    {
        return SubscriptionPlan::query()->create([
            'name' => 'Gold Artist Test',
            'slug' => 'gold-artist-test-'.uniqid(),
            'membership_type' => 'artist',
            'interval' => 'monthly',
            'price' => 99.99,
            'is_active' => true,
            'show_in_public_catalog' => true,
            'trial_days' => 0,
            'features' => null,
        ]);
    }

    public function test_artist_can_purchase_artist_plan_and_previous_active_is_cancelled(): void
    {
        $user = User::factory()->artist()->create();
        $plan = $this->makeArtistPlan();

        $old = UserSubscription::query()->create([
            'user_id' => $user->id,
            'subscription_plan_id' => $plan->id,
            'status' => 'active',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addMonth(),
        ]);

        $this->actingAs($user)->post(route('subscriptions.store'), [
            'plan_id' => $plan->id,
        ])->assertRedirect(route('artist.dashboard', absolute: false));

        $this->assertSame('cancelled', $old->fresh()->status);

        $activeCount = UserSubscription::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where('ends_at', '>', now())
            ->count();

        $this->assertSame(1, $activeCount);
    }

    public function test_customer_cannot_purchase_artist_plan(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        $plan = $this->makeArtistPlan();

        $this->actingAs($user)->post(route('subscriptions.store'), [
            'plan_id' => $plan->id,
        ])->assertRedirect();

        $this->assertAuthenticated();
        $this->assertSame(0, UserSubscription::query()->where('user_id', $user->id)->count());
    }

    public function test_admin_cannot_access_subscription_catalog(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->get(route('subscriptions.index'))
            ->assertRedirect(route('admin.dashboard', absolute: false));
    }
}
