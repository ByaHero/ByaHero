<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $table = 'notifications';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'meta',
        'read_at',
        'dedupe_key',
        'is_cleared',
    ];

    protected $casts = [
        'meta' => 'array',
        'read_at' => 'datetime',
        'is_cleared' => 'boolean',
    ];

    public $timestamps = false;
}
