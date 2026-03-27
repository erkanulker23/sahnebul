<?php

namespace App\Services\Admin;

use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\UserSubscription;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AdminSubscriptionAssignmentService
{
    public const COMPLIMENTARY_VENUE_SLUG = 'admin-complimentary-unlimited-venue';

    public const COMPLIMENTARY_ARTIST_SLUG = 'admin-complimentary-unlimited-artist';

    /**
     * @param  'remove'|'plan'|'complimentary'  $mode
     */
    public function assign(User $user, string $mode, ?int $planId = null, ?Carbon $endsAt = null, string $expectedMembershipType = 'venue'): void
    {
        if (! in_array($expectedMembershipType, ['venue', 'artist'], true)) {
            throw new InvalidArgumentException('expectedMembershipType must be venue or artist.');
        }

        DB::transaction(function () use ($user, $mode, $planId, $endsAt, $expectedMembershipType): void {
            $this->cancelActiveSubscriptions($user);

            if ($mode === 'remove') {
                return;
            }

            if ($mode === 'complimentary') {
                $slug = $expectedMembershipType === 'venue'
                    ? self::COMPLIMENTARY_VENUE_SLUG
                    : self::COMPLIMENTARY_ARTIST_SLUG;
                $plan = SubscriptionPlan::query()->where('slug', $slug)->firstOrFail();
                $startsAt = now();
                $end = Carbon::parse('2099-12-31 23:59:59', config('app.timezone'));

                UserSubscription::create([
                    'user_id' => $user->id,
                    'subscription_plan_id' => $plan->id,
                    'status' => 'active',
                    'starts_at' => $startsAt,
                    'ends_at' => $end,
                ]);

                return;
            }

            if ($mode === 'plan') {
                if ($planId === null || $planId <= 0) {
                    throw new InvalidArgumentException('plan_id gerekli.');
                }
                $plan = SubscriptionPlan::query()->whereKey($planId)->where('is_active', true)->firstOrFail();
                if ($plan->membership_type !== $expectedMembershipType) {
                    throw new InvalidArgumentException('Paket türü beklenen üyelik ile uyuşmuyor.');
                }
                $startsAt = now();
                $end = $endsAt ?? $this->defaultEndForPlan($plan, $startsAt);

                UserSubscription::create([
                    'user_id' => $user->id,
                    'subscription_plan_id' => $plan->id,
                    'status' => 'active',
                    'starts_at' => $startsAt,
                    'ends_at' => $end,
                ]);
            }
        });
    }

    private function cancelActiveSubscriptions(User $user): void
    {
        UserSubscription::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where('ends_at', '>', now())
            ->update(['status' => 'cancelled']);
    }

    private function defaultEndForPlan(SubscriptionPlan $plan, Carbon $startsAt): Carbon
    {
        $trialDays = (int) ($plan->trial_days ?? 0);
        $afterTrial = $startsAt->copy()->addDays($trialDays);

        return $plan->interval === 'yearly'
            ? $afterTrial->copy()->addYear()
            : $afterTrial->copy()->addMonth();
    }
}
