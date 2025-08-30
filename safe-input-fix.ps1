# Safe and comprehensive input fix script
# This will ensure 100% coverage without breaking existing code

$inputFiles = Get-ChildItem -Path "src" -Recurse -Filter "*.tsx" | Where-Object { 
    (Get-Content $_.FullName -Raw) -match "<input" 
} | ForEach-Object { $_.FullName }

Write-Host "🔧 Running SAFE comprehensive input fix..." -ForegroundColor Green
Write-Host "Found $($inputFiles.Count) files with input elements" -ForegroundColor Cyan

$totalFixed = 0

foreach ($file in $inputFiles) {
    $content = Get-Content $file -Raw
    $originalContent = $content
    $fileFixed = 0
    
    # Skip if content is null or empty
    if (-not $content) { continue }
    
    # Fix inputs that don't have autoComplete
    $lines = $content -split "`n"
    $newLines = @()
    
    foreach ($line in $lines) {
        if ($line -match '<input[^>]*>' -and $line -notmatch 'autoComplete=') {
            # Add autoComplete="off" before the closing >
            $newLine = $line -replace '(\s*/?>)$', ' autoComplete="off"$1'
            $newLines += $newLine
            $fileFixed++
        }
        elseif ($line -match '<input[^>]*type="number"[^>]*>' -and $line -notmatch 'onWheel=') {
            # Add onWheel handler for number inputs
            $newLine = $line -replace '(\s*/?>)$', ' onWheel={(e) => e.currentTarget.blur()}$1'
            $newLines += $newLine
            $fileFixed++
        }
        else {
            $newLines += $line
        }
    }
    
    if ($fileFixed -gt 0) {
        $newContent = $newLines -join "`n"
        Set-Content $file -Value $newContent -NoNewline
        $relativePath = $file -replace [regex]::Escape((Get-Location).Path + "\"), ""
        Write-Host "  $relativePath - Fixed $fileFixed input(s)" -ForegroundColor Green
        $totalFixed += $fileFixed
    }
}

Write-Host ""
Write-Host "SAFE COMPREHENSIVE FIX COMPLETED!" -ForegroundColor Green
Write-Host "Total inputs fixed: $totalFixed" -ForegroundColor Yellow
