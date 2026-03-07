<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

session_start();
$currentUserId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if ($input === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit;
}
if (empty($input['bus_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing bus_id']);
    exit;
}

$busId = (int)$input['bus_id'];

$pdo = db();

// Optional safety: ensure this user is allowed to update this bus
if ($currentUserId > 0) {
    $stCheck = $pdo->prepare("
        SELECT current_conductor_id
        FROM busses
        WHERE Bus_ID = ?
        LIMIT 1
    ");
    $stCheck->execute([$busId]);
    $rowCheck = $stCheck->fetch(PDO::FETCH_ASSOC);

    if ($rowCheck && $rowCheck['current_conductor_id'] !== null && (int)$rowCheck['current_conductor_id'] !== $currentUserId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You are not assigned to this bus']);
        exit;
    }
}

// Build geojson (accept geojson or lat/lng)
$geojson = null;
if (!empty($input['geojson']) && is_array($input['geojson'])) {
    $geojson = $input['geojson'];
} elseif (isset($input['lat'], $input['lng'])) {
    $lat = filter_var($input['lat'], FILTER_VALIDATE_FLOAT);
    $lng = filter_var($input['lng'], FILTER_VALIDATE_FLOAT);
    if ($lat === false || $lng === false) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid lat/lng']);
        exit;
    }
    $geojson = [
        'type' => 'Feature',
        'geometry' => ['type' => 'Point', 'coordinates' => [$lng, $lat]],
        'properties' => ['timestamp' => gmdate('c')]
    ];
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No geojson or lat/lng provided']);
    exit;
}

// Prefer friendly name from geojson properties if present
$locationName = null;
if (!empty($geojson['properties']) && is_array($geojson['properties'])) {
    $p = $geojson['properties'];
    if (!empty($p['current_location_name'])) $locationName = trim($p['current_location_name']);
    elseif (!empty($p['Current Location'])) $locationName = trim($p['Current Location']);
    elseif (!empty($p['name'])) $locationName = trim($p['name']);
    else {
        foreach ($p as $k => $v) {
            if (is_string($v) && trim($v) !== '') { $locationName = trim($v); break; }
            if ($v === '') { $locationName = $k; break; }
        }
    }
}

// If the caller provided a separate friendly name, prefer it
if (!empty($input['current_location_name']) && is_string($input['current_location_name'])) {
    $locationName = trim($input['current_location_name']);
}

// Ensure properties include friendly name for file compatibility
if (!isset($geojson['properties']) || !is_array($geojson['properties'])) $geojson['properties'] = [];
if (!empty($locationName)) {
    $geojson['properties']['current_location_name'] = $locationName;
    $geojson['properties']['Current Location'] = $locationName;
}

// Save file (full geojson) — write atomically (tmp + rename)
$dir = __DIR__ . '/../data/current_locations';
if (!is_dir($dir)) @mkdir($dir, 0755, true);
$file = $dir . "/bus_{$busId}.geojson";
$data = json_encode($geojson, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
$tmp = $file . '.tmp';
@file_put_contents($tmp, $data, LOCK_EX);
@rename($tmp, $file);

// Update DB: store friendly name into current_location column (no DB schema change)
$fields = [];
$params = [];

$fields[] = 'current_location = ?';
$params[] = $locationName !== null ? $locationName : null;

if (isset($input['route'])) {
    $fields[] = 'route = ?';
    $params[] = $input['route'];
}
if (isset($input['seats_available'])) {
    $sa = filter_var($input['seats_available'], FILTER_VALIDATE_INT);
    if ($sa !== false) {
        $fields[] = 'seat_availability = ?';
        $params[] = $sa;
    }
}
if (isset($input['status'])) {
    $allowed = ['available','on_stop','full','unavailable'];
    if (in_array($input['status'], $allowed, true)) {
        $fields[] = 'status = ?';
        $params[] = $input['status'];
    }
}

$fields[] = 'updated = CURRENT_TIMESTAMP';
$params[] = $busId;

$sql = "UPDATE busses SET " . implode(', ', $fields) . " WHERE Bus_ID = ?";
$st = $pdo->prepare($sql);
$st->execute($params);

echo json_encode([
    'success' => true,
    'message' => 'GeoJSON saved and DB updated',
    'current_location_name' => $locationName
]);