<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CircleMember extends Model
{
    protected $table = 'circle_members';

    protected $fillable = [
        'circle_id',
        'user_id',
        'joined_at',
    ];

    public $timestamps = false;
}
