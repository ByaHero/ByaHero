<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusOperation extends Model
{
    protected $table = 'bus_operations';

    protected $fillable = [
        'bus_id',
        'conductor_id',
        'route',
        'pre_departure_count',
        'started_at',
        'ended_at',
        'start_location',
        'end_location',
        'total_boarded',
        'total_departed',
        'status',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public $timestamps = false;
}
