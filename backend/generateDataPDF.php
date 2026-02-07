<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();

if (!isset($_SESSION['user_id'])) {
    die('<h3>Error: Not logged in</h3><p>Please <a href="../public/login.php">login</a> first.</p>');
}

require_once __DIR__ . '/../config/db_connection.php';

$tcpdfPath = __DIR__ . '/../vendor/tecnickcom/tcpdf/tcpdf.php';

if (!file_exists($tcpdfPath)) {
    die('<h3>Error: TCPDF Library Not Found</h3>
         <p>TCPDF is not installed at: ' . $tcpdfPath . '</p>
         <p>Run this in CMD:</p>
         <pre>cd C:\xampp\htdocs\ByaHero-Prototype-V3
composer require tecnickcom/tcpdf</pre>');
}

require_once $tcpdfPath;

$userId = $_SESSION['user_id'];

try {
    // ========== FETCH USER DATA ==========
    
    // 1. User Info
    $stmt = $conn->prepare("SELECT id, name, email, created_at FROM users WHERE id = ?");
    if (!$stmt) {
        throw new Exception("Database prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $userData = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    if (!$userData) {
        throw new Exception("User not found in database");
    }
    
    // 2. User Settings
    $userSettings = [];
    try {
        $stmt = $conn->prepare("SELECT * FROM user_settings WHERE user_id = ?");
        if ($stmt) {
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                $userSettings = $result->fetch_assoc();
            }
            $stmt->close();
        }
    } catch (Exception $e) {
        error_log("Settings error: " . $e->getMessage());
    }
    
    // 3. Analytics (last 20)
    $analyticsData = [];
    try {
        $stmt = $conn->prepare("SELECT event_type, event_data, page, created_at FROM analytics_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 20");
        if ($stmt) {
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $analyticsData = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
        }
    } catch (Exception $e) {
        error_log("Analytics error: " . $e->getMessage());
    }
    
    // 4. Feedbacks (handles different column names including feedback_text)
    $feedbackData = [];
    try {
        $tableCheck = $conn->query("SHOW TABLES LIKE 'feedbacks'");
        
        if ($tableCheck && $tableCheck->num_rows > 0) {
            $columns = $conn->query("SHOW COLUMNS FROM feedbacks");
            $columnNames = [];
            while ($col = $columns->fetch_assoc()) {
                $columnNames[] = $col['Field'];
            }
            
            // Find the feedback text column
            $feedbackColumn = null;
            if (in_array('feedback', $columnNames)) {
                $feedbackColumn = 'feedback';
            } elseif (in_array('feedback_text', $columnNames)) {
                $feedbackColumn = 'feedback_text';
            } elseif (in_array('comment', $columnNames)) {
                $feedbackColumn = 'comment';
            } elseif (in_array('message', $columnNames)) {
                $feedbackColumn = 'message';
            } elseif (in_array('text', $columnNames)) {
                $feedbackColumn = 'text';
            }
            
            if ($feedbackColumn && in_array('rating', $columnNames)) {
                $query = "SELECT rating, {$feedbackColumn} as feedback, created_at FROM feedbacks WHERE user_id = ? ORDER BY created_at DESC";
                $stmt = $conn->prepare($query);
                
                if ($stmt) {
                    $stmt->bind_param("i", $userId);
                    $stmt->execute();
                    $feedbackData = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                    $stmt->close();
                }
            }
        }
    } catch (Exception $e) {
        error_log("Feedbacks error: " . $e->getMessage());
    }
    
    
    // ========== CREATE PDF ==========
    
    $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
    
    $pdf->SetCreator('ByaHero');
    $pdf->SetAuthor('ByaHero');
    $pdf->SetTitle('ByaHero Data Export - ' . ($userData['name'] ?: $userData['email']));
    $pdf->SetSubject('Personal Data Export');
    
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    
    $pdf->SetMargins(15, 15, 15);
    $pdf->SetAutoPageBreak(TRUE, 15);
    
    $pdf->AddPage();
    
    
    // ========== HEADER ==========
    
    $pdf->SetFillColor(30, 58, 138);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('helvetica', 'B', 20);
    $pdf->Cell(0, 15, 'ByaHero Data Export', 0, 1, 'C', true);
    
    $pdf->SetFont('helvetica', '', 10);
    $pdf->SetTextColor(100, 100, 100);
    $pdf->Cell(0, 6, 'Generated on ' . date('F j, Y g:i A'), 0, 1, 'C');
    $pdf->Ln(8);
    
    
    // ========== ACCOUNT INFORMATION ==========
    
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont('helvetica', 'B', 14);
    $pdf->SetFillColor(240, 242, 255);
    $pdf->Cell(0, 10, '  Account Information', 0, 1, 'L', true);
    $pdf->Ln(3);
    
    $pdf->SetFont('helvetica', '', 10);
    
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(50, 7, 'User ID:', 0, 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 7, '#' . $userData['id'], 0, 1);
    
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(50, 7, 'Name:', 0, 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 7, $userData['name'] ?: 'Not set', 0, 1);
    
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(50, 7, 'Email:', 0, 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 7, $userData['email'], 0, 1);
    
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(50, 7, 'Member Since:', 0, 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 7, date('F j, Y', strtotime($userData['created_at'])), 0, 1);
    
    $pdf->Ln(8);
    
    
    // ========== SETTINGS ==========
    
    if (!empty($userSettings)) {
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetFillColor(240, 242, 255);
        $pdf->Cell(0, 10, '  Your Settings', 0, 1, 'L', true);
        $pdf->Ln(3);
        
        $pdf->SetFont('helvetica', '', 10);
        
        foreach ($userSettings as $key => $value) {
            if ($key !== 'user_id' && $key !== 'id') {
                $label = ucwords(str_replace('_', ' ', $key));
                $displayValue = ($value == 1) ? 'Enabled' : 'Disabled';
                
                $pdf->SetFont('helvetica', 'B', 10);
                $pdf->Cell(70, 7, $label . ':', 0, 0);
                $pdf->SetFont('helvetica', '', 10);
                $pdf->Cell(0, 7, $displayValue, 0, 1);
            }
        }
        
        $pdf->Ln(8);
    }
    
    
    // ========== ANALYTICS ==========
    
    if (!empty($analyticsData)) {
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetFillColor(240, 242, 255);
        $pdf->Cell(0, 10, '  Recent Activity (Last 20 Events)', 0, 1, 'L', true);
        $pdf->Ln(3);
        
        $pdf->SetFillColor(220, 220, 230);
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->Cell(45, 7, 'Event Type', 1, 0, 'C', true);
        $pdf->Cell(70, 7, 'Page', 1, 0, 'C', true);
        $pdf->Cell(65, 7, 'Date & Time', 1, 1, 'C', true);
        
        $pdf->SetFont('helvetica', '', 8);
        $pdf->SetFillColor(255, 255, 255);
        
        foreach ($analyticsData as $index => $event) {
            $fillColor = ($index % 2 == 0) ? [250, 250, 255] : [255, 255, 255];
            $pdf->SetFillColor($fillColor[0], $fillColor[1], $fillColor[2]);
            
            $pdf->Cell(45, 6, substr($event['event_type'], 0, 22), 1, 0, 'L', true);
            $pdf->Cell(70, 6, substr($event['page'] ?: '-', 0, 40), 1, 0, 'L', true);
            $pdf->Cell(65, 6, date('M j, Y g:i A', strtotime($event['created_at'])), 1, 1, 'L', true);
        }
        
        $pdf->Ln(8);
    }
    
    
    // ========== FEEDBACKS ==========
    
    if (!empty($feedbackData)) {
        $pdf->AddPage();
        
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetFillColor(240, 242, 255);
        $pdf->Cell(0, 10, '  Your Feedbacks', 0, 1, 'L', true);
        $pdf->Ln(3);
        
        $pdf->SetFont('helvetica', '', 10);
        
        foreach ($feedbackData as $feedback) {
            $rating = $feedback['rating'] ? ucfirst(str_replace('_', ' ', $feedback['rating'])) : 'Not rated';
            
            $pdf->SetFont('helvetica', 'B', 11);
            $pdf->SetTextColor(30, 58, 138);
            $pdf->Cell(0, 7, $rating . ' - ' . date('M j, Y', strtotime($feedback['created_at'])), 0, 1);
            
            $pdf->SetFont('helvetica', '', 9);
            $pdf->SetTextColor(70, 70, 70);
            $pdf->MultiCell(0, 5, $feedback['feedback'] ?: 'No comment provided', 0, 'L');
            $pdf->Ln(4);
            
            $pdf->SetTextColor(0, 0, 0);
        }
    }
    
    
    // ========== FOOTER INFO ==========
    
    $pdf->SetY(-25);
    $pdf->SetFont('helvetica', 'I', 8);
    $pdf->SetTextColor(120, 120, 120);
    $pdf->Cell(0, 5, 'This data export was generated by ByaHero in compliance with GDPR data portability rights.', 0, 1, 'C');
    $pdf->Cell(0, 5, 'For questions or data deletion requests, contact: privacy@byahero.com', 0, 0, 'C');
    
    
    // ========== LOG DOWNLOAD ==========
    
    try {
        $stmt = $conn->prepare("INSERT INTO analytics_events (user_id, event_type, event_data, page, created_at) VALUES (?, 'feature_used', ?, '/dataDownload', NOW())");
        if ($stmt) {
            $eventData = json_encode(['feature' => 'Data Downloaded', 'format' => 'PDF']);
            $stmt->bind_param("is", $userId, $eventData);
            $stmt->execute();
        }
    } catch (Exception $e) {
        error_log("Analytics logging error: " . $e->getMessage());
    }
    
    
    // ========== OUTPUT PDF ==========
    
    $filename = 'ByaHero_Data_' . date('Y-m-d_His') . '.pdf';
    $pdf->Output($filename, 'D');
    exit;
    
} catch (Exception $e) {
    echo '<h3>PDF Generation Error</h3>';
    echo '<p style="color:red;"><strong>Error:</strong> ' . htmlspecialchars($e->getMessage()) . '</p>';
    echo '<p><strong>User ID:</strong> ' . htmlspecialchars($userId ?? 'N/A') . '</p>';
    echo '<p><strong>File:</strong> ' . __FILE__ . '</p>';
    echo '<p><strong>Line:</strong> ' . $e->getLine() . '</p>';
    echo '<hr>';
    echo '<p><a href="../public/passenger/passengerSettings/dataDownload.php">← Go Back</a></p>';
    exit;
}
?>