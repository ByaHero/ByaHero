# revert_defer.ps1
# Removes defer from scripts that have inline code depending on them

$root = "c:\xampp\htdocs\ByaHero-Prototype-V3"
$files = Get-ChildItem -Recurse -Include *.php -Path "$root\public","$root\components" | Where-Object { $_.Length -gt 500 }

$count = 0

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content

    # Remove defer from Leaflet (inline scripts call L.map() immediately)
    $content = $content -replace 'leaflet\.js" defer>', 'leaflet.js">'
    $content = $content -replace 'leaflet@1\.9\.3/dist/leaflet\.js" defer>', 'leaflet@1.9.3/dist/leaflet.js">'
    
    # Remove defer from Bootstrap (inline scripts use bootstrap.Modal etc.)
    $content = $content -replace 'bootstrap\.bundle\.min\.js" defer>', 'bootstrap.bundle.min.js">'
    
    # Remove defer from Chart.js (inline scripts use Chart constructor)
    $content = $content -replace 'chart\.umd\.min\.js" defer>', 'chart.umd.min.js">'
    
    # Remove defer from SortableJS
    $content = $content -replace 'Sortable\.min\.js" defer>', 'Sortable.min.js">'

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        $count++
        $rel = $file.FullName.Substring($root.Length + 1)
        Write-Host "  REVERTED: $rel" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Reverted defer from $count files (inline scripts depend on these)." -ForegroundColor Cyan
