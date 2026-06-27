<?php
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');

try {
    $conn = db();
    $circles = [];
    $res = $conn->query("SELECT * FROM circles");
    while ($row = $res->fetch_assoc()) {
        $circles[] = $row;
    }
    
    $members = [];
    $res2 = $conn->query("SELECT cm.*, u.email, u.name FROM circle_members cm JOIN users u ON u.id = cm.user_id");
    while ($row = $res2->fetch_assoc()) {
        $members[] = $row;
    }
    
    echo json_encode(['circles' => $circles, 'members' => $members], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
