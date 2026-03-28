<?php

namespace Tests\Unit;

use App\Models\Artist;
use PHPUnit\Framework\TestCase;

class ArtistGenreLabelsTest extends TestCase
{
    public function test_split_genre_field_splits_on_commas(): void
    {
        $this->assertSame(
            ['Arabesk', 'Özgün Müzik', 'Pop', 'Fantezi'],
            Artist::splitGenreFieldIntoLabels('Arabesk, Özgün Müzik, Pop, Fantezi')
        );
        $this->assertSame(['Pop'], Artist::splitGenreFieldIntoLabels('Pop'));
        $this->assertSame(['A', 'B'], Artist::splitGenreFieldIntoLabels('A,B'));
        $this->assertSame([], Artist::splitGenreFieldIntoLabels(''));
        $this->assertSame([], Artist::splitGenreFieldIntoLabels(null));
    }

    public function test_normalize_distinct_labels_splits_and_deduplicates(): void
    {
        $out = Artist::normalizeDistinctCatalogGenreLabels([
            'Arabesk, Pop',
            'Pop, Fantezi',
            'Tek',
        ]);
        $this->assertSame(['Arabesk', 'Fantezi', 'Pop', 'Tek'], $out);
    }
}
