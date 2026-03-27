<?php

namespace App\Rules;

use App\Support\TurkishPhone;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidTurkishPhone implements ValidationRule
{
    public function __construct(
        private readonly bool $allowEmpty = true,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            if (! $this->allowEmpty) {
                $fail('Telefon alanı zorunludur.');
            }

            return;
        }

        if (! is_string($value)) {
            $fail('Geçerli bir telefon numarası girin.');

            return;
        }

        if (TurkishPhone::normalize($value) === null) {
            $fail('Geçerli bir Türkiye telefon numarası girin (örnek: 05XX XXX XX XX).');
        }
    }
}
