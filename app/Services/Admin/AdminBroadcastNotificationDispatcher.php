<?php

namespace App\Services\Admin;

use App\Models\User;
use App\Notifications\AdminBroadcastNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;

final class AdminBroadcastNotificationDispatcher
{
    public const AUDIENCE_BROWSER_OPT_IN = 'browser_opt_in';

    public const AUDIENCE_ALL_MEMBERS = 'all_members';

    /**
     * @return Builder<User>
     */
    public function recipientQuery(string $audience): Builder
    {
        $q = User::query()
            ->where('is_active', true)
            ->whereNotIn('role', ['admin', 'super_admin']);

        if ($audience === self::AUDIENCE_BROWSER_OPT_IN) {
            $q->where('browser_notifications_enabled', true);
        } elseif ($audience !== self::AUDIENCE_ALL_MEMBERS) {
            $q->whereRaw('1 = 0');
        }

        return $q;
    }

    public function dispatch(User $admin, string $message, ?string $title, ?string $actionUrl, string $audience): int
    {
        $query = $this->recipientQuery($audience);
        $count = (clone $query)->count();

        $query->orderBy('id')->chunkById(500, function ($users) use ($message, $title, $actionUrl): void {
            foreach ($users as $user) {
                $user->notify(new AdminBroadcastNotification($message, $title, $actionUrl));
            }
        });

        Log::channel('security')->info('admin.broadcast_notification', [
            'admin_id' => $admin->id,
            'admin_email' => $admin->email,
            'audience' => $audience,
            'recipient_count' => $count,
            'title' => $title,
        ]);

        return $count;
    }
}
