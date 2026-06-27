<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class Admin extends Authenticatable
{
    protected $table = 'admins';

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
