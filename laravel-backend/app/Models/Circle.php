<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Circle extends Model
{
    protected $table = 'circles';

    protected $fillable = [
        'owner_user_id',
        'name',
        'invite_code',
    ];

    public $timestamps = false;
}
