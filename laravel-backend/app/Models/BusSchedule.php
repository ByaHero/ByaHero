<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusSchedule extends Model
{
    protected $table = 'bus_schedule';

    protected $primaryKey = 'terminal_name';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'terminal_name',
        'time_open',
        'time_close',
        'is_suspended',
        'suspend_message',
    ];

    public $timestamps = false;
}
