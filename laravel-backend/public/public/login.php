<?php
// ByaHero Google Sign-In Redirect Bridge
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Authenticating ByaHero...</title>
</head>
<body style="background-color: #0f172a; color: #ffffff; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
    <div style="text-align: center;">
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Authenticating with Google...</h2>
        <p style="font-size: 0.875rem; color: #94a3b8;">Please wait while we return you to ByaHero app.</p>
    </div>
    <script>
        (function() {
            try {
                const searchParams = new URLSearchParams(window.location.search);
                let hashStr = window.location.hash || '';
                if (hashStr.startsWith('#')) hashStr = hashStr.substring(1);
                const hashParams = new URLSearchParams(hashStr);

                const idToken = hashParams.get('id_token') || searchParams.get('id_token') || 
                                hashParams.get('credential') || searchParams.get('credential') ||
                                hashParams.get('access_token') || searchParams.get('access_token');
                
                const error = hashParams.get('error') || searchParams.get('error');

                // Get appRedirect from state (already decoded by URLSearchParams)
                let appRedirect = hashParams.get('state') || searchParams.get('state');
                if (!appRedirect) {
                    appRedirect = 'byaheromobile://';
                }

                if (idToken || error) {
                    const separator = appRedirect.includes('?') ? '&' : '?';
                    let finalUrl = appRedirect;
                    if (idToken) {
                        finalUrl += separator + 'id_token=' + encodeURIComponent(idToken);
                    } else if (error) {
                        finalUrl += separator + 'error=' + encodeURIComponent(error);
                    }
                    window.location.replace(finalUrl);
                } else if (window.location.hash || window.location.search) {
                    // Fallback pass-through fragment
                    const rawFragment = (window.location.hash || window.location.search).replace(/^[#?]/, '');
                    const separator = appRedirect.includes('?') ? '&' : '?';
                    window.location.replace(appRedirect + separator + rawFragment);
                }
            } catch (err) {
                console.error('Redirect Bridge Error:', err);
            }
        })();
    </script>
</body>
</html>

