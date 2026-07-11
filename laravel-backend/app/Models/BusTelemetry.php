<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BusTelemetry extends Model
{
    use HasFactory;

    protected $fillable = [
        'bus_id',
        'route',
        'latitude',
        'longitude',
        'speed',
        'status',
    ];

    public function bus()
    {
        return $this->belongsTo(Bus::class);
    }
}
