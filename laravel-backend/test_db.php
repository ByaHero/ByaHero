<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
try {
    App\Models\SystemSetting::updateOrCreate(['setting_key' => 'test'], ['setting_value' => 'test']);
    echo "Success!";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
