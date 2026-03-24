<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reservation extends Model
{
    protected $fillable = [
        'user_id', 'venue_id', 'event_id', 'event_ticket_tier_id', 'reservation_date', 'reservation_time',
        'reservation_type', 'guest_count', 'quantity', 'total_amount',
        'qr_code', 'status', 'notes',
    ];

    protected $casts = [
        'reservation_date' => 'date',
        'total_amount' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function eventTicketTier(): BelongsTo
    {
        return $this->belongsTo(EventTicketTier::class);
    }
}
