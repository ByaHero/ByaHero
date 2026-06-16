<?php
require_once __DIR__ . '/auth_passenger.php';
if (empty($_SESSION['user_contacts'])) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Profile incomplete', 'redirect' => 'completeProfile.html']);
    exit;
}
$currentUser = null;
if (isset($_SESSION['user_id'])) {
    $currentUser = [
        'id' => $_SESSION['user_id'],
        'name' => $_SESSION['user_name'] ?? null,
        'email' => $_SESSION['user_email'] ?? null,
        'profile_picture' => $_SESSION['user_profile_picture'] ?? null
    ];
}
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['success' => true, 'user' => $currentUser]);
exit;
