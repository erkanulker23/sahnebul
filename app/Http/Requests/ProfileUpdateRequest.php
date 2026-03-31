<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Support\UserContactValidation;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
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
        }

        return $rules;
    }
}
