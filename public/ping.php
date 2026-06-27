<?php
declare(strict_types=1);

// This script is called by the client application on startup to wake up 
// the Alwaysdata server and ensure the database connection is initialized.
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // Calling db() initializes the connection and performs standard checks.
    $conn = db();
    
    // Perform a lightweight query to ensure the database server is active and responding
    $result = $conn->query("SELECT 1");
    if ($result) {
        echo json_encode([
            'success' => true,
            'status' => 'online',
            'message' => 'ByaHero server and database are active and fully warmed up.'
        ]);
        $result->free();
    } else {
        throw new Exception("Ping query returned no response");
    }
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'message' => 'Failed to initialize database: ' . $e->getMessage()
    ]);
}
