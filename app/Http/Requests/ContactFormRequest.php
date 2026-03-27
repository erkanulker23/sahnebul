<?php

namespace App\Http\Requests;

use App\Support\TurkishPhone;
use App\Support\UserContactValidation;
use Illuminate\Foundation\Http\FormRequest;

class ContactFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $email = $this->input('email');
        if (is_string($email)) {
            $this->merge(['email' => preg_replace('/\s+/', '', $email)]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => UserContactValidation::emailRequired(),
            'phone' => UserContactValidation::phoneNullable(),
            'subject' => ['nullable', 'string', 'max:200'],
            'message' => ['required', 'string', 'max:5000'],
            'consent' => ['accepted'],
        ];
    }

    protected function passedValidation(): void
    {
        $phone = $this->input('phone');
        if (is_string($phone) && trim($phone) !== '') {
            $n = TurkishPhone::normalize($phone);
            if ($n !== null) {
                $this->merge(['phone' => $n]);
            }
        }
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'ad soyad',
            'email' => 'e-posta',
            'phone' => 'telefon',
            'subject' => 'konu',
            'message' => 'mesaj',
            'consent' => 'aydınlatma metni onayı',
        ];
    }
}
