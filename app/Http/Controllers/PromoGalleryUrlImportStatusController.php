<?php

namespace App\Http\Controllers;

use App\Support\PromoGalleryUrlImportStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PromoGalleryUrlImportStatusController extends Controller
{
    public function show(Request $request, string $token): JsonResponse
    {
        $data = PromoGalleryUrlImportStatus::get($token);
        if ($data === null) {
            return response()->json(['error' => 'bulunamadı'], 404);
        }
        if ((int) ($data['user_id'] ?? 0) !== (int) $request->user()->id) {
            abort(403);
        }

        return response()->json([
            'state' => (string) ($data['state'] ?? 'unknown'),
            'current' => (int) ($data['current'] ?? 0),
            'total' => (int) ($data['total'] ?? 1),
            'ok' => (int) ($data['ok'] ?? 0),
            'message' => (string) ($data['message'] ?? ''),
            'failures' => is_array($data['failures'] ?? null) ? $data['failures'] : [],
            'active_url' => isset($data['active_url']) && is_string($data['active_url']) ? $data['active_url'] : null,
        ]);
    }
}
