<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
    <script>
        // Intercept hash fragment tokens from Google Sign-In and deep-link back to the mobile app
        if (window.location.hash) {
            const hash = window.location.hash;
            const fragment = hash.startsWith('#') ? hash.substring(1) : hash;
            const params = new URLSearchParams(fragment);
            const tokenKeys = ['access_token', 'id_token', 'credential'];
            const hasToken = tokenKeys.some(key => params.has(key));
            
            if (hasToken) {
                let appRedirect = params.get('state');
                if (appRedirect) {
                    appRedirect = decodeURIComponent(appRedirect);
                } else {
                    appRedirect = 'byaheromobile://';
                }
                const separator = appRedirect.includes('?') ? '&' : '?';
                window.location.replace(appRedirect + separator + fragment);
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
