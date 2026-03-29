<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaytrPaymentOrder extends Model
{
    protected $fillable = [
        'merchant_oid',
        'user_id',
        'status',
        'payment_amount',
        'currency',
        'context',
        'last_callback_raw',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
