<?php
/**
 * OneSignal credentials loader.
 *
 * Loads ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY from:
 *   1. config/onesignal.local.php  (preferred – not committed)
 *   2. Environment variables        (suitable for CI / hosting panels)
 *
 * Copy config/onesignal.local.php.example -> config/onesignal.local.php
 * and fill in your real credentials.  Never commit the .local.php file.
 */

if (file_exists(__DIR__ . '/onesignal.local.php')) {
    require_once __DIR__ . '/onesignal.local.php';
}

if (!defined('ONESIGNAL_APP_ID')) {
    define('ONESIGNAL_APP_ID', getenv('ONESIGNAL_APP_ID') ?: '');
    if (ONESIGNAL_APP_ID === '') {
        error_log('[OneSignal] WARNING: ONESIGNAL_APP_ID is not configured. Copy config/onesignal.local.php.example to config/onesignal.local.php and fill in your credentials.');
    }
}

if (!defined('ONESIGNAL_REST_API_KEY')) {
    define('ONESIGNAL_REST_API_KEY', getenv('ONESIGNAL_REST_API_KEY') ?: '');
    if (ONESIGNAL_REST_API_KEY === '') {
        error_log('[OneSignal] WARNING: ONESIGNAL_REST_API_KEY is not configured. Copy config/onesignal.local.php.example to config/onesignal.local.php and fill in your credentials.');
    }
}
