<?php
require_once __DIR__ . '/../auth_passenger.php';

require_once '../../../config/db.php';
$conn = db();
$userId = $_SESSION['user_id'];
$message = '';
$error = '';

/**
 * Handle user voluntarily closing their own ticket if they found the item.
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'resolve') {
    $ticketId = $_POST['ticket_id'] ?? null;
    if ($ticketId) {
        // Enforce strong ownership via WHERE user_id
        $stmt = $conn->prepare("UPDATE lost_and_found SET status = 'resolved' WHERE id = ? AND user_id = ? AND status = 'open'");
        $stmt->bind_param("ii", $ticketId, $userId);
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                $message = "Report successfully marked as resolved!";
            } else {
                $error = "Action failed. Either the report was already resolved or you lack permission.";
            }
        } else {
            $error = "A database error occurred while updating the status.";
        }
    }
}

// Extract ticket history specifically for the securely logged in passenger
$stmt = $conn->prepare("SELECT * FROM lost_and_found WHERE user_id = ? ORDER BY created_at DESC");
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();
$reports = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

$pageDepth = '../../../';
$pageType = 'settings';
$backLink = 'lostAndFound';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="icon" href="../../../assets/images/byaheroLogoBlue.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Reports - ByaHero</title>
    <!-- Core UI Setup -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=swap"  media="print" onload="this.media='all'"/>
    <style>
        body { 
            font-family: 'Inter', sans-serif; 
            background-color: #f8f9fa; 
        }
        .report-card { 
            background: white; 
            border-radius: 16px; 
            padding: 20px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.03); 
            margin-bottom: 20px; 
            border: 1px solid #eee; 
            text-align: left; 
        }
        .badge-status { 
            font-weight: 800; 
            border-radius: 999px; 
            padding: 4px 12px; 
            font-size: 0.75rem; 
            letter-spacing: 0.5px;
        }
        .status-open { background: #fff3cd; color: #856404; }
        .status-resolved { background: #d1e7dd; color: #0f5132; }
        .status-closed { background: #f8d7da; color: #842029; }
        
        .btn-resolve { 
            background-color: #1e40af; 
            color: white; 
            border-radius: 999px; 
            font-weight: 600; 
            padding: 6px 16px; 
            border: none; 
            font-size: 0.85rem; 
            transition: all 0.2s;
        }
        .btn-resolve:hover {
            background-color: #1e3a8a;
            transform: translateY(-1px);
            box-shadow: 0 4px 10px rgba(30, 64, 175, 0.2);
        }
        .header-title-container {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            gap: 12px;
        }
        .back-button {
            background: white;
            border: 1px solid #dee2e6;
            color: #1e40af;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
    </style>
</head>
<body>
    <?php include '../../../components/navbarPassenger.php'; ?>

    <div class="container mt-4 pt-5 pb-5 mb-5 px-3 text-center">

        <?php if ($message): ?>
            <div class="alert alert-success rounded-4 small text-start border-0 shadow-sm fw-semibold">
                <span class="material-symbols-rounded align-middle me-1" style="font-size: 18px;">check_circle</span>
                <?= htmlspecialchars($message) ?>
            </div>
        <?php endif; ?>
        <?php if ($error): ?>
            <div class="alert alert-danger rounded-4 small text-start border-0 shadow-sm fw-semibold">
                <span class="material-symbols-rounded align-middle me-1" style="font-size: 18px;">error</span>
                <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <!-- Content Engine -->
        <?php if (empty($reports)): ?>
            <div class="text-center mt-5">
                <span class="material-symbols-rounded text-muted" style="font-size: 4rem; opacity: 0.3;">description</span>
                <p class="text-muted mt-3 fw-semibold">No active reports found.</p>
            </div>
        <?php else: ?>
            <?php foreach ($reports as $r): 
                $status = $r['status'] ? strtolower($r['status']) : 'open';
                $badgeClass = 'status-' . $status;
                $type = strtoupper($r['type']);
                $date = date('M d, Y', strtotime($r['created_at']));
                // Color mapping for the icon
                $iconColor = $r['type'] === 'lost' ? '#dc3545' : '#198754';
                $iconSymbol = $r['type'] === 'lost' ? 'search' : 'inventory_2';
            ?>
            <div class="report-card">
                <!-- Status Row -->
                <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                    <span class="fw-bold text-dark d-flex align-items-center gap-1" style="font-size: 0.95rem;">
                        <span class="material-symbols-rounded" style="color: <?= $iconColor ?>; font-size: 1.2rem;">
                            <?= $iconSymbol ?>
                        </span>
                        <?= htmlspecialchars($type) ?> ITEM
                    </span>
                    <span class="badge-status <?= $badgeClass ?>"><?= strtoupper($status) ?></span>
                </div>
                
                <!-- Description Payload -->
                <p class="mb-2 text-dark" style="white-space: pre-wrap; font-size: 0.9rem; line-height: 1.4; color: #374151;"><?= htmlspecialchars($r['item_description']) ?></p>
                <div class="text-muted mb-3 d-flex align-items-center gap-1" style="font-size: 0.8rem;">
                    <span class="material-symbols-rounded" style="font-size: 14px;">calendar_month</span> <?= $date ?>
                    <?php if (!empty($r['bus_number'])): ?>
                        <span class="text-muted px-1">•</span> 
                        <span class="fw-semibold">Bus <?= htmlspecialchars($r['bus_number']) ?></span>
                    <?php endif; ?>
                </div>

                <!-- Open Action Resolving Panel -->
                <?php if ($status === 'open'): ?>
                    <form method="POST" class="mt-3 text-end m-0" onsubmit="return confirm('Do you want to permanently mark this case as successfully closed?');">
                        <input type="hidden" name="action" value="resolve">
                        <input type="hidden" name="ticket_id" value="<?= $r['id'] ?>">
                        <button type="submit" class="btn-resolve shadow-sm d-inline-flex align-items-center gap-1">
                            <span class="material-symbols-rounded" style="font-size: 16px;">check_circle</span>
                            Mark as <?= $r['type'] === 'lost' ? 'Found' : 'Returned' ?>
                        </button>
                    </form>
                <?php endif; ?>
            </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
    
    <div style="height: 60px;"></div>
</body>
</html>
