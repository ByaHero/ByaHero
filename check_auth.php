<?php
$dir = new RecursiveIteratorIterator(new RecursiveDirectoryIterator('c:/xampp/htdocs/ByaHero-Prototype-V3/public/passenger'));
$filesMissingCheck = [];

foreach ($dir as $file) {
    if ($file->isFile() && $file->getExtension() === 'php') {
        $c = file_get_contents($file->getPathname());
        
        // Skip endpoint files or partials
        if (strpos($file->getFilename(), 'debug') !== false) continue;
        if (strpos($file->getFilename(), 'groupView.php') !== false) continue;
        if (strpos($file->getFilename(), 'getFare.php') !== false) continue;

        if (strpos($c, '$_SESSION[\'user_id\']') === false && strpos($c, '$_SESSION["user_id"]') === false) {
            $filesMissingCheck[] = $file->getPathname();
        }
    }
}

echo json_encode($filesMissingCheck, JSON_PRETTY_PRINT);
?>
