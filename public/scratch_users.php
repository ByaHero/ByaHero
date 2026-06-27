<?php
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');

try {
    $conn = db();
    $res = $conn->query("SELECT id, email, name, auth_provider, google_id FROM users");
    $users = [];
    while ($row = $res->fetch_assoc()) {
        $users[] = $row;
    }
    echo json_encode($users, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}