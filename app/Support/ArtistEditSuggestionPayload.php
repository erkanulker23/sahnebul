<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class ArtistEditSuggestionPayload
{
    /**
     * @return array{message: string, proposed_changes: array<string, mixed>|null}
     */
    public static function validateAndNormalize(Request $request): array
    {
        $v = Validator::make($request->all(), [
            'message' => ['nullable', 'string', 'max:5000'],
            'website' => ['nullable', 'string', 'max:500'],
            'bio' => ['nullable', 'string', 'max:12000'],
            'social_links' => ['nullable', 'array'],
            'social_links.instagram' => ['nullable', 'string', 'max:500'],
            'social_links.twitter' => ['nullable', 'string', 'max:500'],
            'social_links.x' => ['nullable', 'string', 'max:500'],
            'social_links.youtube' => ['nullable', 'string', 'max:500'],
            'social_links.spotify' => ['nullable', 'string', 'max:500'],
            'social_links.tiktok' => ['nullable', 'string', 'max:500'],
            'social_links.facebook' => ['nullable', 'string', 'max:500'],
            'manager_info' => ['nullable', 'array'],
            'manager_info.name' => ['nullable', 'string', 'max:255'],
            'manager_info.company' => ['nullable', 'string', 'max:255'],
            'manager_info.phone' => UserContactValidation::phoneNullable(),
            'manager_info.email' => UserContactValidation::emailNullable(),
            'public_contact' => ['nullable', 'array'],
            'public_contact.email' => UserContactValidation::emailNullable(),
            'public_contact.phone' => UserContactValidation::phoneNullable(),
            'public_contact.note' => ['nullable', 'string', 'max:2000'],
        ]);

        $validated = $v->validate();
        $validated = TurkishPhone::mergeNormalizedInto($validated, [
            'manager_info.phone',
            'public_contact.phone',
        ]);

        $allowedSocial = ['instagram', 'twitter', 'x', 'youtube', 'spotify', 'tiktok', 'facebook'];
        $socialIn = is_array($validated['social_links'] ?? null) ? $validated['social_links'] : [];
        $socialFiltered = [];
        foreach ($allowedSocial as $key) {
            if (! isset($socialIn[$key]) || ! is_string($socialIn[$key])) {
                continue;
            }
            $t = trim($socialIn[$key]);
            if ($t !== '') {
                $socialFiltered[$key] = $t;
            }
        }
        $socialNorm = $socialFiltered === [] ? null : $socialFiltered;

        $managerNorm = ArtistProfileInputs::normalizeStringMap(
            $validated['manager_info'] ?? null,
            ['name', 'company', 'phone', 'email']
        );
        $publicNorm = ArtistProfileInputs::normalizeStringMap(
            $validated['public_contact'] ?? null,
            ['email', 'phone', 'note']
        );

        $website = isset($validated['website']) && is_string($validated['website']) ? trim($validated['website']) : '';
        $websiteNorm = $website !== '' ? $website : null;

        $bio = isset($validated['bio']) && is_string($validated['bio']) ? trim($validated['bio']) : '';
        $bioNorm = $bio !== '' ? $bio : null;

        $message = isset($validated['message']) && is_string($validated['message']) ? trim($validated['message']) : '';

        $proposed = array_filter([
            'website' => $websiteNorm,
            'bio' => $bioNorm,
            'social_links' => $socialNorm,
            'manager_info' => $managerNorm,
            'public_contact' => $publicNorm,
        ], fn ($v) => $v !== null && $v !== []);

        $hasStructured = $proposed !== [];

        if (! $hasStructured && mb_strlen($message) < 20) {
            throw ValidationException::withMessages([
                'message' => 'Profil alanlarından en az birini doldurun veya açıklama yazın (en az 20 karakter).',
            ]);
        }

        return [
            'message' => $message,
            'proposed_changes' => $hasStructured ? $proposed : null,
        ];
    }

    /**
     * @param  array<string, mixed>|null  $changes
     */
    public static function summarizeForMail(?array $changes): string
    {
        if ($changes === null || $changes === []) {
            return '';
        }
        $parts = [];
        if (isset($changes['website']) && is_string($changes['website']) && $changes['website'] !== '') {
            $parts[] = 'Web sitesi: '.$changes['website'];
        }
        if (isset($changes['bio']) && is_string($changes['bio']) && $changes['bio'] !== '') {
            $parts[] = 'Biyografi: '.Str::limit(strip_tags($changes['bio']), 200);
        }
        if (isset($changes['social_links']) && is_array($changes['social_links']) && $changes['social_links'] !== []) {
            $bits = [];
            foreach ($changes['social_links'] as $k => $val) {
                if (is_string($val) && $val !== '') {
                    $bits[] = $k.': '.$val;
                }
            }
            if ($bits !== []) {
                $parts[] = 'Sosyal: '.implode(' · ', $bits);
            }
        }
        if (isset($changes['manager_info']) && is_array($changes['manager_info']) && $changes['manager_info'] !== []) {
            $parts[] = 'Menajer/temsilci: '.json_encode($changes['manager_info'], JSON_UNESCAPED_UNICODE);
        }
        if (isset($changes['public_contact']) && is_array($changes['public_contact']) && $changes['public_contact'] !== []) {
            $parts[] = 'İletişim: '.json_encode($changes['public_contact'], JSON_UNESCAPED_UNICODE);
        }

        return implode("\n", $parts);
    }
}
