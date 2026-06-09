<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
@session_start();
header('Content-Type: application/json; charset=utf-8');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');

// Load database connection
try {
    $conn = db();
} catch (\Throwable $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// Helper to send JSON responses
function send_json_response(bool $success, string $message = '', array $extra = []): void {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit;
}

// Load whitelist dynamically from public/routes/laurel-talisay-tanauan.geojson
$location_whitelist = [];
$geojson_path = __DIR__ . '/../public/routes/laurel-talisay-tanauan.geojson';
if (is_file($geojson_path)) {
    $geojson_content = @file_get_contents($geojson_path);
    if ($geojson_content !== false) {
        $geojson_data = json_decode($geojson_content, true);
        if (isset($geojson_data['features']) && is_array($geojson_data['features'])) {
            foreach ($geojson_data['features'] as $feature) {
                $name = $feature['properties']['Current Location'] ?? $feature['properties']['name'] ?? null;
                if ($name !== null) {
                    $location_whitelist[] = trim((string)$name);
                }
            }
        }
    }
}
// Fallback if file read fails
if (empty($location_whitelist)) {
    $location_whitelist = [
        "J. Leviste, Laurel", "Sampaloc, Talisay", "Caloocan, Talisay", "Buco, Talisay",
        "Balas, Talisay", "Ambulong, Tanauan", "Banadero, Tanauan", "Talaga, Tanauan",
        "Sambat, Tanauan", "Tanauan", "Sto. Tomas", "Bugaan West, Laurel", "Laurel",
        "Balakilong, Laurel", "Berinayan, Laurel", "Leynes, Talisay", "Santa Maria, Talisay",
        "Banga, Talisay", "Talisay", "Tumaway, Talisay", "Quiling, Talisay", "Aya, Talisay",
        "Santor, Tanauan", "Bugaan East, Laurel", "Looc, Calamba", "San Isidro"
    ];
}

// Read input payload for JSON POSTs, fallback to $_GET/$_POST
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = (string)($input['action'] ?? $_POST['action'] ?? $_GET['action'] ?? '');

if (empty($action)) {
    send_json_response(false, 'Action required');
}

// Actions execution
try {
    // 1. SET WAITING STATUS (Passenger only)
    if ($action === 'set_waiting') {
        if (!isset($_SESSION['user_id'])) {
            send_json_response(false, 'Unauthorized. Please login.');
        }
        $userId = (int)$_SESSION['user_id'];
        $userName = $_SESSION['user_name'] ?? $_SESSION['user_email'] ?? 'Unknown Passenger';
        $location = trim((string)($input['location_name'] ?? $_POST['location_name'] ?? ''));

        if (empty($location)) {
            send_json_response(false, 'Location name is required');
        }

        if (!in_array($location, $location_whitelist, true)) {
            send_json_response(false, 'Invalid waiting location');
        }

        // Check if there is already an active waiting entry
        $checkStmt = $conn->prepare("SELECT id FROM waiting_passengers WHERE user_id = ? AND status = 'waiting' LIMIT 1");
        $checkStmt->bind_param("i", $userId);
        $checkStmt->execute();
        $existing = $checkStmt->get_result()->fetch_assoc();
        $checkStmt->close();

        if ($existing) {
            // Update location in the existing active row
            $updateStmt = $conn->prepare("UPDATE waiting_passengers SET location_name = ?, updated_at = NOW() WHERE id = ?");
            $existingId = (int)$existing['id'];
            $updateStmt->bind_param("si", $location, $existingId);
            $updateStmt->execute();
            $updateStmt->close();
        } else {
            // Insert a new waiting row
            $insertStmt = $conn->prepare("INSERT INTO waiting_passengers (user_id, user_name, location_name, status) VALUES (?, ?, ?, 'waiting')");
            $insertStmt->bind_param("iss", $userId, $userName, $location);
            $insertStmt->execute();
            $insertStmt->close();
        }

        send_json_response(true, 'Waiting status updated', ['location_name' => $location, 'status' => 'waiting']);
    }

    // 2. CANCEL WAITING (Passenger only)
    elseif ($action === 'cancel_waiting') {
        if (!isset($_SESSION['user_id'])) {
            send_json_response(false, 'Unauthorized');
        }
        $userId = (int)$_SESSION['user_id'];

        $cancelStmt = $conn->prepare("UPDATE waiting_passengers SET status = 'cancelled', updated_at = NOW() WHERE user_id = ? AND status = 'waiting'");
        $cancelStmt->bind_param("i", $userId);
        $cancelStmt->execute();
        $cancelStmt->close();

        send_json_response(true, 'Waiting status cancelled');
    }

    // 3. GET MY CURRENT WAITING STATUS (Passenger only)
    elseif ($action === 'get_my_status') {
        if (!isset($_SESSION['user_id'])) {
            send_json_response(false, 'Unauthorized');
        }
        $userId = (int)$_SESSION['user_id'];

        $statusStmt = $conn->prepare("SELECT location_name FROM waiting_passengers WHERE user_id = ? AND status = 'waiting' LIMIT 1");
        $statusStmt->bind_param("i", $userId);
        $statusStmt->execute();
        $res = $statusStmt->get_result()->fetch_assoc();
        $statusStmt->close();

        if ($res) {
            send_json_response(true, 'Status retrieved', [
                'is_waiting' => true,
                'location_name' => $res['location_name']
            ]);
        } else {
            send_json_response(true, 'Status retrieved', [
                'is_waiting' => false,
                'location_name' => null
            ]);
        }
    }

    // 4. GET GROUPED WAIT COUNTS PER LOCATION (Conductor & Admin)
    elseif ($action === 'get_wait_count') {
        $role = $_SESSION['user_role'] ?? '';
        if ($role !== 'conductor' && $role !== 'driver' && $role !== 'admin') {
            send_json_response(false, 'Unauthorized role access');
        }

        // Fetch location waiting counts
        $query = "SELECT location_name, COUNT(*) AS count FROM waiting_passengers WHERE status = 'waiting' GROUP BY location_name ORDER BY location_name";
        $result = $conn->query($query);
        $locations = [];
        $total = 0;

        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $count = (int)$row['count'];
                $locations[] = [
                    'location_name' => $row['location_name'],
                    'count' => $count
                ];
                $total += $count;
            }
        }

        send_json_response(true, 'Wait counts retrieved', [
            'locations' => $locations,
            'total' => $total
        ]);
    }

    // 5. GET TOTAL WAITING FOR DASHBOARD (Admin only)
    elseif ($action === 'get_admin_total') {
        $role = $_SESSION['user_role'] ?? '';
        if ($role !== 'admin') {
            send_json_response(false, 'Unauthorized access');
        }

        $totalStmt = $conn->query("SELECT COUNT(*) AS total FROM waiting_passengers WHERE status = 'waiting'");
        $row = $totalStmt->fetch_assoc();
        $total = (int)($row['total'] ?? 0);

        send_json_response(true, 'Admin total retrieved', ['total' => $total]);
    }

    else {
        send_json_response(false, 'Unsupported action');
    }

} catch (\Throwable $e) {
    send_json_response(false, 'Internal server error: ' . $e->getMessage());
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
