<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusStop extends Model
{
    protected $table = 'bus_stops';
    protected $primaryKey = 'stop_id';

    protected $fillable = [
        'location_name',
        'latitude',
        'longitude',
        'km_marker',
        'is_active',
    ];

    public $timestamps = false;
}
