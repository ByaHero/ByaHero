# fix_performance.ps1
# Additional performance optimizations for ByaHero
# Fixes: defer scripts, add preconnect for unpkg, switch unpkg→jsdelivr, update service worker
# Run from project root: powershell -ExecutionPolicy Bypass -File scratch/fix_performance.ps1

$root = "c:\xampp\htdocs\ByaHero-Prototype-V3"
$files = Get-ChildItem -Recurse -Include *.php -Path "$root\public","$root\components" | Where-Object { $_.Length -gt 500 }

$changedCount = 0

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content

    # =========================================================================
    # FIX 1: Switch Leaflet from unpkg.com to cdn.jsdelivr.net (faster CDN)
    # =========================================================================
    $content = $content -replace `
        'https://unpkg\.com/leaflet@1\.9\.4/dist/leaflet\.css', `
        'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'
    $content = $content -replace `
        'https://unpkg\.com/leaflet@1\.9\.4/dist/leaflet\.js', `
        'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'

    # =========================================================================
    # FIX 2: Add defer to render-blocking script tags (Bootstrap, Leaflet, etc.)
    # Scripts at end of body should use defer so parsing isn't blocked
    # =========================================================================

    # Add defer to Bootstrap JS (it's always at bottom of body anyway)
    $content = $content -replace `
        '<script src="https://cdn\.jsdelivr\.net/npm/bootstrap@([^"]+)/dist/js/bootstrap\.bundle\.min\.js"></script>', `
        '<script src="https://cdn.jsdelivr.net/npm/bootstrap@$1/dist/js/bootstrap.bundle.min.js" defer></script>'
    
    # Add defer to Leaflet JS
    $content = $content -replace `
        '<script src="https://cdn\.jsdelivr\.net/npm/leaflet@([^"]+)/dist/leaflet\.js"></script>', `
        '<script src="https://cdn.jsdelivr.net/npm/leaflet@$1/dist/leaflet.js" defer></script>'

    # Add defer to Chart.js
    $content = $content -replace `
        '<script src="https://cdn\.jsdelivr\.net/npm/chart\.js@([^"]+)/dist/chart\.umd\.min\.js"></script>', `
        '<script src="https://cdn.jsdelivr.net/npm/chart.js@$1/dist/chart.umd.min.js" defer></script>'

    # Add defer to SortableJS
    $content = $content -replace `
        '<script src="https://cdn\.jsdelivr\.net/npm/sortablejs@([^"]+)/Sortable\.min\.js"></script>', `
        '<script src="https://cdn.jsdelivr.net/npm/sortablejs@$1/Sortable.min.js" defer></script>'

    # Add defer to html5-qrcode
    $content = $content -replace `
        '<script src="https://unpkg\.com/html5-qrcode"></script>', `
        '<script src="https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js" defer></script>'

    # =========================================================================
    # FIX 3: Add preconnect for unpkg.com if still referenced
    # =========================================================================
    if ($content -match 'unpkg\.com' -and $content -notmatch 'preconnect.*unpkg\.com') {
        $content = $content -replace '(rel="preconnect" href="https://cdn\.jsdelivr\.net" crossorigin>)', `
            '$1
    <link rel="preconnect" href="https://unpkg.com" crossorigin>'
    }

    # =========================================================================
    # Write changes if modified
    # =========================================================================
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        $changedCount++
        $relativePath = $file.FullName.Substring($root.Length + 1)
        Write-Host "  FIXED: $relativePath" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Done! Fixed $changedCount files." -ForegroundColor Cyan
