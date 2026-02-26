<?php
header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Database connection
try {
    $pdo = new PDO("mysql:host=localhost;dbname=byahero", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit;
}

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);

$origin = isset($input['origin']) ? (int)$input['origin'] : 0;
$destination = isset($input['destination']) ? (int)$input['destination'] : 0;
$fareType = isset($input['fareType']) ? $input['fareType'] : 'regular';

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
    // First, try to find direct route
    $sql = "SELECT 
                regular_fare,
                discounted_fare
            FROM bus_fares
            WHERE origin_stop_id = :origin 
            AND destination_stop_id = :destination
            LIMIT 1";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':origin' => $origin,
        ':destination' => $destination
    ]);
    
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // If direct route found, return it
    if ($result) {
        $fare = ($fareType === 'discounted') ? $result['discounted_fare'] : $result['regular_fare'];
        
        echo json_encode([
            'success' => true,
            'fare' => $fare,
            'regular_fare' => $result['regular_fare'],
            'discounted_fare' => $result['discounted_fare']
        ]);
        exit;
    }
    
    // If no direct route, calculate based on km distance
    // Get km_marker for both stops
    $sql = "SELECT stop_id, km_marker, location_name FROM bus_stops WHERE stop_id IN (:origin, :destination)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':origin' => $origin,
        ':destination' => $destination
    ]);
    $stops = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($stops) !== 2) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid stops selected'
        ]);
        exit;
    }
    
    // Calculate distance
    $originData = null;
    $destData = null;
    foreach ($stops as $stop) {
        if ($stop['stop_id'] == $origin) {
            $originData = $stop;
        } else {
            $destData = $stop;
        }
    }
    
    $distance = abs($originData['km_marker'] - $destData['km_marker']);
    
    // Calculate fare based on distance
    // Base fare formula (you can adjust this based on your fare matrix)
    // Looking at the pattern: starts at 14.00 for 1-4km, then increases
    
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
        // For distance > 8km, use formula
        // Pattern shows approximately 2.25 increase per km for regular
        $regularFare = 14.00 + (($distance - 1) * 2.25);
        $discountedFare = $regularFare * 0.80; // 20% discount
        
        // Round to nearest 0.25
        $regularFare = round($regularFare * 4) / 4;
        $discountedFare = round($discountedFare * 4) / 4;
    }
    
    $fare = ($fareType === 'discounted') ? $discountedFare : $regularFare;
    
    echo json_encode([
        'success' => true,
        'fare' => number_format($fare, 2, '.', ''),
        'regular_fare' => number_format($regularFare, 2, '.', ''),
        'discounted_fare' => number_format($discountedFare, 2, '.', ''),
        'distance_km' => $distance,
        'calculated' => true // Flag to show this was calculated, not from database
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>