<?php

namespace Tests\Feature;

use App\Models\Artist;
use App\Models\Category;
use App\Models\City;
use App\Models\PublicEditSuggestion;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicEditSuggestionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_submit_venue_edit_suggestion(): void
    {
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'istanbul-'.uniqid()]);
        $venue = Venue::query()->create([
            'user_id' => null,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Test Mekan',
            'slug' => 'test-mekan-'.uniqid(),
            'address' => 'Adres 1',
            'status' => 'approved',
        ]);

        $this->post(route('venues.edit-suggestion.store', $venue->slug), [
            'guest_name' => 'Ali Veli',
            'guest_email' => 'ali@example.com',
            'message' => 'Bu mekânın telefon numarası güncellenmeli lütfen.',
        ])->assertRedirect();

        $this->assertDatabaseHas('public_edit_suggestions', [
            'suggestable_type' => Venue::class,
            'suggestable_id' => $venue->id,
            'status' => 'pending',
        ]);
    }

    public function test_guest_can_submit_artist_edit_suggestion(): void
    {
        $artist = Artist::query()->create([
            'name' => 'Test Sanatçı',
            'slug' => 'test-sanatci-'.uniqid(),
            'status' => 'approved',
        ]);

        $this->post(route('artists.edit-suggestion.store', $artist->slug), [
            'guest_name' => 'Ayşe Yılmaz',
            'guest_email' => 'ayse@example.com',
            'message' => 'Biyografi bölümünde yanlış bilgi var, düzeltilmesini rica ederim.',
        ])->assertRedirect();

        $this->assertDatabaseHas('public_edit_suggestions', [
            'suggestable_type' => Artist::class,
            'suggestable_id' => $artist->id,
            'status' => 'pending',
        ]);
    }

    public function test_artist_structured_suggestion_without_long_free_text_is_accepted(): void
    {
        $artist = Artist::query()->create([
            'name' => 'Test Sanatçı',
            'slug' => 'test-sanatci-'.uniqid(),
            'status' => 'approved',
        ]);

        $this->post(route('artists.edit-suggestion.store', $artist->slug), [
            'guest_name' => 'Ayşe Yılmaz',
            'guest_email' => 'ayse@example.com',
            'website' => 'https://example.com/artist-page',
            'social_links' => [
                'instagram' => 'https://instagram.com/testartist',
            ],
        ])->assertRedirect();

        $row = PublicEditSuggestion::query()->where('suggestable_id', $artist->id)->first();
        $this->assertNotNull($row);
        $this->assertIsArray($row->proposed_changes);
        $this->assertSame('https://example.com/artist-page', $row->proposed_changes['website']);
        $this->assertSame('https://instagram.com/testartist', $row->proposed_changes['social_links']['instagram']);
    }

    public function test_artist_suggestion_requires_structured_or_long_message(): void
    {
        $artist = Artist::query()->create([
            'name' => 'Test Sanatçı',
            'slug' => 'test-sanatci-'.uniqid(),
            'status' => 'approved',
        ]);

        $this->post(route('artists.edit-suggestion.store', $artist->slug), [
            'guest_name' => 'Ayşe Yılmaz',
            'guest_email' => 'ayse@example.com',
            'message' => 'kısa',
        ])->assertSessionHasErrors('message');
    }
}
