<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class Conductor extends Authenticatable
{
    protected $table = 'conductors';

    protected $fillable = [
        'name',
        'email',
        'password',
        'contacts',
        'profile_picture',
        'google_id',
        'auth_provider',
        'current_bus_id',
    ];

    protected $hidden = [
        'password',
    ];

    public $timestamps = false;
}
