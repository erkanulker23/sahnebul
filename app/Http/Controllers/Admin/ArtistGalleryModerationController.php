<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ArtistMedia;
use App\Services\AppSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ArtistGalleryModerationController extends Controller
{
    public function index(): Response
    {
        $items = ArtistMedia::query()
            ->moderationPending()
            ->with(['artist:id,name,slug,user_id', 'artist.user:id,name,email'])
            ->orderByDesc('created_at')
            ->paginate(24);

        return Inertia::render('Admin/ArtistGalleryModeration/Index', [
            'items' => $items,
        ]);
    }

    public function approve(ArtistMedia $media)
    {
        if ($media->moderation_status !== ArtistMedia::MODERATION_PENDING) {
            return back()->with('error', 'Bu kayıt bekleyen durumda değil.');
        }

        $media->update([
            'moderation_status' => ArtistMedia::MODERATION_APPROVED,
            'moderation_note' => null,
        ]);

        app(AppSettingsService::class)->forgetCaches();

        return back()->with('success', 'Görsel onaylandı ve sanatçı sayfasında yayınlandı.');
    }

    public function reject(Request $request, ArtistMedia $media)
    {
        if ($media->moderation_status !== ArtistMedia::MODERATION_PENDING) {
            return back()->with('error', 'Bu kayıt bekleyen durumda değil.');
        }

        if ($media->path) {
            Storage::disk('public')->delete($media->path);
        }
        if ($media->thumbnail) {
            Storage::disk('public')->delete($media->thumbnail);
        }

        $media->delete();

        app(AppSettingsService::class)->forgetCaches();

        return back()->with('success', 'Görsel reddedildi ve kaldırıldı.');
    }
}
