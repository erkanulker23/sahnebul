<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'subject',
        'message',
        'ip_address',
        'user_agent',
        'is_spam',
        'admin_note',
    ];

    protected function casts(): array
    {
        return [
            'is_spam' => 'boolean',
        ];
    }
}
