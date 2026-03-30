<?php

namespace Tests\Unit;

use App\Models\Event;
use PHPUnit\Framework\TestCase;

class EventPromoGalleryLegacyMergeTest extends TestCase
{
    public function test_prepends_legacy_video_when_gallery_exists_but_missing_path(): void
    {
        $event = new Event([
            'promo_video_path' => 'event-promo/orphan.mp4',
            'promo_embed_url' => 'https://www.instagram.com/p/abc/',
            'promo_gallery' => [
                [
                    'embed_url' => 'https://www.instagram.com/p/xyz/',
                    'video_path' => null,
                    'poster_path' => 'event-promo-posters/cover.jpg',
                    'promo_kind' => 'post',
                ],
            ],
        ]);

        $this->assertTrue($event->mergePromoGalleryOrphanLegacyVideoIntoGallery());

        $g = $event->promo_gallery;
        $this->assertIsArray($g);
        $this->assertSame('event-promo/orphan.mp4', $g[0]['video_path'] ?? null);
        $this->assertSame('story', $g[0]['promo_kind'] ?? null);
        $this->assertSame('event-promo-posters/cover.jpg', $g[1]['poster_path'] ?? null);
    }

    public function test_noop_when_legacy_path_already_in_gallery(): void
    {
        $event = new Event([
            'promo_video_path' => 'event-promo/same.mp4',
            'promo_gallery' => [
                [
                    'embed_url' => null,
                    'video_path' => 'event-promo/same.mp4',
                    'poster_path' => null,
                    'promo_kind' => 'story',
                ],
            ],
        ]);

        $this->assertFalse($event->mergePromoGalleryOrphanLegacyVideoIntoGallery());
        $this->assertCount(1, $event->promo_gallery);
    }

    public function test_noop_when_gallery_empty(): void
    {
        $event = new Event([
            'promo_video_path' => 'event-promo/only-legacy.mp4',
            'promo_gallery' => [],
        ]);

        $this->assertFalse($event->mergePromoGalleryOrphanLegacyVideoIntoGallery());
    }
}
