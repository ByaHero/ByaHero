<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bus extends Model
{
    protected $table = 'busses';
    protected $primaryKey = 'Bus_ID';

    protected $fillable = [
        'code',
        'route',
        'total_seats',
        'status',
        'seat_availability',
        'lat',
        'lng',
        'current_location',
        'current_conductor_id',
        'updated',
    ];

    public $timestamps = false;
}
