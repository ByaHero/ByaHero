<?php
/**
 * Local configuration for OneSignal REST API push notifications.
 * This file contains sensitive credentials and should be kept out of version control.
 */

// 1. The exact OneSignal API URL
define('FIREBASE_FUNCTIONS_PUSH_URL', 'https://onesignal.com/api/v1/notifications');

/**
 * 2. Your OneSignal REST API Key
 * Replace the string below with your actual OneSignal REST API Key 
 * (It usually starts with "os_v2_app_...")
 */
define('FIREBASE_FUNCTIONS_AUTH_SECRET', 'os_v2_app_w5k52ki54jgpde4bnknug26ajffmpqdyhshutleosxotea2neg6pcnw6lqotnv67mcb7p3rr3d37pglprqyefcfihmdnqxbijny3pzi');