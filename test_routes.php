<?php
include 'config/db.php';
$c = db();
$res = $c->query('SELECT route, COUNT(*) as count FROM busstopsterminal GROUP BY route');
while($row = $res->fetch_assoc()) {
    echo "Route: " . ($row['route'] ?: 'EMPTY') . " => " . $row['count'] . "\n";
}
