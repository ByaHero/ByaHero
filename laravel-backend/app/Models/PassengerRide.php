<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PassengerRide extends Model
{
    protected $table = 'passenger_rides';

    protected $fillable = [
        'user_id',
        'operation_id',
        'boarded_at',
        'departed_at',
        'status',
    ];

    protected $casts = [
        'boarded_at' => 'datetime',
        'departed_at' => 'datetime',
    ];

    public $timestamps = false;
}
