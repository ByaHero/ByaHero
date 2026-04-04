<?php
declare(strict_types=1);

/**
 * Firebase Cloud Functions push configuration loader.
 *
 * Priority:
 * 1) config/firebase_push.local.php (gitignored local overrides)
 * 2) Environment variables
 */
$firebaseLocal = __DIR__ . '/firebase_push.local.php';
if (is_file($firebaseLocal)) {
    require_once $firebaseLocal;
}

if (!defined('FIREBASE_FUNCTIONS_PUSH_URL')) {
    define('FIREBASE_FUNCTIONS_PUSH_URL', (string) (getenv('FIREBASE_FUNCTIONS_PUSH_URL') ?: ''));
}

if (!defined('FIREBASE_FUNCTIONS_AUTH_SECRET')) {
    define('FIREBASE_FUNCTIONS_AUTH_SECRET', (string) (getenv('FIREBASE_FUNCTIONS_AUTH_SECRET') ?: ''));
}

