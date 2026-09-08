<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        // Web app (Vercel production & preview)
        'https://byahero1.vercel.app',
        'https://byahero.vercel.app',
        // Local development
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        // AlwaysData self-requests (server-side callbacks)
        'https://byahero.alwaysdata.net',
        'http://byahero.alwaysdata.net',
    ],

    // Allow any vercel.app subdomain (preview deploys) and local network IPs (development)
    'allowed_origins_patterns' => [
        '#^https://[a-zA-Z0-9\-]+\.vercel\.app$#',
        '#^http://192\.168\.\d+\.\d+:\d+$#',
        '#^http://10\.\d+\.\d+\.\d+:\d+$#',
        '#^http://172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => true,

];

