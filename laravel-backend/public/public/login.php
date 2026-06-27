<?php
// ByaHero Google Sign-In Redirect Bridge
?>
<script>
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
