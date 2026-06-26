<?php
require 'config/db.php';
$c = db();

// Fetch live stops from alwaysdata
$liveDataJson = file_get_contents('https://byahero.alwaysdata.net/public/api.php?action=get_bus_stops_terminal');
$liveData = json_decode($liveDataJson, true);

if (!$liveData || !isset($liveData['data'])) {
    die("Error fetching live stops data from alwaysdata server.\n");
}

// Truncate local table
$c->query("TRUNCATE TABLE busstopsterminal");

// Seed local table
$stmt = $c->prepare("INSERT INTO busstopsterminal (id, name, type, route, location_name, location_landmark, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

foreach ($liveData['data'] as $stop) {
    $id = (int)$stop['id'];
    $name = $stop['name'];
    $type = $stop['type'];
    $route = $stop['route'];
    $locName = $stop['location_name'];
    $locLandmark = $stop['location_landmark'];
    $lat = $stop['lat'];
    $lng = $stop['lng'];

    $stmt->bind_param("isssssdd", $id, $name, $type, $route, $locName, $locLandmark, $lat, $lng);
    $stmt->execute();
}

$stmt->close();
echo "Successfully synchronized " . count($liveData['data']) . " bus stops from alwaysdata to local database!\n";
