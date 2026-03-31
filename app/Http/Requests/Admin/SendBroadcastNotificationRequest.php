<?php

namespace App\Http\Requests\Admin;

use App\Services\Admin\AdminBroadcastNotificationDispatcher;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendBroadcastNotificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    protected function prepareForValidation(): void
    {
        $u = $this->input('action_url');
        if ($u === '' || $u === null) {
            $this->merge(['action_url' => null]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:2000'],
            'action_url' => ['nullable', 'string', 'max:2048', 'regex:/^\\/(?!\\/)[^\\s]*$/'],
            'audience' => ['required', 'string', Rule::in([
                AdminBroadcastNotificationDispatcher::AUDIENCE_BROWSER_OPT_IN,
                AdminBroadcastNotificationDispatcher::AUDIENCE_ALL_MEMBERS,
            ])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'title' => 'başlık',
            'message' => 'mesaj',
            'action_url' => 'bağlantı',
            'audience' => 'hedef kitle',
        ];
    }
}
