<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SosAlert extends Model
{
    protected $table = 'sos_alerts';

    protected $fillable = [
        'sender_user_id',
        'recipient_user_id',
        'location_text',
        'status',
        'is_cleared',
    ];

    protected $casts = [
        'is_cleared' => 'boolean',
    ];

    public $timestamps = false;
}
