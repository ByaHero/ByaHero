<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json; charset=utf-8');

// Auto-migration is now handled centrally in config/db.php via schema_init.php



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

function tableColumnExists(mysqli $conn, string $table, string $column): bool {
    $safeTable = $conn->real_escape_string($table);
    $safeColumn = $conn->real_escape_string($column);
    $result = $conn->query("SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeColumn}'");
    return $result && $result->num_rows > 0;
}

function enumColumnHasValue(mysqli $conn, string $table, string $column, string $value): bool {
    $safeTable = $conn->real_escape_string($table);
    $safeColumn = $conn->real_escape_string($column);
    $result = $conn->query("SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeColumn}'");
    if (!$result || !($row = $result->fetch_assoc())) return false;
    return strpos((string)$row['Type'], "'" . $value . "'") !== false;
}

function activeRideStatuses(mysqli $conn): array {
    $statuses = ["'active'"];
    if (enumColumnHasValue($conn, 'passenger_rides', 'status', 'ongoing')) {
        $statuses[] = "'ongoing'";
    }
    return $statuses;
}

/**
 * Passenger / public view:
 * - Shows ALL buses (no conductor filter).
 * - Includes GeoJSON (current_location) + friendly name.
 */
function getBuses(): array {
    $conn = db();
    $result = $conn->query("
        SELECT
          b.Bus_ID,
          b.code,
          b.route,
          b.current_location AS current_location_name,
          b.total_seats,
          b.seat_availability,
          b.status,
          b.updated,
          b.lat,
          b.lng,
          (SELECT id FROM bus_operations WHERE bus_id = b.Bus_ID AND status = 'active' ORDER BY id DESC LIMIT 1) AS current_operation_id
        FROM busses b
        ORDER BY b.code
    ");
    $rows = $result->fetch_all(MYSQLI_ASSOC);

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

        if (isset($r['seat_availability']) && (int)$r['seat_availability'] < 0) {
            $r['seat_availability'] = 0;
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
    @session_start();
    $currentUserId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;

    $conn = db();
    $stmt = $conn->prepare("
        SELECT
          Bus_ID,
          code,
          route,
          current_location AS current_location_name,
          total_seats,
          seat_availability,
          status,
          updated,
          lat,
          lng,
          current_conductor_id
        FROM busses
        WHERE current_conductor_id IS NULL
           OR current_conductor_id = ?
        ORDER BY code
    ");
    $stmt->bind_param("i", $currentUserId);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

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
    $conn = db();
    $result = $conn->query("
        SELECT id, name, type, route, location_name, location_landmark, lat, lng
        FROM busstopsterminal
        ORDER BY name ASC
    ");
    $rows = $result->fetch_all(MYSQLI_ASSOC);

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
        $route = $_GET['route'] ?? null;
    } else {
        $route = $data['route'] ?? null;
    }

    if (empty($route)) {
        http_response_code(400);
        return ['success' => false, 'error' => 'Missing required parameter: route'];
    }

    $conn = db();
    $stmt = $conn->prepare("
        SELECT
          Bus_ID,
          code,
          route,
          current_location AS current_location_name,
          total_seats,
          seat_availability,
          status,
          updated,
          lat,
          lng
        FROM busses
        WHERE route = ?
        ORDER BY code
    ");
    $stmt->bind_param("s", $route);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

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

        if (isset($r['seat_availability']) && (int)$r['seat_availability'] < 0) {
            $r['seat_availability'] = 0;
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

    $locationName = extractFriendlyNameFromGeojson($geojson);
    if (empty($locationName) && !empty($data['current_location_name'])) {
        $locationName = trim($data['current_location_name']);
    }

    $dir = __DIR__ . '/../data/current_locations';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $file = $dir . "/bus_{$busId}.geojson";

    $geoTxt = json_encode($geojson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    $tmp = $file . '.tmp';
    @file_put_contents($tmp, $geoTxt, LOCK_EX);
    @rename($tmp, $file);

    $conn = db();

    @session_start();
    $currentUserId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
    if ($currentUserId <= 0) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Login required'];
    }

    $stCheck = $conn->prepare("SELECT current_conductor_id FROM busses WHERE Bus_ID = ?");
    $stCheck->bind_param("i", $busId);
    $stCheck->execute();
    $rowCheck = $stCheck->get_result()->fetch_assoc();

    if (!$rowCheck || (int)$rowCheck['current_conductor_id'] !== $currentUserId) {
        http_response_code(403);
        return ['success' => false, 'error' => 'Not assigned to this bus'];
    }

    $fields = [];
    $params = [];
    $types = "";

    $fields[] = 'current_location = ?';
    $params[] = $locationName;
    $types .= "s";

    if ($geojson !== null && isset($geojson['geometry']['coordinates'])) {
        $fields[] = 'lat = ?';
        $params[] = $geojson['geometry']['coordinates'][1];
        $types .= "d";

        $fields[] = 'lng = ?';
        $params[] = $geojson['geometry']['coordinates'][0];
        $types .= "d";
    }

    if (isset($data['route'])) {
        $fields[] = 'route = ?';
        $params[] = $data['route'];
        $types .= "s";
    }

    if (isset($data['seats_available'])) {
        $sa = filter_var($data['seats_available'], FILTER_VALIDATE_INT);
        if ($sa !== false && $sa >= 0) {
            $fields[] = 'seat_availability = ?';
            $params[] = $sa;
            $types .= "i";
        }
    }

    if (isset($data['status'])) {
        $allowed = ['available','on_stop','full','unavailable'];
        if (in_array($data['status'], $allowed, true)) {
            $fields[] = 'status = ?';
            $params[] = $data['status'];
            $types .= "s";
        }
    }

    $fields[] = 'updated = CURRENT_TIMESTAMP';
    
    $sql = "UPDATE busses SET " . implode(', ', $fields) . " WHERE Bus_ID = ?";
    $params[] = $busId;
    $types .= "i";

    $st = $conn->prepare($sql);
    $st->bind_param($types, ...$params);
    $st->execute();

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
    @session_start();
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

    $conn = db();

    // 1) Cascade complete active passenger rides for this active operation before completing it
    $stPass = $conn->prepare("
        UPDATE passenger_rides pr
        JOIN bus_operations bo ON pr.operation_id = bo.id
        SET pr.departed_at = NOW(), pr.status = 'completed'
        WHERE bo.bus_id = ? AND bo.conductor_id = ? AND bo.status = 'active' AND pr.status IN ('active', 'ongoing')
    ");
    $stPass->bind_param("ii", $busId, $userId);
    $stPass->execute();
    $stPass->close();

    // 2) Complete the bus operation
    $endLoc = isset($data['end_location']) ? trim($data['end_location']) : null;
    $stOp = $conn->prepare("
        UPDATE bus_operations
        SET ended_at = NOW(), end_location = ?, status = 'completed'
        WHERE bus_id = ? AND conductor_id = ? AND status = 'active'
        ORDER BY id DESC LIMIT 1
    ");
    $stOp->bind_param("sii", $endLoc, $busId, $userId);
    $stOp->execute();

    $stmt = $conn->prepare("
        UPDATE busses
        SET 
            current_location    = NULL,
            status              = 'unavailable',
            route               = NULL,
            seat_availability   = NULL,
            updated             = NULL,
            current_conductor_id = NULL
        WHERE Bus_ID = ?
          AND current_conductor_id = ?
    ");
    $stmt->bind_param("ii", $busId, $userId);
    $stmt->execute();

    $stmt2 = $conn->prepare("
        UPDATE conductors
        SET current_bus_id = NULL
        WHERE id = ?
          AND current_bus_id = ?
    ");
    $stmt2->bind_param("ii", $userId, $busId);
    $stmt2->execute();

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
    @session_start();
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

    $conn = db();

    // Close any stale active operations for this conductor (safety)
    $stClose = $conn->prepare("UPDATE bus_operations SET status='completed', ended_at=NOW() WHERE conductor_id=? AND status='active'");
    $stClose->bind_param("i", $userId);
    $stClose->execute();

    $st = $conn->prepare("
        INSERT INTO bus_operations (bus_id, conductor_id, route, pre_departure_count, started_at, start_location, total_boarded, total_departed, status)
        VALUES (?, ?, ?, ?, NOW(), ?, ?, 0, 'active')
    ");
    // Parameters: bus_id(i), conductor_id(i), route(s), pre_departure_count(i), start_location(s), total_boarded(i)
    $st->bind_param("iisisi", $busId, $userId, $route, $preDep, $startLoc, $preDep);
    $st->execute();
    $opId = (int)$conn->insert_id;

    if ($preDep > 0) {
        $stEvent = $conn->prepare("
            INSERT INTO passenger_events (operation_id, event_type, count, location_name, recorded_at)
            VALUES (?, 'board', ?, ?, NOW())
        ");
        $terminal = $startLoc ?? 'Terminal';
        $stEvent->bind_param("iis", $opId, $preDep, $terminal);
        $stEvent->execute();
    }

    return ['success' => true, 'operation_id' => $opId];
}

/**
 * Log a passenger board/depart event (called from conductor seat +/- with debounce).
 */
function logPassengerEvent(): array {
    @session_start();
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

    $conn = db();

    $userId = (int)($_SESSION['user_id'] ?? 0);
    $chk = $conn->prepare("SELECT id FROM bus_operations WHERE id=? AND conductor_id=? AND status='active' LIMIT 1");
    $chk->bind_param("ii", $opId, $userId);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) {
        http_response_code(403);
        return ['success' => false, 'error' => 'Operation not found or not yours'];
    }

    $st = $conn->prepare("
        INSERT INTO passenger_events (operation_id, event_type, count, location_name, lat, lng, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    $st->bind_param("isisdd", $opId, $eventType, $count, $locName, $lat, $lng);
    $st->execute();

    $col = ($eventType === 'board') ? 'total_boarded' : 'total_departed';
    $upOp = $conn->prepare("UPDATE bus_operations SET {$col} = {$col} + ? WHERE id = ?");
    $upOp->bind_param("ii", $count, $opId);
    $upOp->execute();

    return ['success' => true, 'logged' => $eventType, 'count' => $count];
}

/**
 * Get analytics data for the admin dashboard.
 */
function getAnalytics(): array {
    @session_start();
    if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
        http_response_code(403);
        return ['success' => false, 'error' => 'Admin only'];
    }

    $conn = db();
    $period = $_GET['period'] ?? 'today';

    switch ($period) {
        case 'week':  $dateFilter = "AND o.started_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"; break;
        case 'month': $dateFilter = "AND o.started_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"; break;
        case 'custom':
            $start = $conn->real_escape_string($_GET['start'] ?? '');
            $end = $conn->real_escape_string($_GET['end'] ?? '');
            if ($start && $end) {
                $dateFilter = "AND o.started_at >= '{$start} 00:00:00' AND o.started_at <= '{$end} 23:59:59'";
            } else {
                $dateFilter = "AND DATE(o.started_at) = CURDATE()";
            }
            break;
        default:      $dateFilter = "AND DATE(o.started_at) = CURDATE()"; break;
    }

    $sumResult = $conn->query("SELECT
        COUNT(*) AS total_trips,
        COALESCE(SUM(o.total_boarded),0) AS total_passengers,
        COALESCE(SUM(o.pre_departure_count),0) AS total_pre_departure,
        COALESCE(SUM(o.total_departed),0) AS total_departed,
        COALESCE(AVG(TIMESTAMPDIFF(MINUTE, o.started_at, o.ended_at)),0) AS avg_trip_minutes
        FROM bus_operations o WHERE o.status='completed' {$dateFilter}");
    $sum = $sumResult->fetch_assoc();

    $routesResult = $conn->query("SELECT o.route, COUNT(*) AS trips, COALESCE(SUM(o.total_boarded),0) AS passengers
        FROM bus_operations o WHERE 1=1 {$dateFilter} GROUP BY o.route ORDER BY passengers DESC");
    $routes = $routesResult->fetch_all(MYSQLI_ASSOC);

    $busesResult = $conn->query("SELECT b.code, o.bus_id, COUNT(*) AS trips, COALESCE(SUM(o.total_boarded),0) AS passengers,
        GROUP_CONCAT(DISTINCT o.route SEPARATOR ', ') AS routes,
        GROUP_CONCAT(DISTINCT c.email SEPARATOR ', ') AS conductors
        FROM bus_operations o 
        JOIN busses b ON b.Bus_ID = o.bus_id
        JOIN conductors c ON c.id = o.conductor_id
        WHERE 1=1 {$dateFilter} GROUP BY o.bus_id, b.code ORDER BY passengers DESC");
    $buses = $busesResult->fetch_all(MYSQLI_ASSOC);

    $busDepQueriesResult = $conn->query("SELECT o.bus_id, pe.location_name, SUM(pe.count) AS total
        FROM passenger_events pe JOIN bus_operations o ON o.id = pe.operation_id
        WHERE pe.event_type='depart' AND pe.location_name IS NOT NULL {$dateFilter}
        GROUP BY o.bus_id, pe.location_name ORDER BY total DESC");
    $busDepQueries = $busDepQueriesResult->fetch_all(MYSQLI_ASSOC);

    foreach ($buses as &$bus) {
        $bus['hotspots'] = array_filter($busDepQueries, function($h) use ($bus) {
            return (int)$h['bus_id'] === (int)$bus['bus_id'];
        });
        $bus['hotspots'] = array_values($bus['hotspots']); 
    }

    $conductorsResult = $conn->query("SELECT c.email, o.conductor_id, COUNT(*) AS trips, COALESCE(SUM(o.total_boarded),0) AS passengers
        FROM bus_operations o JOIN conductors c ON c.id = o.conductor_id
        WHERE 1=1 {$dateFilter} GROUP BY o.conductor_id, c.email ORDER BY trips DESC");
    $conductors = $conductorsResult->fetch_all(MYSQLI_ASSOC);

    $hourlyResult = $conn->query("SELECT HOUR(pe.recorded_at) AS hr, SUM(pe.count) AS total
        FROM passenger_events pe JOIN bus_operations o ON o.id = pe.operation_id
        WHERE pe.event_type='board' {$dateFilter}
        GROUP BY HOUR(pe.recorded_at) ORDER BY hr");
    $hourly = $hourlyResult->fetch_all(MYSQLI_ASSOC);

    $departuresResult = $conn->query("SELECT pe.location_name, SUM(pe.count) AS total
        FROM passenger_events pe JOIN bus_operations o ON o.id = pe.operation_id
        WHERE pe.event_type='depart' AND pe.location_name IS NOT NULL {$dateFilter}
        GROUP BY pe.location_name ORDER BY total DESC LIMIT 20");
    $departures = $departuresResult->fetch_all(MYSQLI_ASSOC);

    $boardingsResult = $conn->query("SELECT pe.location_name, SUM(pe.count) AS total
        FROM passenger_events pe JOIN bus_operations o ON o.id = pe.operation_id
        WHERE pe.event_type='board' AND pe.location_name IS NOT NULL {$dateFilter}
        GROUP BY pe.location_name ORDER BY total DESC LIMIT 20");
    $boardings = $boardingsResult->fetch_all(MYSQLI_ASSOC);

    $recentResult = $conn->query("SELECT o.*, b.code AS bus_code, c.email AS conductor_email,
        TIMESTAMPDIFF(MINUTE, o.started_at, COALESCE(o.ended_at, NOW())) AS duration_min
        FROM bus_operations o
        JOIN busses b ON b.Bus_ID = o.bus_id
        JOIN conductors c ON c.id = o.conductor_id
        WHERE 1=1 {$dateFilter}
        ORDER BY o.started_at DESC LIMIT 20");
    $recent = $recentResult->fetch_all(MYSQLI_ASSOC);

    $locationLogs = $conn->query("SELECT 
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
        ORDER BY pe.recorded_at DESC LIMIT 50")->fetch_all(MYSQLI_ASSOC);

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
    $conn = db();
    $res = $conn->query("SELECT
        COALESCE(ROUND(AVG(daily_total)),0) AS avg_daily_passengers
        FROM (SELECT DATE(started_at) AS d, SUM(total_boarded) AS daily_total
              FROM bus_operations WHERE status='completed' AND started_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
              GROUP BY DATE(started_at)) AS sub");
    $row = $res->fetch_assoc();
    
    $resToday = $conn->query("SELECT COUNT(*) FROM bus_operations WHERE DATE(started_at)=CURDATE()");
    $todayTrips = (int)$resToday->fetch_row()[0];
    
    return [
        'success' => true,
        'avg_daily_passengers' => (int)($row['avg_daily_passengers'] ?? 0),
        'today_trips' => $todayTrips
    ];
}

/** Join a ride (passenger boarding) */
function joinRide(): array {
    @session_start();
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

    $conn = db();
    
    $activeStatuses = activeRideStatuses($conn);
    $activeStatusSql = implode(',', $activeStatuses);
    $stCheck = $conn->prepare("SELECT id FROM passenger_rides WHERE user_id = ? AND status IN ({$activeStatusSql})");
    if (!$stCheck) {
        return ['success' => false, 'error' => 'Prepare check failed: ' . $conn->error];
    }
    $stCheck->bind_param("i", $userId);
    $stCheck->execute();
    if ($stCheck->get_result()->fetch_assoc()) {
        return ['success' => true, 'message' => 'Already on an active ride'];
    }
    $stCheck->close();

    $stOp = $conn->prepare("SELECT id, bus_id, route, status FROM bus_operations WHERE id = ? AND status = 'active' LIMIT 1");
    if (!$stOp) {
        return ['success' => false, 'error' => 'Prepare select operation failed: ' . $conn->error];
    }
    $stOp->bind_param("i", $opId);
    $stOp->execute();
    $opData = $stOp->get_result()->fetch_assoc();
    $stOp->close();

    if (!$opData) {
        return ['success' => false, 'error' => 'Active bus operation not found for id: ' . $opId];
    }

    $busId = (int)$opData['bus_id'];
    $route = $opData['route'];

    $hasOperationId = tableColumnExists($conn, 'passenger_rides', 'operation_id');
    $hasBusId = tableColumnExists($conn, 'passenger_rides', 'bus_id');
    $hasRoute = tableColumnExists($conn, 'passenger_rides', 'route');
    $rideStatus = enumColumnHasValue($conn, 'passenger_rides', 'status', 'active') ? 'active' : 'ongoing';

    $columns = ['user_id'];
    $placeholders = ['?'];
    $types = 'i';
    $params = [$userId];

    if ($hasOperationId) {
        $columns[] = 'operation_id';
        $placeholders[] = '?';
        $types .= 'i';
        $params[] = $opId;
    }
    if ($hasBusId) {
        $columns[] = 'bus_id';
        $placeholders[] = '?';
        $types .= 'i';
        $params[] = $busId;
    }
    if ($hasRoute) {
        $columns[] = 'route';
        $placeholders[] = '?';
        $types .= 's';
        $params[] = $route;
    }

    $columns[] = 'boarded_at';
    $placeholders[] = 'NOW()';
    $columns[] = 'status';
    $placeholders[] = '?';
    $types .= 's';
    $params[] = $rideStatus;

    $sql = "INSERT INTO passenger_rides (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";
    $st = $conn->prepare($sql);
    if (!$st) {
        return ['success' => false, 'error' => 'Prepare insert failed: ' . $conn->error];
    }
    $st->bind_param($types, ...$params);
    if (!$st->execute()) {
        return ['success' => false, 'error' => 'Execute insert failed: ' . $st->error];
    }
    $rideId = (int)$conn->insert_id;
    $st->close();

    // Auto-clear waiting status when passenger boards
    $stWait = $conn->prepare("UPDATE waiting_passengers SET status='boarded', updated_at=NOW() WHERE user_id=? AND status='waiting'");
    if ($stWait) {
        $stWait->bind_param("i", $userId);
        $stWait->execute();
        $stWait->close();
    }

    return ['success' => true, 'ride_id' => $rideId];
}

/** Leave a ride (passenger departing) */
function leaveRide(): array {
    @session_start();
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Login required'];
    }

    $userId = (int)$_SESSION['user_id'];
    $conn = db();

    $activeStatuses = activeRideStatuses($conn);
    $activeStatusSql = implode(',', $activeStatuses);
    $st = $conn->prepare("UPDATE passenger_rides SET departed_at = NOW(), status = 'completed' WHERE user_id = ? AND status IN ({$activeStatusSql})");
    $st->bind_param("i", $userId);
    $st->execute();
    $st->close();

    // Auto-clear waiting status when passenger departs
    $stWait = $conn->prepare("UPDATE waiting_passengers SET status='cancelled', updated_at=NOW() WHERE user_id=? AND status='waiting'");
    if ($stWait) {
        $stWait->bind_param("i", $userId);
        $stWait->execute();
        $stWait->close();
    }

    return ['success' => true];
}

/** Get passenger ride history */
function getRideHistory(): array {
    @session_start();
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Login required'];
    }

    $userId = (int)$_SESSION['user_id'];
    $conn = db();

    if (tableColumnExists($conn, 'passenger_rides', 'operation_id')) {
        $historySql = "
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
        ";
    } else {
        $historySql = "
            SELECT
                pr.id,
                pr.boarded_at,
                pr.departed_at,
                pr.status,
                pr.route,
                b.code AS bus_code
            FROM passenger_rides pr
            JOIN busses b ON pr.bus_id = b.Bus_ID
            WHERE pr.user_id = ?
            ORDER BY pr.boarded_at DESC
        ";
    }
    $st = $conn->prepare($historySql);
    $st->bind_param("i", $userId);
    $st->execute();
    $history = $st->get_result()->fetch_all(MYSQLI_ASSOC);

    return ['success' => true, 'history' => $history];
}

/** Check if passenger is currently on a ride and if that ride is still active */
function checkActiveRide(): array {
    @session_start();
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        return ['success' => false, 'error' => 'Login required'];
    }

    $userId = (int)$_SESSION['user_id'];
    $conn = db();

    $activeStatuses = activeRideStatuses($conn);
    $activeStatusSql = implode(',', $activeStatuses);
    if (tableColumnExists($conn, 'passenger_rides', 'operation_id')) {
        $rideSql = "
            SELECT
                pr.id,
                pr.operation_id,
                bo.status AS operation_status,
                bo.bus_id,
                b.code AS bus_code
            FROM passenger_rides pr
            JOIN bus_operations bo ON pr.operation_id = bo.id
            JOIN busses b ON bo.bus_id = b.Bus_ID
            WHERE pr.user_id = ? AND pr.status IN ({$activeStatusSql})
            LIMIT 1
        ";
    } else {
        $rideSql = "
            SELECT
                pr.id,
                NULL AS operation_id,
                'active' AS operation_status,
                pr.bus_id,
                b.code AS bus_code
            FROM passenger_rides pr
            JOIN busses b ON pr.bus_id = b.Bus_ID
            WHERE pr.user_id = ? AND pr.status IN ({$activeStatusSql})
            LIMIT 1
        ";
    }
    $st = $conn->prepare($rideSql);
    $st->bind_param("i", $userId);
    $st->execute();
    $ride = $st->get_result()->fetch_assoc();

    if ($ride) {
        if ($ride['operation_status'] === 'completed') {
            $up = $conn->prepare("UPDATE passenger_rides SET departed_at = NOW(), status = 'completed' WHERE id = ?");
            $up->bind_param("i", $ride['id']);
            $up->execute();
            return ['success' => true, 'on_ride' => false];
        }
        return ['success' => true, 'on_ride' => true, 'ride' => $ride];
    }

    return ['success' => true, 'on_ride' => false];
}

/** Get bus fares for a specific route */
function getBusFares(): array {
    $route = $_GET['route'] ?? '';
    $conn = db();
    if ($route) {
        $stmt = $conn->prepare("SELECT * FROM bus_fares WHERE route_name = ?");
        $stmt->bind_param("s", $route);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    } else {
        $rows = $conn->query("SELECT * FROM bus_fares")->fetch_all(MYSQLI_ASSOC);
    }
    return ['success' => true, 'fares' => $rows];
}

/** Get bus schedule */
function getBusSchedule(): array {
    $conn = db();
    $rows = $conn->query("SELECT terminal_name, time_open, time_close, is_suspended, suspend_message FROM bus_schedule ORDER BY terminal_name ASC")->fetch_all(MYSQLI_ASSOC);
    return ['success' => true, 'schedule' => $rows];
}

/** Get bus stops */
function getBusStops(): array {
    $conn = db();
    $rows = $conn->query("SELECT * FROM bus_stops WHERE is_active = 1")->fetch_all(MYSQLI_ASSOC);
    return ['success' => true, 'stops' => $rows];
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
        case 'get_bus_fares':             $response = getBusFares(); break;
        case 'get_bus_schedule':          $response = getBusSchedule(); break;
        case 'get_bus_stops':             $response = getBusStops(); break;
        default:
            http_response_code(400);
            $response = ['success' => false, 'error' => 'Invalid action'];
    }
    echo json_encode($response);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
