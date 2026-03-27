<?php

namespace Database\Seeders;

use App\Models\Artist;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\Venue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoProfileUsersSeeder extends Seeder
{
    /**
     * Yerel geliştirme için: profil düzenleme / sahne paneli test hesapları.
     *
     * - Mekan sahibi: customer + Gold (venue) + onaylı mekana user_id — /giris/mekan ve /sahne uyumlu
     * - Sanatçı: artist + bir Artist kaydına user_id atanır
     */
    public function run(): void
    {
        if (! SubscriptionPlan::query()->where('slug', 'gold-monthly')->exists()) {
            $this->call(SubscriptionPlanSeeder::class);
        }

        $goldPlan = SubscriptionPlan::query()->where('slug', 'gold-monthly')->first();
        if (! $goldPlan) {
            return;
        }

        $venueOwner = User::updateOrCreate(
            ['email' => 'mekan-sahibi@sahnebul.test'],
            [
                'name' => 'Demo Mekan Sahibi',
                'password' => Hash::make('password'),
                'role' => 'venue_owner',
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        UserSubscription::query()->where('user_id', $venueOwner->id)->delete();
        UserSubscription::create([
            'user_id' => $venueOwner->id,
            'subscription_plan_id' => $goldPlan->id,
            'status' => 'active',
            'starts_at' => now(),
            'ends_at' => now()->addYear(),
        ]);

        $venue = Venue::query()
            ->where('status', 'approved')
            ->where(function ($q) use ($venueOwner) {
                $q->whereNull('user_id')->orWhere('user_id', $venueOwner->id);
            })
            ->first();
        if ($venue) {
            $venue->update(['user_id' => $venueOwner->id]);
        }

        $performer = User::updateOrCreate(
            ['email' => 'sanatci@sahnebul.test'],
            [
                'name' => 'Demo Sanatçı',
                'password' => Hash::make('password'),
                'role' => 'artist',
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        UserSubscription::query()->where('user_id', $performer->id)->delete();
        UserSubscription::create([
            'user_id' => $performer->id,
            'subscription_plan_id' => $goldPlan->id,
            'status' => 'active',
            'starts_at' => now(),
            'ends_at' => now()->addYear(),
        ]);

        if (! Artist::query()->where('user_id', $performer->id)->exists()) {
            $freeArtist = Artist::query()->whereNull('user_id')->first();
            if ($freeArtist) {
                $freeArtist->update(['user_id' => $performer->id]);
            }
        }
    }
}
