function Get-Tree {
    param(
        [string]$Path = ".",
        [int]$Depth = 0,
        [int]$MaxDepth = 3
    )
    if ($Depth -gt $MaxDepth) { return }
    $items = Get-ChildItem -Path $Path -Exclude "node_modules", ".git", ".expo" -Force
    foreach ($item in $items) {
        $prefix = "  " * $Depth
        if ($item.PSIsContainer) {
            Write-Output "$prefix+-- $($item.Name)/"
            Get-Tree -Path $item.FullName -Depth ($Depth + 1) -MaxDepth $MaxDepth
        } else {
            Write-Output "$prefix|-- $($item.Name)"
        }
    }
}
Get-Tree -Path . -MaxDepth 4 | Out-File -FilePath structure.txt -Encoding utf8
