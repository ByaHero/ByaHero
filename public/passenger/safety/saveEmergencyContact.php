<?php
session_start();
require_once '../../../config/db_connection.php';

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../../../public/login.php?redirect=" . urlencode($_SERVER['REQUEST_URI']));
    exit;
}

function normalize_ph_mobile_strict(string $raw): ?string
{
    // Remove spaces, dashes, parentheses, etc. Keep digits and '+'
    $s = preg_replace('/[^\d\+]/', '', trim($raw));

    // Enforce: +63 + 10 digits AND must be a mobile starting with 9 => +639XXXXXXXXX
    if (preg_match('/^\+639\d{9}$/', $s)) {
        return $s;
    }

    return null;
}

$userId = (int)$_SESSION['user_id'];

$first = trim($_POST['first_name'] ?? '');
$last = trim($_POST['last_name'] ?? '');
$relative = trim($_POST['relative_type'] ?? '');
$phone = normalize_ph_mobile_strict($_POST['phone'] ?? '');

// Basic validation
if ($first === '' || $relative === '' || !$phone) {
    header("Location: addNewContact.php?error=invalid_input");
    exit;
}

// Enforce maximum of 5 contacts per user
$stmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM emergency_contacts WHERE user_id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$countRes = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ((int)($countRes['cnt'] ?? 0) >= 5) {
    header("Location: addNewContact.php?error=max_reached");
    exit;
}

// Optional: prevent duplicate phone numbers per user
$stmt = $conn->prepare("SELECT id FROM emergency_contacts WHERE user_id = ? AND phone = ? LIMIT 1");
$stmt->bind_param("is", $userId, $phone);
$stmt->execute();
$dupRes = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($dupRes) {
    header("Location: addNewContact.php?error=duplicate_phone");
    exit;
}

// Insert
$stmt = $conn->prepare("
    INSERT INTO emergency_contacts (user_id, first_name, last_name, phone, relative_type)
    VALUES (?, ?, ?, ?, ?)
");
$stmt->bind_param("issss", $userId, $first, $last, $phone, $relative);

if ($stmt->execute()) {
    $stmt->close();
    $conn->close();
    header("Location: safety.php?saved=1");
    exit;
}

$error = $stmt->error;
$stmt->close();
$conn->close();

error_log("Failed to save emergency contact for user {$userId}: {$error}");
header("Location: addNewContact.php?error=save_failed");
exit;