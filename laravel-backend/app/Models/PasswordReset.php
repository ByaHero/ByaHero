<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordReset extends Model
{
    protected $table = 'password_resets';

    protected $fillable = [
        'email',
        'otp_code',
        'expires_at',
        'role',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public $timestamps = false;
}
