<?php

namespace App\Services\Subscriptions;

use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\UserSubscription;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

class SubscriptionPurchaseService
{
    /**
     * Aktif abonelikleri atomik olarak iptal edip yeni kayıt oluşturur.
     *
     * @throws InvalidArgumentException İş kuralı ihlali (HTTP’ye çevrilir)
     */
    public function purchase(User $user, SubscriptionPlan $plan): UserSubscription
    {
        $this->assertEligible($user, $plan);

        return DB::transaction(function () use ($user, $plan): UserSubscription {
            UserSubscription::query()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->where('ends_at', '>', now())
                ->lockForUpdate()
                ->update(['status' => 'cancelled']);

            $startsAt = now();
            $trialDays = (int) ($plan->trial_days ?? 0);
            $afterTrial = $startsAt->copy()->addDays($trialDays);
            $endsAt = $plan->interval === 'yearly'
                ? $afterTrial->copy()->addYear()
                : $afterTrial->copy()->addMonth();

            $subscription = UserSubscription::create([
                'user_id' => $user->id,
                'subscription_plan_id' => $plan->id,
                'status' => 'active',
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
            ]);

            Log::channel('security')->info('subscription.purchased', [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'plan_slug' => $plan->slug,
                'membership_type' => $plan->membership_type,
                'subscription_id' => $subscription->id,
            ]);

            return $subscription;
        });
    }

    public function assertEligible(User $user, SubscriptionPlan $plan): void
    {
        if ($user->isSuperAdmin()) {
            throw new InvalidArgumentException('Süper yöneticiler üyelik paketi satın alamaz.');
        }

        if (! $plan->is_active) {
            throw new InvalidArgumentException('Bu paket artık aktif değil.');
        }

        if ($plan->membership_type === 'artist' && ! $user->isArtist()) {
            throw new InvalidArgumentException('Sanatçı üyeliği yalnızca sanatçı hesapları satın alabilir.');
        }

        if ($plan->membership_type === 'venue' && ! $user->venues()->exists()) {
            throw new InvalidArgumentException('Mekan üyeliği yalnızca size bağlı en az bir mekan varken satın alınabilir.');
        }

        if ($plan->membership_type === 'manager' && ! $user->isManagementAccount()) {
            throw new InvalidArgumentException('Bu paket yalnızca Management firması hesapları tarafından satın alınabilir.');
        }
    }
}
