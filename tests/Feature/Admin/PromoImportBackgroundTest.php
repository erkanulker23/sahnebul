<?php

namespace Tests\Feature\Admin;

use App\Jobs\ProcessPromoGalleryUrlImportJob;
use App\Models\Artist;
use App\Models\User;
use App\Support\PromoGalleryUrlImportStatus;
use App\Support\UserBackgroundJobPointers;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Str;
use Tests\TestCase;

class PromoImportBackgroundTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_queue_post_poster_embed_only_import_in_background(): void
    {
        Bus::fake();

        $admin = User::factory()->admin()->create();
        $artist = Artist::query()->create([
            'name' => 'Test Artist',
            'slug' => 'test-artist',
            'status' => 'approved',
        ]);

        $response = $this->actingAs($admin)->post(route('admin.artists.import-promo-media', $artist, absolute: false), [
            'urls_text' => 'https://www.instagram.com/p/ABC123/',
            'mode' => 'promo_video',
            'append_promo' => true,
            'promo_poster_embed_only' => true,
            'promo_gallery_slot' => 'post',
            'promo_import_background' => true,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('promo_import_status_id');

        Bus::assertDispatched(ProcessPromoGalleryUrlImportJob::class, function (ProcessPromoGalleryUrlImportJob $job) use ($artist, $admin): bool {
            return $job->modelClass === Artist::class
                && (int) $job->modelId === (int) $artist->id
                && $job->posterEmbedOnly === true
                && $job->promoGallerySlot === 'post'
                && $job->userId === (int) $admin->id;
        });
    }

    public function test_status_endpoint_clears_promo_import_pointer_on_terminal_state(): void
    {
        $admin = User::factory()->admin()->create();
        $token = (string) Str::uuid();

        UserBackgroundJobPointers::setPromoImportToken((int) $admin->id, $token);
        PromoGalleryUrlImportStatus::boot($token, (int) $admin->id, 1);
        PromoGalleryUrlImportStatus::put($token, [
            'state' => 'completed',
            'current' => 1,
            'total' => 1,
            'ok' => 1,
            'message' => 'Tamamlandı',
        ]);

        $this->actingAs($admin)
            ->getJson(route('promo-import.status', ['token' => $token], absolute: false))
            ->assertOk()
            ->assertJsonPath('state', 'completed');

        $this->assertNull(UserBackgroundJobPointers::getPromoImportToken((int) $admin->id));
    }
}

