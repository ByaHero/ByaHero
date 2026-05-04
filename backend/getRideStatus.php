<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
session_start();

header('Content-Type: application/json');

if (empty($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$pdo = db();

$stmt = $pdo->prepare("SELECT * FROM passenger_rides WHERE user_id = ? AND status = 'ongoing' LIMIT 1");
$stmt->execute([$userId]);
$ride = $stmt->fetch();

echo json_encode(['success' => true, 'on_ride' => !!$ride, 'ride' => $ride]);
