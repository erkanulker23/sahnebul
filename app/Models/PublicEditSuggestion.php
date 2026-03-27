<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class PublicEditSuggestion extends Model
{
    protected $fillable = [
        'suggestable_type',
        'suggestable_id',
        'user_id',
        'guest_name',
        'guest_email',
        'message',
        'proposed_changes',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'proposed_changes' => 'array',
        ];
    }

    public function suggestable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function submitterLabel(): string
    {
        if ($this->user) {
            return $this->user->name.' ('.$this->user->email.')';
        }

        $n = trim((string) $this->guest_name);
        $e = trim((string) $this->guest_email);

        return $n !== '' || $e !== '' ? trim($n.' — '.$e) : 'Misafir';
    }
}
