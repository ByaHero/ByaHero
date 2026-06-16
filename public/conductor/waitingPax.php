<?php
@session_start();
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => isset($_SESSION['user_id']),
    'message' => 'View moved to static HTML. Fetch count from backend/waiting_api.php?action=get_wait_count'
]);
exit;
