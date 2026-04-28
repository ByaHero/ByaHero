<?php

$filesToSecure = [
    'busInfo/busInfo.php',
    'lostAndFound/lostAndFound.php',
    'passengerSettings/about.php',
    'passengerSettings/chatSupport.php',
    'passengerSettings/privacyPolicy.php',
    'passengerSettings/share.php',
    'passengerSettings/termsOfService.php',
    'safety/addNewContact.php',
    'safety/safety.php',
    'showGuide/showGuide.php',
    'busStops.php' // directly in passenger
];

$authBlock = <<<PHP

/**
 * SECURE SYSTEM:
 * Require login before accessing to prevent URL manipulation.
 */
if (!isset(\$_SESSION['user_id'])) {
    \$r = \$_SERVER['SCRIPT_NAME'] ?? '';
    \$p = rtrim(str_replace('\\\\', '/', dirname(\$r)), '/');
    \$b = preg_replace('~/public/.*$~', '', \$p) ?: '';
    header('Location: ' . \$b . '/public/login.php', true, 302);
    exit;
}

PHP;

$baseDir = __DIR__ . '/public/passenger/';

foreach ($filesToSecure as $file) {
    if (file_exists($baseDir . $file)) {
        $content = file_get_contents($baseDir . $file);
        
        // Don't re-inject if already secured
        if (strpos($content, 'SECURE SYSTEM:') !== false || strpos($content, 'Location:') !== false) {
            echo "Skipping $file (Already secured)\n";
            continue;
        }

        // Try replacing immediately after standard session_start()
        if (strpos($content, 'session_start();') !== false) {
            $content = str_replace('session_start();', "session_start();\n" . $authBlock, $content);
            file_put_contents($baseDir . $file, $content);
            echo "Secured $file\n";
        } else if (preg_match('/<\?php\s+/', $content)) {
            // No session start? Add it and the auth block
            $content = preg_replace('/(<\?php\s+)/', "$1session_start();\n" . $authBlock, $content, 1);
            file_put_contents($baseDir . $file, $content);
            echo "Secured $file (Added session start)\n";
        } else {
            echo "Failed to secure $file\n";
        }
    }
}
?>
