<?php
/**
 * Serve combined route GeoJSON features used by conductor and other clients.
 * It reads .geojson files from:
 *  - public/routes/*.geojson
 *  - ../data/routes/*.geojson
 *
 * Returns: FeatureCollection
 */
declare(strict_types=1);

header('Content-Type: application/json');

$files = [];

// public/routes
$publicRoutes = __DIR__ . '/routes';
if (is_dir($publicRoutes)) {
    foreach (glob($publicRoutes . '/*.geojson') as $f) $files[] = $f;
}

// data/routes (project data folder)
$dataRoutes = __DIR__ . '/../data/routes';
if (is_dir($dataRoutes)) {
    foreach (glob($dataRoutes . '/*.geojson') as $f) $files[] = $f;
}

$features = [];
foreach ($files as $file) {
    $txt = @file_get_contents($file);
    if ($txt === false) continue;
    $json = json_decode($txt, true);
    if (!$json) continue;
    if (isset($json['type']) && $json['type'] === 'FeatureCollection' && !empty($json['features']) && is_array($json['features'])) {
        foreach ($json['features'] as $f) $features[] = $f;
    } elseif (isset($json['type']) && $json['type'] === 'Feature') {
        $features[] = $json;
    } elseif (isset($json[0]) && is_array($json)) {
        // sometimes file may be an array of features
        foreach ($json as $f) if (isset($f['type']) && $f['type'] === 'Feature') $features[] = $f;
    }
}

echo json_encode(['type' => 'FeatureCollection', 'features' => $features], JSON_UNESCAPED_SLASHES);