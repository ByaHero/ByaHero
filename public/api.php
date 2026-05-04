<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require __DIR__ . '/../config/db.php';

// ── Auto-migration: create analytics tables if they don't exist ──
(function(){
    $p = db();
    $p->exec("CREATE TABLE IF NOT EXISTS bus_operations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        bus_id INT NOT NULL,
        conductor_id INT UNSIGNED NOT NULL,
        route VARCHAR(100) NOT NULL,
        pre_departure_count INT UNSIGNED NOT NULL DEFAULT 0,
        started_at DATETIME NOT NULL,
        ended_at DATETIME DEFAULT NULL,
        start_location VARCHAR(100) DEFAULT NULL,
        end_location VARCHAR(100) DEFAULT NULL,
        total_boarded INT UNSIGNED NOT NULL DEFAULT 0,
        total_departed INT UNSIGNED NOT NULL DEFAULT 0,
        status ENUM('active','completed') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bus_date (bus_id, started_at),
        INDEX idx_conductor (conductor_id),
        INDEX idx_route_date (route, started_at),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $p->exec("CREATE TABLE IF NOT EXISTS passenger_events (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        operation_id INT UNSIGNED NOT NULL,
        event_type ENUM('board','depart') NOT NULL,
        count INT UNSIGNED NOT NULL DEFAULT 1,
        location_name VARCHAR(100) DEFAULT NULL,
        lat DECIMAL(10,7) DEFAULT NULL,
        lng DECIMAL(10,7) DEFAULT NULL,
        recorded_at DATETIME NOT NULL,
        INDEX idx_operation (operation_id),
        INDEX idx_type_time (event_type, recorded_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $p->exec("CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_otp (otp_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $p->exec("CREATE TABLE IF NOT EXISTS passenger_rides (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        operation_id INT UNSIGNED NOT NULL,
        boarded_at DATETIME NOT NULL,
        departed_at DATETIME DEFAULT NULL,
        status ENUM('active', 'completed') DEFAULT 'active',
        INDEX idx_user (user_id),
        INDEX idx_operation (operation_id),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
})();


function loadGeojsonFileForBus(int $busId): ?array {
    $file = __DIR__ . '/../data/current_locations/bus_' . $busId . '.geojson';
    if (!is_file($file)) return null;
    $txt = @file_get_contents($file);
    if ($txt === false) return null;
    $j = json_decode($txt, true);
    if (!is_array($j)) return null;
    return $j;
}

function extractFriendlyNameFromGeojson(array $geojson): ?string {
    if (isset($geojson['properties']) && is_array($geojson['properties'])) {
        $p = $geojson['properties'];
        if (!empty($p['current_location_name']) && is_string($p['current_location_name'])) return trim($p['current_location_name']);
        if (!empty($p['Current Location']) && is_string($p['Current Location'])) return trim($p['Current Location']);
        if (!empty($p['name']) && is_string($p['name'])) return trim($p['name']);
        foreach ($p as $k => $v) {
            if (is_string($v) && trim($v) !== '') return trim($v);
            if ($v === '') return $k;
        }
    }
    // FeatureCollection fallback
    if (!empty($geojson['type']) && $geojson['type'] === 'FeatureCollection' && !empty($geojson['features']) && is_array($geojson['features'])) {
        $f = $geojson['features'][0];
        if (isset($f['properties']) && is_array($f['properties'])) {
            return extractFriendlyNameFromGeojson(['properties' => $f['properties']]);
        }
    }
    return null;
}

/**
 * Passenger / public view:
 * - Shows ALL buses (no conductor filter).
 * - Includes GeoJSON (current_location) + friendly name.
 */
function getBuses(): array {
    $pdo = db();
    $stmt = $pdo->query("
        SELECT
          b.Bus_ID,
          b.code,
          b.route,
          b.current_location AS current_location_name,
          b.total_seats,
          b.seat_availability,
          b.status,
          b.updated,
          (SELECT id FROM bus_operations WHERE bus_id = b.Bus_ID AND status = 'active' ORDER BY id DESC LIMIT 1) AS current_operation_id
        FROM busses b
        ORDER BY b.code
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $out = [];
    foreach ($rows as $r) {
        $busId = isset($r['Bus_ID']) ? (int)$r['Bus_ID'] : (int)($r['id'] ?? 0);

        $geo = loadGeojsonFileForBus($busId);
        if ($geo !== null) {
            $r['current_location'] = json_encode($geo, JSON_UNESCAPED_SLASHES);
            $friendly = extractFriendlyNameFromGeojson($geo);
            if ($friendly) {
                $r['current_location_name'] = $friendly;
            }
        } else {
            $r['current_location'] = null;
            // keep DB current_location_name as-is
        }

        $out[] = $r;
    }

    return ['success' => true, 'buses' => $out];
}

/**
 * Conductor view:
 * - Only free buses OR buses already assigned to this conductor.
 * - Includes GeoJSON + friendly name.
 */
function getBusesConductor(): array {
    session_start();
    $currentUserId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;

    $pdo = db();
    $stmt = $pdo->prepare("
        SELECT
          Bus_ID,
          code,
          route,
          current_location AS current_location_name,
          total_seats,
          seat_availability,
          status,
          updated,
          current_conductor_id
        FROM busses
        WHERE current_conductor_id IS NULL
           OR current_conductor_id = ?
        ORDER BY code
    ");
    $stmt->execute([$currentUserId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $out = [];
    foreach ($rows as $r) {
        $busId = isset($r['Bus_ID']) ? (int)$r['Bus_ID'] : (int)($r['id'] ?? 0);

        $geo = loadGeojsonFileForBus($busId);
        if ($geo !== null) {
            $r['current_location'] = json_encode($geo, JSON_UNESCAPED_SLASHES);
            $friendly = extractFriendlyNameFromGeojson($geo);
            if ($friendly) {
                $r['current_location_name'] = $friendly;
            }
        } else {
            $r['current_location'] = null;
        }

        $out[] = $r;
    }

    return ['success' => true, 'buses' => $out];
}

/** Return bus stops / terminals */
function getBusStopsTerminal(): array {
    $pdo = db();
    $stmt = $pdo->query("
        SELECT id, name, type, location_name, location_landmark, lat, lng
        FROM busstopsterminal
        ORDER BY name ASC
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return ['success' => true, 'data' => $rows];
}

/**
 * Get buses filtered by route
 * - Filters buses to show only those on a specific route
 * - Includes GeoJSON (current_location) + friendly name
 */
function getFilteredBuses(): array {
    $data = json_decode(file_get_contents('php://input'), true);
    if ($data === null) {
        // Also check query parameters
        $route = $_GET['route'] ?? null;
    } else {
        $route = $data['route'] ?? null;
    }

    if (empty($route)) {
        http_response_code(400);
        return ['success' => false, 'error' => 'Missing required parameter: route'];
    }

    $pdo = db();
    $stmt = $pdo->prepare("
        SELECT
          Bus_ID,
          code,
          route,
          current_location AS current_location_name,
          total_seats,
          seat_availability,
          status,
          updated
        FROM busses
        WHERE route = ?
        ORDER BY code
    ");
    $stmt->execute([$route]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $out = [];
    foreach ($rows as $r) {
        $busId = isset($r['Bus_ID']) ? (int)$r['Bus_ID'] : (int)($r['id'] ?? 0);

        $geo = loadGeojsonFileForBus($busId);
        if ($geo !== null) {
            $r['current_location'] = json_encode($geo, JSON_UNESCAPED_SLASHES);
            $friendly = extractFriendlyNameFromGeojson($geo);
            if ($friendly) {
                $r['current_location_name'] = $friendly;
            }
        } else {
            $r['current_location'] = null;
        }

        $out[] = $r;
    }

    return ['success' => true, 'buses' => $out, 'route' => $route];
}

/**
 * Update bus location and details.
 * Accepts geojson or lat/lng. Stores friendly name in busses.current_location and writes full GeoJSON to file.
 */
function updateLocation(): array {
    $data = json_decode(file_get_contents('php://input'), true);
    if ($data === null) {
        http_response_code(400);
        return ['success' => false, 'error' => 'Invalid JSON'];
    }
    if (!isset($data['bus_id'])) {
        http_response_code(400);
        return ['success' => false, 'error' => 'Missing required field: bus_id'];
    }

    $busId = (int)$data['bus_id'];

    // Build GeoJSON if provided; if only lat/lng given, convert to a Point GeoJSON
    $geojson = null;
    if (isset($data['geojson'])) {
        $geojson = $data['geojson'];
    } elseif (isset($data['lat']) && isset($data['lng'])) {
        $lat = filter_var($data['lat'], FILTER_VALIDATE_FLOAT);
        $lng = filter_var($data['lng'], FILTER_VALIDATE_FLOAT);
        if ($lat === false || $lng === false || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid lat/lng values'];
        }
        $geojson = [
            'type' => 'Feature',
            'geometry' => ['type' => 'Point', 'coordinates' => [$lng, $lat]],
            'properties' => ['timestamp' => gmdate('c')]
        ];
    } else {
        http_response_code(400);
        return ['success' => false, 'error' => 'Provide geojson or lat & lng'];
    }

    // Prefer friendly name from geojson properties, else try provided field
    $locationName = extractFriendlyNameFromGeojson($geojson);
    if (empty($locationName) && !empty($data['current_location_name'])) {
        $locationName = trim($data['current_location_name']);
    }

    // Save geojson file for coordinates — write atomically (tmp + rename)
    $dir = __DIR__ . '/../data/current_locations';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $file = $dir . "/bus_{$busId}.geojson";

    $geoTxt = json_encode($geojson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    $tmp = $file . '.tmp';
    @file_put_contents($tmp, $geoTxt, LOCK_EX);
    @rename($tmp, $file);

    // Update DB: store friendly name string in current_location column
    $pdo = db();

    // MANDATORY SECURITY: Only the assigned conductor can update this bus
    session_start();
    $currentUserId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
    if ($currentUserId <= 0) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Login required'];
    }

    $stCheck = $pdo->prepare("SELECT current_conductor_id FROM busses WHERE Bus_ID = ?");
    $stCheck->execute([$busId]);
    $rowCheck = $stCheck->fetch(PDO::FETCH_ASSOC);

    if (!$rowCheck || (int)$rowCheck['current_conductor_id'] !== $currentUserId) {
        http_response_code(403);
        return ['success' => false, 'error' => 'Not assigned to this bus'];
    }

    $fields = [];
    $params = [];

    $fields[] = 'current_location = ?';
    $params[] = $locationName !== null ? $locationName : null;

    if (isset($data['route'])) {
        $fields[] = 'route = ?';
        $params[] = $data['route'];
    }

    if (isset($data['seats_available'])) {
        $sa = filter_var($data['seats_available'], FILTER_VALIDATE_INT);
        if ($sa === false || $sa < 0) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid seats_available value'];
        }
        $fields[] = 'seat_availability = ?';
        $params[] = $sa;
    }

    if (isset($data['status'])) {
        $allowed = ['available','on_stop','full','unavailable'];
        if (!in_array($data['status'], $allowed, true)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid status value'];
        }
        $fields[] = 'status = ?';
        $params[] = $data['status'];
    }

    $fields[] = 'updated = CURRENT_TIMESTAMP';
    $params[] = $busId;

    $sql = "UPDATE busses SET " . implode(', ', $fields) . " WHERE Bus_ID = ?";
    $st = $pdo->prepare($sql);
    $st->execute($params);

    return ['success' => true, 'message' => 'Location updated successfully', 'current_location_name' => $locationName];
}

/**
 * Stop tracking for a bus:
 * - clears bus live data
 * - releases the bus from the conductor (current_conductor_id = NULL)
 * - clears the conductor's current_bus_id only if it matches this bus
 * - removes GeoJSON file
 *
 * This is called ONLY when the user explicitly presses "STOP TRACKING"
 * in conductorLive.php. If they simply close the tab, this is not called,
 * so auto-resume will still work.
 */
function stopTracking(): array {
    session_start();
    $data = json_decode(file_get_contents('php://input'), true);
    if ($data === null) {
        http_response_code(400);
        return ['success' => false, 'error' => 'Invalid JSON'];
    }
    if (!isset($data['bus_id'])) {
        http_response_code(400);
        return ['success' => false, 'error' => 'Missing bus_id'];
    }

    $busId  = (int)$data['bus_id'];
    $userId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;

    if ($busId <= 0 || $userId <= 0) {
        http_response_code(400);
        return ['success' => false, 'error' => 'Invalid bus or user'];
    }

    $pdo = db();

    // ── ANALYTICS: Finalize the active bus_operation ──
    $endLoc = isset($data['end_location']) ? trim($data['end_location']) : null;
    $stOp = $pdo->prepare("
        UPDATE bus_operations
        SET ended_at = NOW(), end_location = ?, status = 'completed'
        WHERE bus_id = ? AND conductor_id = ? AND status = 'active'
        ORDER BY id DESC LIMIT 1
    ");
    $stOp->execute([$endLoc, $busId, $userId]);

    // 1) Clear live tracking fields and release bus only if this conductor holds it
    $stmt = $pdo->prepare("
        UPDATE busses
        SET 
            current_location    = NULL,
            status              = 'unavailable',
            route               = NULL,
            seat_availability   = NULL,
            updated             = NULL,
            current_conductor_id = NULL
        WHERE Bus_ID = :bus_id
          AND current_conductor_id = :uid
    ");
    $stmt->execute([':bus_id' => $busId, ':uid' => $userId]);

    // 2) Clear the conductor's current_bus_id only if it matches this bus
    $stmt2 = $pdo->prepare("
        UPDATE conductors
        SET current_bus_id = NULL
        WHERE id = :uid
          AND current_bus_id = :bus_id
    ");
    $stmt2->execute([':uid' => $userId, ':bus_id' => $busId]);

    // 3) Clear session state for this bus so auto-resume won't trigger after explicit stop
    if (isset($_SESSION['current_bus']) && (int)($_SESSION['current_bus']['id'] ?? 0) === $busId) {
        unset($_SESSION['current_bus']);
    }

    // 4) remove GeoJSON file as well
    $file = __DIR__ . '/../data/current_locations/bus_' . $busId . '.geojson';
    if (is_file($file)) @unlink($file);

    return ['success' => true, 'message' => 'Stopped tracking for bus'];
}

/**
 * Start a new bus operation (called when conductor starts tracking).
 * Creates a row in bus_operations and returns the operation_id.
 */
function startOperation(): array {
    session_start();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { http_response_code(400); return ['success' => false, 'error' => 'Invalid JSON']; }

    $busId      = (int)($data['bus_id'] ?? 0);
    $userId     = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
    $route      = trim($data['route'] ?? '');
    $preDep     = (int)($data['pre_departure_count'] ?? 0);
    $startLoc   = isset($data['start_location']) ? trim($data['start_location']) : null;

    if ($busId <= 0 || $userId <= 0 || $route === '') {
        http_response_code(400);
        return ['success' => false, 'error' => 'Missing bus_id, user, or route'];
    }

    $pdo = db();

    // Close any stale active operations for this conductor (safety)
    $pdo->prepare("UPDATE bus_operations SET status='completed', ended_at=NOW() WHERE conductor_id=? AND status='active'")->execute([$userId]);

    $st = $pdo->prepare("
        INSERT INTO bus_operations (bus_id, conductor_id, route, pre_departure_count, started_at, start_location, total_boarded, total_departed, status)
        VALUES (?, ?, ?, ?, NOW(), ?, ?, 0, 'active')
    ");
    $st->execute([$busId, $userId, $route, $preDep, $startLoc, $preDep]);
    $opId = (int)$pdo->lastInsertId();

    // If there are pre-departure passengers, log them as a batch board event
    if ($preDep > 0) {
        $pdo->prepare("
            INSERT INTO passenger_events (operation_id, event_type, count, location_name, recorded_at)
            VALUES (?, 'board', ?, ?, NOW())
        ")->execute([$opId, $preDep, $startLoc ?? 'Terminal']);
    }

    return ['success' => true, 'operation_id' => $opId];
}

/**
 * Log a passenger board/depart event (called from conductor seat +/- with debounce).
 */
function logPassengerEvent(): array {
    session_start();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { http_response_code(400); return ['success' => false, 'error' => 'Invalid JSON']; }

    $opId       = (int)($data['operation_id'] ?? 0);
    $eventType  = $data['event_type'] ?? '';
    $count      = max(1, (int)($data['count'] ?? 1));
    $locName    = isset($data['location_name']) ? trim($data['location_name']) : null;
    $lat        = isset($data['lat']) ? (float)$data['lat'] : null;
    $lng        = isset($data['lng']) ? (float)$data['lng'] : null;

    if ($opId <= 0 || !in_array($eventType, ['board', 'depart'], true)) {
        http_response_code(400);
        return ['success' => false, 'error' => 'Invalid operation_id or event_type'];
    }

    $pdo = db();

    // Verify the operation is active and belongs to this conductor
    $userId = (int)($_SESSION['user_id'] ?? 0);
    $chk = $pdo->prepare("SELECT id FROM bus_operations WHERE id=? AND conductor_id=? AND status='active' LIMIT 1");
    $chk->execute([$opId, $userId]);
    if (!$chk->fetch()) {
        http_response_code(403);
        return ['success' => false, 'error' => 'Operation not found or not yours'];
    }

    // Insert event
    $pdo->prepare("
        INSERT INTO passenger_events (operation_id, event_type, count, location_name, lat, lng, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ")->execute([$opId, $eventType, $count, $locName, $lat, $lng]);

    // Update running counters on bus_operations
    $col = ($eventType === 'board') ? 'total_boarded' : 'total_departed';
    $pdo->prepare("UPDATE bus_operations SET {$col} = {$col} + ? WHERE id = ?")->execute([$count, $opId]);

    return ['success' => true, 'logged' => $eventType, 'count' => $count];
}

/**
 * Get analytics data for the admin dashboard.
 */
function getAnalytics(): array {
    session_start();
    if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
        http_response_code(403);
        return ['success' => false, 'error' => 'Admin only'];
    }

    $pdo = db();
    $period = $_GET['period'] ?? 'today';

    // Date filter
    switch ($period) {
        case 'week':  $dateFilter = "AND o.started_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"; break;
        case 'month': $dateFilter = "AND o.started_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"; break;
        default:      $dateFilter = "AND DATE(o.started_at) = CURDATE()"; break;
    }

    // Summary stats
    $sum = $pdo->query("SELECT
        COUNT(*) AS total_trips,
        COALESCE(SUM(o.total_boarded),0) AS total_passengers,
        COALESCE(SUM(o.pre_departure_count),0) AS total_pre_departure,
        COALESCE(SUM(o.total_departed),0) AS total_departed,
        COALESCE(AVG(TIMESTAMPDIFF(MINUTE, o.started_at, o.ended_at)),0) AS avg_trip_minutes
        FROM bus_operations o WHERE o.status='completed' {$dateFilter}")->fetch(PDO::FETCH_ASSOC);

    // Per-route breakdown
    $routes = $pdo->query("SELECT o.route, COUNT(*) AS trips, COALESCE(SUM(o.total_boarded),0) AS passengers
        FROM bus_operations o WHERE 1=1 {$dateFilter} GROUP BY o.route ORDER BY passengers DESC")->fetchAll(PDO::FETCH_ASSOC);

    // Per-bus breakdown (trips and passengers)
    $buses = $pdo->query("SELECT b.code, o.bus_id, COUNT(*) AS trips, COALESCE(SUM(o.total_boarded),0) AS passengers,
        GROUP_CONCAT(DISTINCT o.route SEPARATOR ', ') AS routes,
        GROUP_CONCAT(DISTINCT c.email SEPARATOR ', ') AS conductors
        FROM bus_operations o 
        JOIN busses b ON b.Bus_ID = o.bus_id
        JOIN conductors c ON c.id = o.conductor_id
        WHERE 1=1 {$dateFilter} GROUP BY o.bus_id, b.code ORDER BY passengers DESC")->fetchAll(PDO::FETCH_ASSOC);

    // Fetch all departures in this period grouped by bus and location
    $busDepQueries = $pdo->query("SELECT o.bus_id, pe.location_name, SUM(pe.count) AS total
        FROM passenger_events pe JOIN bus_operations o ON o.id = pe.operation_id
        WHERE pe.event_type='depart' AND pe.location_name IS NOT NULL {$dateFilter}
        GROUP BY o.bus_id, pe.location_name ORDER BY total DESC")->fetchAll(PDO::FETCH_ASSOC);

    // Nest hotspots into each bus
    foreach ($buses as &$bus) {
        $bus['hotspots'] = array_filter($busDepQueries, function($h) use ($bus) {
            return (int)$h['bus_id'] === (int)$bus['bus_id'];
        });
        $bus['hotspots'] = array_values($bus['hotspots']); // Reset keys
    }

    // Per-conductor breakdown
    $conductors = $pdo->query("SELECT c.email, o.conductor_id, COUNT(*) AS trips, COALESCE(SUM(o.total_boarded),0) AS passengers
        FROM bus_operations o JOIN conductors c ON c.id = o.conductor_id
        WHERE 1=1 {$dateFilter} GROUP BY o.conductor_id, c.email ORDER BY trips DESC")->fetchAll(PDO::FETCH_ASSOC);

    // Hourly passenger flow
    $hourly = $pdo->query("SELECT HOUR(pe.recorded_at) AS hr, SUM(pe.count) AS total
        FROM passenger_events pe JOIN bus_operations o ON o.id = pe.operation_id
        WHERE pe.event_type='board' {$dateFilter}
        GROUP BY HOUR(pe.recorded_at) ORDER BY hr")->fetchAll(PDO::FETCH_ASSOC);

    // Global Departure locations
    $departures = $pdo->query("SELECT pe.location_name, SUM(pe.count) AS total
        FROM passenger_events pe JOIN bus_operations o ON o.id = pe.operation_id
        WHERE pe.event_type='depart' AND pe.location_name IS NOT NULL {$dateFilter}
        GROUP BY pe.location_name ORDER BY total DESC LIMIT 20")->fetchAll(PDO::FETCH_ASSOC);

    // Global Boarding locations
    $boardings = $pdo->query("SELECT pe.location_name, SUM(pe.count) AS total
        FROM passenger_events pe JOIN bus_operations o ON o.id = pe.operation_id
        WHERE pe.event_type='board' AND pe.location_name IS NOT NULL {$dateFilter}
        GROUP BY pe.location_name ORDER BY total DESC LIMIT 20")->fetchAll(PDO::FETCH_ASSOC);

    // Recent operations
    $recent = $pdo->query("SELECT o.*, b.code AS bus_code, c.email AS conductor_email,
        TIMESTAMPDIFF(MINUTE, o.started_at, COALESCE(o.ended_at, NOW())) AS duration_min
        FROM bus_operations o
        JOIN busses b ON b.Bus_ID = o.bus_id
        JOIN conductors c ON c.id = o.conductor_id
        WHERE 1=1 {$dateFilter}
        ORDER BY o.started_at DESC LIMIT 20")->fetchAll(PDO::FETCH_ASSOC);

    // Location Activity Log (Boarding/Departure per location)
    $locationLogs = $pdo->query("SELECT 
        pe.location_name, 
        pe.recorded_at, 
        b.code AS bus_code, 
        c.email AS conductor_email, 
        o.route,
        SUM(CASE WHEN pe.event_type = 'board' THEN pe.count ELSE 0 END) AS boarded,
        SUM(CASE WHEN pe.event_type = 'depart' THEN pe.count ELSE 0 END) AS departed
        FROM passenger_events pe
        JOIN bus_operations o ON o.id = pe.operation_id
        JOIN busses b ON b.Bus_ID = o.bus_id
        JOIN conductors c ON c.id = o.conductor_id
        WHERE 1=1 {$dateFilter}
        GROUP BY pe.operation_id, pe.location_name, pe.recorded_at
        ORDER BY pe.recorded_at DESC LIMIT 50")->fetchAll(PDO::FETCH_ASSOC);

    return [
        'success' => true,
        'period' => $period,
        'summary' => $sum,
        'routes' => $routes,
        'buses' => $buses,
        'conductors' => $conductors,
        'hourly_flow' => $hourly,
        'departure_locations' => $departures,
        'boarding_locations' => $boardings,
        'recent_operations' => $recent,
        'location_logs' => $locationLogs
    ];
}

/** Public passenger summary — dynamic stats for the app */
function getPublicStats(): array {
    $pdo = db();
    $row = $pdo->query("SELECT
        COALESCE(ROUND(AVG(daily_total)),0) AS avg_daily_passengers
        FROM (SELECT DATE(started_at) AS d, SUM(total_boarded) AS daily_total
              FROM bus_operations WHERE status='completed' AND started_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
              GROUP BY DATE(started_at)) AS sub")->fetch(PDO::FETCH_ASSOC);
    $todayTrips = (int)$pdo->query("SELECT COUNT(*) FROM bus_operations WHERE DATE(started_at)=CURDATE()")->fetchColumn();
    return [
        'success' => true,
        'avg_daily_passengers' => (int)($row['avg_daily_passengers'] ?? 0),
        'today_trips' => $todayTrips
    ];
}

/** Join a ride (passenger boarding) */
function joinRide(): array {
    session_start();
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Login required'];
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $opId = (int)($data['operation_id'] ?? 0);
    $userId = (int)$_SESSION['user_id'];

    if ($opId <= 0) {
        http_response_code(400);
        return ['success' => false, 'error' => 'Missing operation_id'];
    }

    $pdo = db();
    
    // Check if already on an active ride
    $stCheck = $pdo->prepare("SELECT id FROM passenger_rides WHERE user_id = ? AND status = 'active'");
    $stCheck->execute([$userId]);
    if ($stCheck->fetch()) {
        return ['success' => true, 'message' => 'Already on an active ride'];
    }

    $st = $pdo->prepare("INSERT INTO passenger_rides (user_id, operation_id, boarded_at, status) VALUES (?, ?, NOW(), 'active')");
    $st->execute([$userId, $opId]);

    return ['success' => true, 'ride_id' => $pdo->lastInsertId()];
}

/** Leave a ride (passenger departing) */
function leaveRide(): array {
    session_start();
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Login required'];
    }

    $userId = (int)$_SESSION['user_id'];
    $pdo = db();

    $st = $pdo->prepare("UPDATE passenger_rides SET departed_at = NOW(), status = 'completed' WHERE user_id = ? AND status = 'active'");
    $st->execute([$userId]);

    return ['success' => true];
}

/** Get passenger ride history */
function getRideHistory(): array {
    session_start();
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Login required'];
    }

    $userId = (int)$_SESSION['user_id'];
    $pdo = db();

    $st = $pdo->prepare("
        SELECT 
            pr.id,
            pr.boarded_at,
            pr.departed_at,
            pr.status,
            bo.route,
            b.code AS bus_code
        FROM passenger_rides pr
        JOIN bus_operations bo ON pr.operation_id = bo.id
        JOIN busses b ON bo.bus_id = b.Bus_ID
        WHERE pr.user_id = ?
        ORDER BY pr.boarded_at DESC
    ");
    $st->execute([$userId]);
    $history = $st->fetchAll(PDO::FETCH_ASSOC);

    return ['success' => true, 'history' => $history];
}

/** Check if passenger is currently on a ride and if that ride is still active */
function checkActiveRide(): array {
    session_start();
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Login required'];
    }

    $userId = (int)$_SESSION['user_id'];
    $pdo = db();

    $st = $pdo->prepare("
        SELECT 
            pr.id,
            pr.operation_id,
            bo.status AS operation_status,
            bo.bus_id,
            b.code AS bus_code
        FROM passenger_rides pr
        JOIN bus_operations bo ON pr.operation_id = bo.id
        JOIN busses b ON bo.bus_id = b.Bus_ID
        WHERE pr.user_id = ? AND pr.status = 'active'
        LIMIT 1
    ");
    $st->execute([$userId]);
    $ride = $st->fetch(PDO::FETCH_ASSOC);

    if ($ride) {
        // If the operation is completed, automatically complete the passenger ride
        if ($ride['operation_status'] === 'completed') {
            $pdo->prepare("UPDATE passenger_rides SET departed_at = NOW(), status = 'completed' WHERE id = ?")
                ->execute([$ride['id']]);
            return ['success' => true, 'on_ride' => false];
        }
        return ['success' => true, 'on_ride' => true, 'ride' => $ride];
    }

    return ['success' => true, 'on_ride' => false];
}

// Dispatch
$action = $_GET['action'] ?? $_POST['action'] ?? 'get_buses';

try {
    switch ($action) {
        case 'get_buses':                 $response = getBuses(); break;
        case 'get_buses_conductor':       $response = getBusesConductor(); break;
        case 'get_bus_stops_terminal':    $response = getBusStopsTerminal(); break;
        case 'get_filtered_buses':        $response = getFilteredBuses(); break;
        case 'update_location':           $response = updateLocation(); break;
        case 'stop_tracking':             $response = stopTracking(); break;
        case 'start_operation':           $response = startOperation(); break;
        case 'log_passenger_event':       $response = logPassengerEvent(); break;
        case 'get_analytics':             $response = getAnalytics(); break;
        case 'get_public_stats':          $response = getPublicStats(); break;
        case 'join_ride':                 $response = joinRide(); break;
        case 'leave_ride':                $response = leaveRide(); break;
        case 'get_ride_history':          $response = getRideHistory(); break;
        case 'check_active_ride':         $response = checkActiveRide(); break;
        default:
            http_response_code(400);
            $response = ['success' => false, 'error' => 'Invalid action'];
    }
    echo json_encode($response);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}