<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require __DIR__ . '/../config/db.php';

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

/** API actions **/
function getBuses(): array {
    $pdo = db();
    // Select DB fields (current_location stores friendly name string)
    $stmt = $pdo->query("
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
        ORDER BY code
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $out = [];
    foreach ($rows as $r) {
        $busId = isset($r['Bus_ID']) ? (int)$r['Bus_ID'] : (int)($r['id'] ?? 0);
        // try to load geojson file for coordinates
        $geo = loadGeojsonFileForBus($busId);
        if ($geo !== null) {
            // current_location should be returned as JSON string to keep compatibility
            $r['current_location'] = json_encode($geo, JSON_UNESCAPED_SLASHES);
            // derive friendly name from geo file if present, else fallback to DB value
            $friendly = extractFriendlyNameFromGeojson($geo);
            if ($friendly) $r['current_location_name'] = $friendly;
        } else {
            // no file: try to leave current_location as null and current_location_name from DB as-is
            $r['current_location'] = null;
            // r['current_location_name'] is already the DB string (selected above)
        }
        $out[] = $r;
    }

    return ['success' => true, 'buses' => $out];
}

/**
 * Update bus location and details.
 * Accepts geojson or lat/lng. Stores friendly name in DB.current_location and writes full GeoJSON to file.
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

    // Prefer friendly name from geojson properties, else try server resolution or provided field
    $locationName = extractFriendlyNameFromGeojson($geojson);
    if (empty($locationName) && !empty($data['current_location_name'])) {
        $locationName = trim($data['current_location_name']);
    }

    // Allow server-side resolution (optional) — if not present, leave as null
    // (If you want server polygon-resolve, could call debug_resolve or map_data polygons)
    // For now prefer provided properties.

    // Save geojson file for coordinates (keep full GeoJSON) — write atomically (tmp + rename)
    $dir = __DIR__ . '/../data/current_locations';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $file = $dir . "/bus_{$busId}.geojson";
    $data = json_encode($geojson, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
    $tmp = $file . '.tmp';
    @file_put_contents($tmp, $data, LOCK_EX);
    @rename($tmp, $file);

    // Update DB: store friendly name string in current_location column (no schema change)
    $pdo = db();

    $fields = [];
    $params = [];

    // Store friendly name (string) in current_location column
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
 * Stop tracking for a bus, clearing all relevant fields and removing GeoJSON file.
 */
function stopTracking(): array {
    $data = json_decode(file_get_contents('php://input'), true);
    if ($data === null) {
        http_response_code(400);
        return ['success' => false, 'error' => 'Invalid JSON'];
    }
    if (!isset($data['bus_id'])) {
        return ['success' => false, 'error' => 'Missing bus_id'];
    }

    $pdo = db();
    $stmt = $pdo->prepare("
        UPDATE busses
        SET 
            current_location = NULL,
            status = 'unavailable',
            route = NULL,
            seat_availability = NULL,
            updated = NULL
        WHERE Bus_ID = ?
    ");
    $stmt->execute([(int)$data['bus_id']]);

    // remove file as well
    $file = __DIR__ . '/../data/current_locations/bus_' . ((int)$data['bus_id']) . '.geojson';
    if (is_file($file)) @unlink($file);

    return ['success' => true, 'message' => 'Stopped tracking for bus'];
}

// Dispatch
$action = $_GET['action'] ?? $_POST['action'] ?? 'get_buses';
try {
    switch ($action) {
        case 'get_buses':
            $response = getBuses();
            break;
        case 'update_location':
            $response = updateLocation();
            break;
        case 'stop_tracking':
            $response = stopTracking();
            break;
        default:
            http_response_code(400);
            $response = ['success' => false, 'error' => 'Invalid action'];
    }
    echo json_encode($response);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}