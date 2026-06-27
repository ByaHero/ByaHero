<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LostAndFound extends Model
{
    protected $table = 'lost_and_found';

    protected $fillable = [
        'user_id',
        'type',
        'status',
        'item_description',
        'bus_number',
        'image1_path',
        'image2_path',
    ];

    public $timestamps = false;
}
