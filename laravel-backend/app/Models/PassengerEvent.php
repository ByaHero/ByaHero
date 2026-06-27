<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PassengerEvent extends Model
{
    protected $table = 'passenger_events';

    protected $fillable = [
        'operation_id',
        'event_type',
        'count',
        'location_name',
        'lat',
        'lng',
        'recorded_at',
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
    ];

    public $timestamps = false;
}
