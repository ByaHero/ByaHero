<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class Driver extends Authenticatable
{
    protected $table = 'drivers';

    protected $fillable = [
        'name',
        'email',
        'password',
        'contacts',
        'profile_picture',
        'google_id',
        'auth_provider',
    ];

    protected $hidden = [
        'password',
    ];

    public $timestamps = false;
}
