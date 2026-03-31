<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Support\TurkishPhone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EventReminderPreferenceController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->canUsePublicEngagementFeatures(), 403);

        $smsOn = $request->boolean('event_reminder_sms_enabled');

        $validated = $request->validate([
            'event_reminder_email_enabled' => ['required', 'boolean'],
            'event_reminder_sms_enabled' => ['required', 'boolean'],
            'event_reminder_email_hour' => ['required', 'integer', Rule::in(range(0, 23))],
            'phone' => [
                Rule::requiredIf($smsOn),
                'nullable',
                'string',
                'max:32',
                'regex:/^[0-9+\s().-]+$/u',
            ],
        ]);

        $user->event_reminder_email_enabled = $validated['event_reminder_email_enabled'];
        $user->event_reminder_sms_enabled = $validated['event_reminder_sms_enabled'];
        $user->event_reminder_email_hour = (int) $validated['event_reminder_email_hour'];

        $rawPhone = trim((string) ($validated['phone'] ?? ''));

        if ($smsOn) {
            $normalized = TurkishPhone::normalize($rawPhone);
            if ($normalized === null) {
                throw ValidationException::withMessages([
                    'phone' => ['SMS için geçerli bir Türkiye telefon numarası girin (ör. 05XX XXX XX XX).'],
                ]);
            }
            $user->phone = $normalized;
        } elseif ($rawPhone !== '') {
            $normalized = TurkishPhone::normalize($rawPhone);
            if ($normalized === null) {
                throw ValidationException::withMessages([
                    'phone' => ['Geçerli bir Türkiye telefon numarası girin (ör. 05XX XXX XX XX).'],
                ]);
            }
            $user->phone = $normalized;
        }

        $user->save();

        return back()->with('success', 'Hatırlatma tercihleriniz kaydedildi.');
    }
}
