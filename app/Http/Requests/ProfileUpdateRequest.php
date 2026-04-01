<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Support\OrganizationPublicProfile;
use App\Support\UserContactValidation;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->user()?->isManagerOrganization() && $this->has('organization_public_slug')) {
            $s = trim((string) $this->input('organization_public_slug'));
            $this->merge([
                'organization_public_slug' => $s === '' ? null : $s,
            ]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => array_merge(
                UserContactValidation::emailRequired(),
                [Rule::unique(User::class)->ignore($this->user()->id)],
            ),
            'phone' => UserContactValidation::phoneNullable(),
            'city' => ['nullable', 'string', 'max:100'],
            'interests' => ['nullable', 'array'],
            'interests.*' => ['string', 'max:50'],
            'avatar' => ['nullable', 'image', 'max:2048'],
        ];

        if ($this->user()?->isManagerOrganization()) {
            $rules['organization_display_name'] = ['nullable', 'string', 'max:255'];
            $rules['organization_tax_office'] = ['nullable', 'string', 'max:120'];
            $rules['organization_tax_number'] = ['nullable', 'string', 'max:32'];
            $rules['organization_public_slug'] = OrganizationPublicProfile::slugValidationRules($this->user()->id);
            $rules['organization_about'] = ['nullable', 'string', 'max:200000'];
            $rules['organization_website'] = ['nullable', 'string', 'max:2048'];
            $rules['organization_social_links'] = ['nullable', 'array'];
            $rules['organization_social_links.*'] = ['nullable', 'string', 'max:2048'];
            $rules['organization_cover'] = ['nullable', 'image', 'max:8192'];
        }

        return $rules;
    }
}
