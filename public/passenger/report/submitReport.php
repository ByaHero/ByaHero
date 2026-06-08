<?php
include_once __DIR__ . '/../auth_passenger.php';

include_once '../../../config/db.php';
$conn = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = $_SESSION['user_id'];
    $report_reason = $_POST['report_reason'] ?? '';
    $others_details = $_POST['others_details'] ?? '';
    $contact_number = $_POST['contact_number'] ?? '';
    $bus_number = $_POST['bus_number'] ?? '';

    // If report_reason is empty, they probably didn't select a radio button
    if (empty($report_reason) && !empty($others_details)) {
        $report_reason = 'Others';
    }

    if (!empty($report_reason)) {
        // Self-healing: Check if bus_number column exists, add it if not
        $checkCol = $conn->query("SHOW COLUMNS FROM `reports` LIKE 'bus_number'");
        if ($checkCol && $checkCol->num_rows == 0) {
            $conn->query("ALTER TABLE `reports` ADD COLUMN `bus_number` VARCHAR(50) NULL AFTER `user_id` ");
            // Note: If 'AFTER user_id' fails because of table structure, we just add it
            if ($conn->error) {
                $conn->query("ALTER TABLE `reports` ADD COLUMN `bus_number` VARCHAR(50) NULL");
            }
        }

        // Insert into database
        $stmt = $conn->prepare("INSERT INTO reports (user_id, bus_number, report_reason, others_details, contact_number) VALUES (?, ?, ?, ?, ?)");
        
        if ($stmt) {
            $stmt->bind_param("issss", $user_id, $bus_number, $report_reason, $others_details, $contact_number);
            
            if ($stmt->execute()) {
                $_SESSION['report_success'] = "Thank you for letting us know! Your report has been submitted and will be reviewed by our team.";
            } else {
                $_SESSION['report_error'] = "Execution failed: " . $stmt->error;
            }
            $stmt->close();
        } else {
            $_SESSION['report_error'] = "Database error: " . $conn->error;
        }
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
