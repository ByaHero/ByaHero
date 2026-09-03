/**
 * release.js - Dynamic GitHub Release Download Resolver
 * Fetches the latest published APK release from GitHub API and updates download buttons
 */
async function resolveLatestApkDownloadLink() {
    try {
        const res = await fetch('https://api.github.com/repos/ByaHero/ByaHero/releases');
        if (res.ok) {
            const releases = await res.json();
            for (const release of releases) {
                const assets = release.assets || [];
                const apkAsset = assets.find(a => a.name === 'byahero.apk' || (a.name && a.name.toLowerCase().includes('passenger')));
                if (apkAsset && apkAsset.browser_download_url) {
                    document.querySelectorAll('a[download]').forEach(el => {
                        if (el.href.includes('byahero.apk') || el.href.includes('releases/latest')) {
                            el.href = apkAsset.browser_download_url;
                        }
                    });
                    break;
                }
            }
        }
    } catch (err) {
        console.log('GitHub Release Link Resolution Skipped:', err);
    }
}
