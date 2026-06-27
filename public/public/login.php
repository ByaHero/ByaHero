<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
    <script>
        // Intercept hash fragment tokens from Google Sign-In and deep-link back to the mobile app
        if (window.location.hash) {
            const hash = window.location.hash;
            if (hash.includes('access_token=') || hash.includes('id_token=') || hash.includes('credential=')) {
                const queryStr = hash.startsWith('#') ? hash.substring(1) : hash;
                window.location.replace('byaheromobile://?' + queryStr);
            }
        }
    </script>
</head>
<body>
<?php
require_once __DIR__ . '/../login.php';
?>
</body>
</html>
