<?php
/**
 * ByaHero Alwaysdata Fix Script
 * Deletes the corrupted 'public/js' file on the server and replaces it with a clean directory.
 */
declare(strict_types=1);

$dirPath = __DIR__ . '/js';

echo "<h3>ByaHero Deployment Directory Fixer</h3>";
echo "Checking path: <strong>" . htmlspecialchars($dirPath) . "</strong><br><br>";

if (file_exists($dirPath)) {
    if (!is_dir($dirPath)) {
        echo "⚠️ Found file at path. Attempting to delete...<br>";
        if (unlink($dirPath)) {
            echo "✅ Successfully deleted the file 'public/js'.<br>";
        } else {
            echo "❌ Failed to delete the file 'public/js'. Please check server file permissions or delete it manually via Alwaysdata File Manager.<br>";
        }
    } else {
        echo "✅ 'public/js' is already a directory. No action needed.<br>";
    }
} else {
    echo "ℹ️ No file or directory exists at 'public/js'.<br>";
}

// Try to create directory if not exists
if (!file_exists($dirPath)) {
    echo "Creating directory 'public/js'...<br>";
    if (mkdir($dirPath, 0755, true)) {
        echo "✅ Successfully created directory 'public/js'.<br>";
    } else {
        echo "❌ Failed to create directory 'public/js'.<br>";
    }
}
