<?php
declare(strict_types=1);

// Server-Sent Events endpoint that streams bus list whenever it changes.
// Uses short polling on the server-side to detect DB/file changes and push them to connected clients.

require __DIR__ . '/../../config/db.php';

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');

// keep the script running as long as the client is connected
set_time_limit(0);
ignore_user_abort(false);

// helper: load geojson file for bus id (copied from api.php)
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
    if (!empty($geojson['type']) && $geojson['type'] === 'FeatureCollection' && !empty($geojson['features']) && is_array($geojson['features'])) {
        $f = $geojson['features'][0];
        if (isset($f['properties']) && is_array($f['properties'])) {
            return extractFriendlyNameFromGeojson(['properties' => $f['properties']]);
        }
    }
    return null;
}

function fetchBuses(): array {
    $pdo = db();
    $stmt = $pdo->query("SELECT Bus_ID, code, route, current_location AS current_location_name, total_seats, seat_availability, status, updated FROM busses ORDER BY code");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $out = [];
    foreach ($rows as $r) {
        $busId = isset($r['Bus_ID']) ? (int)$r['Bus_ID'] : (int)($r['id'] ?? 0);
        $geo = loadGeojsonFileForBus($busId);
        if ($geo !== null) {
            $r['current_location'] = json_encode($geo, JSON_UNESCAPED_SLASHES);
            $friendly = extractFriendlyNameFromGeojson($geo);
            if ($friendly) $r['current_location_name'] = $friendly;
        } else {
            $r['current_location'] = null;
        }

        if (isset($r['seat_availability']) && (int)$r['seat_availability'] < 0) {
            $r['seat_availability'] = 0;
        }

        $out[] = $r;
    }
    return $out;
}

// disable output buffering
while (ob_get_level() > 0) ob_end_flush();

$lastHash = null;
$clientDisconnected = false;

// initial push immediately if any data
if (connection_aborted()) {
    exit;
}

// Main loop: poll DB/files and push when changed. Short sleep to keep latency low.
while (!connection_aborted()) {
    try {
        $buses = fetchBuses();
        $payload = json_encode(['success' => true, 'buses' => $buses]);
        $hash = md5($payload);
        if ($hash !== $lastHash) {
            // send SSE event
            echo "data: {$payload}\n\n";
            // flush
            @ob_flush();
            @flush();
            $lastHash = $hash;
        }
    } catch (Throwable $e) {
        // send an error event and continue
        $err = json_encode(['success' => false, 'error' => $e->getMessage()]);
        echo "data: {$err}\n\n";
        @ob_flush(); @flush();
    }

    // short sleep to reduce CPU while keeping latency low
    usleep(400000); // 400ms
}

// when client disconnects, exit
exit;
