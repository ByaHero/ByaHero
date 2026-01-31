<?php
session_start();
require __DIR__ . '/../../config/db.php';

header('Content-Type: application/json');

// 1. Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];
$pdo = db();

$action = $_GET['action'] ?? '';

// 2. SAVE A NEW PIN (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save') {
    $title = $_POST['title'] ?? 'Pinned Location';
    $address = $_POST['address'] ?? '';
    $lat = $_POST['lat'];
    $lng = $_POST['lng'];

    $stmt = $pdo->prepare("INSERT INTO saved_pins (user_id, title, address, lat, lng) VALUES (?, ?, ?, ?, ?)");
    if ($stmt->execute([$userId, $title, $address, $lat, $lng])) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'DB Error']);
    }
    exit;
}

// 3. DELETE A PIN (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'delete') {
    $pinId = $_POST['id'] ?? null;

    if (!$pinId) {
        echo json_encode(['success' => false, 'message' => 'Missing Pin ID']);
        exit;
    }

    // Security: Only delete if the pin belongs to the logged-in user
    $stmt = $pdo->prepare("DELETE FROM saved_pins WHERE id = ? AND user_id = ?");
    if ($stmt->execute([$pinId, $userId])) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete']);
    }
    exit;
}

// 4. GET SAVED PINS (GET)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list') {
    $stmt = $pdo->prepare("SELECT * FROM saved_pins WHERE user_id = ? ORDER BY id DESC");
    $stmt->execute([$userId]);
    $pins = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'pins' => $pins]);
    exit;
}
?>