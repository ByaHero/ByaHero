<?php
header('Content-Type: text/plain');
error_reporting(E_ALL);
ini_set('display_errors', '1');

require_once __DIR__ . '/../config/db.php';
try {
    $c = db();
    echo "DB connected on live server!\n";
    
    // Check tables
    $res = $c->query("SHOW TABLES");
    echo "Tables:\n";
    while ($row = $res->fetch_row()) {
        echo "- " . $row[0] . "\n";
    }
    
    // Check columns of circle_members
    echo "\nColumns of circle_members:\n";
    $res = $c->query("DESCRIBE circle_members");
    while ($row = $res->fetch_assoc()) {
        print_r($row);
    }
    
    // Check circle_members count
    $res = $c->query("SELECT COUNT(*) FROM circle_members");
    $row = $res->fetch_row();
    echo "\ncircle_members count: " . $row[0] . "\n";
    
} catch (Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
?>
