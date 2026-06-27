<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusStopsTerminal extends Model
{
    protected $table = 'busstopsterminal';

    protected $fillable = [
        'name',
        'type',
        'route',
        'location_name',
        'location_landmark',
        'lat',
        'lng',
        'sort_order',
    ];

    public $timestamps = false;
}
