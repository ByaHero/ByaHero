<?php
header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Use PDO-only connection helper
require_once __DIR__ . '/../../../config/db.php';

try {
    $conn = db();
} catch (Throwable $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit;
}

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);

$origin = isset($input['origin']) ? (int) $input['origin'] : 0;
$destination = isset($input['destination']) ? (int) $input['destination'] : 0;
$fareType = isset($input['fareType']) ? (string) $input['fareType'] : 'regular';

// Validate inputs
if ($origin === 0 || $destination === 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid locations selected'
    ]);
    exit;
}

if ($origin === $destination) {
    echo json_encode([
        'success' => false,
        'message' => 'Origin and destination cannot be the same'
    ]);
    exit;
}

try {
    // 1) Try to find direct route from bus_fares
    $sql = "SELECT regular_fare, discounted_fare
            FROM bus_fares
            WHERE origin_stop_id = ?
              AND destination_stop_id = ?
            LIMIT 1";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $origin, $destination);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();

    if ($result) {
        $fare = ($fareType === 'discounted') ? (float) $result['discounted_fare'] : (float) $result['regular_fare'];

        echo json_encode([
            'success' => true,
            'fare' => number_format($fare, 2, '.', ''),
            'regular_fare' => number_format((float) $result['regular_fare'], 2, '.', ''),
            'discounted_fare' => number_format((float) $result['discounted_fare'], 2, '.', ''),
            'calculated' => false
        ]);
        exit;
    }

    // 2) If no direct route, compute by km distance from bus_stops
    $sql = "SELECT stop_id, km_marker, location_name
            FROM bus_stops
            WHERE stop_id = ? OR stop_id = ?";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $origin, $destination);
    $stmt->execute();
    $stops = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    if (count($stops) !== 2) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid stops selected'
        ]);
        exit;
    }

    // Identify origin and destination stop rows
    $originData = null;
    $destData = null;

    foreach ($stops as $stop) {
        if ((int) $stop['stop_id'] === $origin) {
            $originData = $stop;
        } elseif ((int) $stop['stop_id'] === $destination) {
            $destData = $stop;
        }
    }

    if (!$originData || !$destData) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid stops selected'
        ]);
        exit;
    }

    $distance = abs((float) $originData['km_marker'] - (float) $destData['km_marker']);

    // Fare rules
    if ($distance <= 4) {
        $regularFare = 14.00;
        $discountedFare = 11.25;
    } elseif ($distance == 5) {
        $regularFare = 16.25;
        $discountedFare = 13.00;
    } elseif ($distance == 6) {
        $regularFare = 18.50;
        $discountedFare = 14.75;
    } elseif ($distance == 7) {
        $regularFare = 20.50;
        $discountedFare = 16.50;
    } elseif ($distance == 8) {
        $regularFare = 22.75;
        $discountedFare = 18.25;
    } else {
        $regularFare = 14.00 + (($distance - 1) * 2.25);
        $discountedFare = $regularFare * 0.80;

        // Round to nearest 0.25
        $regularFare = round($regularFare * 4) / 4;
        $discountedFare = round($discountedFare * 4) / 4;
    }

    $fare = ($fareType === 'discounted') ? $discountedFare : $regularFare;

    echo json_encode([
        'success' => true,
        'fare' => number_format((float) $fare, 2, '.', ''),
        'regular_fare' => number_format((float) $regularFare, 2, '.', ''),
        'discounted_fare' => number_format((float) $discountedFare, 2, '.', ''),
        'distance_km' => $distance,
        'calculated' => true
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}