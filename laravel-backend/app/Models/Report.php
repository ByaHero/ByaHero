<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $table = 'reports';

    protected $fillable = [
        'user_id',
        'bus_number',
        'report_reason',
        'others_details',
        'contact_number',
        'status',
    ];

    public $timestamps = false;
}
