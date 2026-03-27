<?php

namespace App\Support;

use App\Rules\ValidTurkishPhone;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

final class UserContactValidation
{
    /**
     * Formlarda kullanıcı tarafından girilen e-postalar için sıkı doğrulama.
     *
     * @return list<ValidationRule|string>
     */
    public static function emailRequired(): array
    {
        return [
            'required',
            'string',
            'lowercase',
            'max:255',
            Rule::email()->rfcCompliant()->preventSpoofing(),
        ];
    }

    /**
     * @return list<ValidationRule|string>
     */
    public static function emailNullable(): array
    {
        return [
            'nullable',
            'string',
            'lowercase',
            'max:255',
            Rule::email()->rfcCompliant()->preventSpoofing(),
        ];
    }

    /**
     * @return list<ValidationRule|string>
     */
    public static function phoneRequired(): array
    {
        return ['required', 'string', 'max:22', new ValidTurkishPhone(allowEmpty: false)];
    }

    /**
     * @return list<ValidationRule|string>
     */
    public static function phoneNullable(): array
    {
        return ['nullable', 'string', 'max:22', new ValidTurkishPhone(allowEmpty: true)];
    }

    /**
     * WhatsApp: https bağlantısı veya TR telefon.
     *
     * @return list<string|\Closure>
     */
    public static function whatsappNullable(): array
    {
        return [
            'nullable',
            'string',
            'max:120',
            function (string $attribute, mixed $value, \Closure $fail): void {
                if ($value === null || $value === '') {
                    return;
                }
                if (! is_string($value)) {
                    $fail('Geçerli bir WhatsApp bilgisi girin.');

                    return;
                }
                $v = trim($value);
                if (preg_match('#^https?://#i', $v) === 1) {
                    return;
                }
                if (TurkishPhone::normalize($v) === null) {
                    $fail('WhatsApp için geçerli bir telefon veya https bağlantısı girin.');
                }
            },
        ];
    }
}
