<?php

return [
    'role' => env('DEPLOYMENT_ROLE', 'test'),
    'admin_test_enabled' => env('ADMIN_TEST_ENABLED', false),
    // Defaults preserve the existing alwaysdata deployment.
    'bus_locations' => env('BUS_LOCATION_STORE', 'file'),
    'uploads' => env('UPLOAD_STORE', 'local'),
    'external_notifications' => env('EXTERNAL_NOTIFICATIONS_ENABLED', true),
    'ml_enabled' => env('PYTHON_ML_ENABLED', true),
    'supabase_url' => rtrim((string) env('SUPABASE_URL', ''), '/'),
    'supabase_key' => env('SUPABASE_SECRET_KEY', ''),
    'supabase_bucket' => env('SUPABASE_STORAGE_BUCKET', 'byahero-test-uploads'),
];
