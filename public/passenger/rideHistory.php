<?php
require_once __DIR__ . '/auth_passenger.php';
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => true,
    'message' => 'Please request ride history via public/api.php?action=get_ride_history'
]);
exit;
