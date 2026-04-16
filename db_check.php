<?php
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
require 'c:/xampp/htdocs/ByaHero-Prototype-V3/config/db.php';
$pdo = db();
$pdo->exec("ALTER TABLE busstopsterminal ADD COLUMN route varchar(100) DEFAULT NULL AFTER type;");
$pdo->exec("ALTER TABLE busstopsterminal ADD COLUMN sort_order int(11) DEFAULT 0 AFTER lng;");
echo "Migration complete";

print_r($stmt3->fetchAll(PDO::FETCH_ASSOC));
