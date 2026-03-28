<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class BrowserNotificationController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        $latest = $user->unreadNotifications()->latest()->first();

        return response()->json([
            'unread_count' => $user->unreadNotifications()->count(),
            'latest' => $latest === null ? null : [
                'id' => $latest->id,
                'message' => is_array($latest->data) && isset($latest->data['message']) && is_string($latest->data['message'])
                    ? $latest->data['message']
                    : 'Yeni bildirim',
            ],
        ]);
    }

    public function update(Request $request): Response
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $request->user()->forceFill([
            'browser_notifications_enabled' => $validated['enabled'],
        ])->save();

        return response()->noContent();
    }
}
