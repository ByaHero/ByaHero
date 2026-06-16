<?php
require_once __DIR__ . '/../auth_passenger.php';
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => true,
    'message' => 'View moved to static HTML guide/tour flow.'
]);
exit;
