<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    DB::statement('UPDATE bus_fares SET regular_fare = GREATEST(0, regular_fare + ?), discounted_fare = GREATEST(0, discounted_fare + ?), updated_at = NOW()', [1.5, 1.5]);
    echo "Success!\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
