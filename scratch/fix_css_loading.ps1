# fix_css_loading.ps1
# Fixes slow CSS loading caused by render-blocking Google Fonts and missing optimizations
# Run from project root: powershell -ExecutionPolicy Bypass -File scratch/fix_css_loading.ps1

$root = "c:\xampp\htdocs\ByaHero-Prototype-V3"
$files = Get-ChildItem -Recurse -Include *.php -Path "$root\public","$root\components" | Where-Object { $_.Length -gt 500 }

$changedCount = 0

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content

    # =========================================================================
    # FIX 1: Add &display=swap to ALL Google Fonts links that don't have it
    # =========================================================================
    
    # Pattern: fonts.googleapis.com/css2?... WITHOUT &display=swap already
    # We add &display=swap before the closing quote
    
    # For links using css2? format (Material Symbols, Poppins, Inter, Outfit etc.)
    # Match: href="https://fonts.googleapis.com/css2?family=..." that DON'T already contain display=swap
    $content = [regex]::Replace($content, 
        '(href="https://fonts\.googleapis\.com/css2\?family=[^"]*?)(")',
        {
            param($m)
            if ($m.Groups[1].Value -match 'display=swap') {
                return $m.Value  # Already has display=swap
            } else {
                return $m.Groups[1].Value + '&display=swap' + $m.Groups[2].Value
            }
        })
    
    # For old-style icon? format (Material Icons Round) - convert to css2? with display=swap
    $content = $content -replace `
        'href="https://fonts\.googleapis\.com/icon\?family=Material\+Icons\+Round"', `
        'href="https://fonts.googleapis.com/css2?family=Material+Icons+Round&display=swap"'

    # =========================================================================
    # FIX 2: Replace bloated Material Symbols variable font with optimized subset
    # =========================================================================
    
    # Replace the full variable axes version with a slimmed-down version
    # Full: opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200 (~300KB+)
    # Optimized: opsz,wght,FILL,GRAD@24,400,1,0 (~45KB)
    $content = $content -replace `
        'family=Material\+Symbols\+Rounded:opsz,wght,FILL,GRAD@20\.\.48,100\.\.700,0\.\.1,-50\.\.200', `
        'family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0'
    
    # Also replace the bare version (no axes specified, downloads everything ~500KB)
    # Match: family=Material+Symbols+Rounded" (with no colon/params after)
    $content = [regex]::Replace($content,
        'family=Material\+Symbols\+Rounded([&"])',
        'family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0$1')

    # =========================================================================
    # FIX 3: Add preconnect hints after <head> if not already present
    # =========================================================================
    
    # Only add to files that have a <head> tag and use external CSS
    if ($content -match '<head>' -and $content -match 'fonts\.googleapis\.com|cdn\.jsdelivr\.net') {
        
        $preconnect = @"

    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
"@
        
        if ($content -notmatch 'rel="preconnect"') {
            # Insert after the first <meta> tag following <head>
            # Find the position after <head> and insert preconnect hints
            $content = [regex]::Replace($content,
                '(<head>[\s\S]*?<meta[^>]*>)',
                ('$1' + $preconnect),
                [System.Text.RegularExpressions.RegexOptions]::None)
        }
    }

    # =========================================================================
    # FIX 4: Convert render-blocking font links to non-blocking using media="print" swap
    # This is the KEY fix for slow CSS - fonts load async and swap in when ready
    # =========================================================================
    
    # For Google Fonts CSS links (not Bootstrap or Leaflet)
    # Convert: <link href="https://fonts.googleapis.com/..." rel="stylesheet">
    # To:      <link href="https://fonts.googleapis.com/..." rel="stylesheet" media="print" onload="this.media='all'">
    
    $content = [regex]::Replace($content,
        '(<link\s+(?:href|rel)=[^>]*fonts\.googleapis\.com[^>]*)(rel="stylesheet")\s*(/?>)',
        {
            param($m)
            $full = $m.Value
            # Don't modify if already has media="print" or onload
            if ($full -match 'media="print"' -or $full -match 'onload=') {
                return $full
            }
            # Replace rel="stylesheet" with the non-blocking version
            return $full -replace 'rel="stylesheet"(\s*/?>)', 'rel="stylesheet" media="print" onload="this.media=''all''"$1'
        })
    
    # Handle the alternate format where rel comes before href
    $content = [regex]::Replace($content,
        '(<link\s+rel="stylesheet"\s+href="https://fonts\.googleapis\.com[^>]*?)(/?>)',
        {
            param($m)
            $full = $m.Value
            if ($full -match 'media="print"' -or $full -match 'onload=') {
                return $full
            }
            return $m.Groups[1].Value + ' media="print" onload="this.media=''all''"' + $m.Groups[2].Value
        })

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
