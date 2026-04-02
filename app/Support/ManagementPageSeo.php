<?php

namespace App\Support;

use App\Models\Artist;
use App\Models\Event;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Management (eski adı organizasyon) firma sayfası — başlık, meta ve JSON-LD.
 */
final class ManagementPageSeo
{
    /**
     * @param  Collection<int, Artist>  $roster
     * @param  Collection<int, Event>  $upcomingSample
     * @return array{headTitleSegment: string, metaDescription: string, structuredData: array<string, mixed>}
     */
    public static function forPublicManagementAccount(User $org, Collection $roster, Collection $upcomingSample, string $appUrl): array
    {
        $appUrl = rtrim($appUrl, '/');
        $slug = trim((string) $org->organization_public_slug);
        $canonical = SeoFormatting::normalizeCanonical($appUrl, '/management/'.$slug);

        $name = self::displayName($org);
        $headTitleSegment = $name.' · Management';

        $plainAbout = SeoFormatting::stripHtmlToText((string) ($org->organization_about ?? ''));
        $metaFromField = trim((string) ($org->organization_meta_description ?? ''));
        $metaDescription = $metaFromField !== ''
            ? SeoFormatting::truncateMetaDescription($metaFromField)
            : self::fallbackMetaDescription($name, $plainAbout, $roster, $upcomingSample);

        $structuredData = [
            '@context' => 'https://schema.org',
            '@type' => 'Organization',
            '@id' => $canonical.'#organization',
            'name' => $name,
            'url' => $canonical,
            'description' => $metaDescription,
        ];

        $cover = trim((string) ($org->organization_cover_image ?? ''));
        $imgAbs = $cover !== '' ? SeoFormatting::absoluteMediaUrl($cover, $appUrl) : null;
        if ($imgAbs !== null) {
            $structuredData['image'] = $imgAbs;
        }

        $sameAs = [];
        $website = trim((string) ($org->organization_website ?? ''));
        if ($website !== '' && str_starts_with($website, 'http')) {
            $sameAs[] = $website;
        }

        $social = is_array($org->organization_social_links) ? $org->organization_social_links : [];
        foreach ($social as $u) {
            if (is_string($u) && str_starts_with(trim($u), 'http')) {
                $sameAs[] = trim($u);
            }
        }
        if ($sameAs !== []) {
            $structuredData['sameAs'] = array_values(array_unique($sameAs));
        }

        if ($roster->isNotEmpty()) {
            $structuredData['employee'] = $roster->take(12)->map(fn (Artist $a) => [
                '@type' => 'Person',
                'name' => $a->name,
                'url' => SeoFormatting::normalizeCanonical($appUrl, '/sanatcilar/'.$a->slug),
            ])->values()->all();
        }

        return [
            'headTitleSegment' => $headTitleSegment,
            'metaDescription' => $metaDescription,
            'structuredData' => $structuredData,
        ];
    }

    private static function displayName(User $org): string
    {
        $d = trim((string) ($org->organization_display_name ?? ''));
        if ($d !== '') {
            return $d;
        }
        $n = trim((string) ($org->name ?? ''));

        return $n !== '' ? $n : 'Management';
    }

    /**
     * @param  Collection<int, Artist>  $roster
     * @param  Collection<int, Event>  $upcomingSample
     */
    private static function fallbackMetaDescription(
        string $name,
        string $plainAbout,
        Collection $roster,
        Collection $upcomingSample,
    ): string {
        if ($plainAbout !== '') {
            return SeoFormatting::truncateMetaDescription($plainAbout);
        }
        $rosterCount = $roster->count();
        $upcomingCount = $upcomingSample->count();
        $bits = [$name.' — Sahnebul’daki Management profili.'];
        if ($rosterCount > 0) {
            $bits[] = 'Kadrosunda '.$rosterCount.' sanatçı.';
        }
        if ($upcomingCount > 0) {
            $bits[] = 'Yaklaşan etkinlikler ve bilet bağlantıları.';
        }

        return SeoFormatting::truncateMetaDescription(implode(' ', $bits));
    }
}
