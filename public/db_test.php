<?php
// db_test.php — run in browser to verify db.php is found and DB/tables are accessible.
$possible = [
    __DIR__ . '/config/db.php',
    __DIR__ . '/../config/db.php',
    __DIR__ . '/../../config/db.php',
];

$loaded = false;
foreach ($possible as $p) {
    if (file_exists($p)) {
        require_once $p;
        echo "Loaded config from: {$p}<br>";
        $loaded = true;
        break;
    }
}

if (!$loaded) {
    http_response_code(500);
    echo "db.php not found. Checked:<br><ul>";
    foreach ($possible as $p) {
        echo "<li>" . htmlspecialchars($p) . "</li>";
    }
    echo "</ul>";
    exit;
}

try {
    $pdo = db();
    echo "DB OK. Server version: " . $pdo->getAttribute(PDO::ATTR_SERVER_VERSION) . "<br>";

    // Show users columns (if table exists)
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `users`");
        $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "<h4>`users` table columns:</h4><pre>" . htmlspecialchars(print_r($cols, true)) . "</pre>";
    } catch (Throwable $e) {
        echo "<strong>`users` table not found or error getting columns:</strong> " . htmlspecialchars($e->getMessage());
    }

} catch (Throwable $e) {
    echo "ERROR connecting to DB: " . htmlspecialchars($e->getMessage()) . "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
}