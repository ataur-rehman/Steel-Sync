# Simple final input fix
$files = Get-ChildItem -Path "src" -Recurse -Filter "*.tsx"
$totalFixed = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "<input") {
        $originalContent = $content
        
        # Fix inputs without autoComplete
        $content = $content -replace '(<input[^>]*?)(?![^>]*autoComplete=)([^>]*>)', '$1 autoComplete="off"$2'
        
        # Fix number inputs without onWheel
        $content = $content -replace '(<input[^>]*type="number"[^>]*?)(?![^>]*onWheel=)([^>]*>)', '$1 onWheel={(e) => e.currentTarget.blur()}$2'
        
        if ($content -ne $originalContent) {
            Set-Content $file.FullName -Value $content -NoNewline
            Write-Host "Fixed: $($file.Name)"
            $totalFixed++
        }
    }
}

Write-Host "Total files fixed: $totalFixed"
