<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserSetting extends Model
{
    protected $table = 'user_settings';

    protected $fillable = [
        'user_id',
        'notify_bus_schedule',
        'notify_bus_arrival',
        'notify_seat_availability',
        'text_size',
        'high_contrast_mode',
        'screen_reader_support',
        'share_location',
        'privacy_mode',
        'location_services',
        'tracking_enabled',
        'stolen_device_protection',
    ];

    public $timestamps = false;
}
