<?php
session_start();

/**
 * SECURE SYSTEM:
 * Require login before accessing to prevent URL manipulation.
 */
if (!isset($_SESSION['user_id'])) {
    $r = $_SERVER['SCRIPT_NAME'] ?? '';
    $p = rtrim(str_replace('\\', '/', dirname($r)), '/');
    $b = preg_replace('~/public/.*$~', '', $p) ?: '';
    header('Location: ' . $b . '/public/login.php', true, 302);
    exit;
}

require_once '../../../config/db_connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = $_SESSION['user_id'];
    $report_reason = $_POST['report_reason'] ?? '';
    $others_details = $_POST['others_details'] ?? '';
    $contact_number = $_POST['contact_number'] ?? '';

    // If report_reason is empty, they probably didn't select a radio button
    if (empty($report_reason) && !empty($others_details)) {
        $report_reason = 'Others';
    }

    if (!empty($report_reason)) {
        // Insert into database
        $stmt = $conn->prepare("INSERT INTO reports (user_id, report_reason, others_details, contact_number) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("isss", $user_id, $report_reason, $others_details, $contact_number);
        
        if ($stmt->execute()) {
            $_SESSION['report_success'] = "Thank you for letting us know! Your report has been submitted and will be reviewed by our team.";
        } else {
            $_SESSION['report_error'] = "Something went wrong. Please try again later.";
        }
        $stmt->close();
    } else {
        $_SESSION['report_error'] = "Please select a reason for your report.";
    }

    header("Location: report.php");
    exit;
} else {
    header("Location: report.php");
    exit;
}
?>
