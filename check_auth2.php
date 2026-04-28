<?php
$dirs = [
    'c:/xampp/htdocs/ByaHero-Prototype-V3/public/driver',
    'c:/xampp/htdocs/ByaHero-Prototype-V3/public/conductor',
    'c:/xampp/htdocs/ByaHero-Prototype-V3/public/ADMIN'
];

$missing = [];

foreach ($dirs as $d) {
    if (!is_dir($d)) continue;
    $dir = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($d));
    foreach ($dir as $file) {
        if ($file->isFile() && $file->getExtension() === 'php') {
            $c = file_get_contents($file->getPathname());
            // Most pages either check `user_id` or check `admin_id` or similar
            if (strpos($c, '$_SESSION[\'user_id\']') === false && 
                strpos($c, '$_SESSION["user_id"]') === false &&
                strpos($c, 'isset($_SESSION[\'admin_') === false) {
                
                // Skip endpoints
                if (strpos($file->getFilename(), 'api') !== false) continue;
                if (strpos($file->getFilename(), 'debug') !== false) continue;

                $missing[] = $file->getPathname();
            }
        }
    }
}

echo json_encode($missing, JSON_PRETTY_PRINT);
?>
