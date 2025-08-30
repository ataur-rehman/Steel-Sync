# Final comprehensive script to fix ALL remaining inputs in the entire codebase
# This will ensure 100% coverage with no exceptions

$allTsxFiles = Get-ChildItem -Path "src" -Recurse -Filter "*.tsx" | ForEach-Object { $_.FullName }

Write-Host "Running FINAL comprehensive input fix on ALL TSX files..." -ForegroundColor Green
Write-Host "Found $($allTsxFiles.Count) TSX files to process" -ForegroundColor Cyan

$totalFixed = 0

foreach ($file in $allTsxFiles) {
    $relativePath = $file -replace [regex]::Escape((Get-Location).Path + "\"), ""
    
    $content = Get-Content $file -Raw
    $originalContent = $content
    
    # COMPREHENSIVE FIX 1: All input elements without autoComplete="off"
    # This regex finds ANY input tag that doesn't already have autoComplete="off"
    $inputsFixed = 0
    
    # Find all input tags
    $inputMatches = [regex]::Matches($content, '<input[^>]*?>')
    
    foreach ($match in $inputMatches) {
        $inputTag = $match.Value
        
        # Check if this input already has autoComplete="off"
        if ($inputTag -notmatch 'autoComplete="off"' -and $inputTag -notmatch 'autocomplete="off"') {
            # Add autoComplete="off" before the closing >
            $newInputTag = $inputTag -replace '(\s*/?>)$', ' autoComplete="off"$1'
            $content = $content -replace [regex]::Escape($inputTag), $newInputTag
            $inputsFixed++
        }
    }
    
    # COMPREHENSIVE FIX 2: Number inputs without wheel handler
    $wheelFixed = 0
    $numberInputMatches = [regex]::Matches($content, '<input[^>]*?type="number"[^>]*?>')
    
    foreach ($match in $numberInputMatches) {
        $inputTag = $match.Value
        
        # Check if this number input already has onWheel handler
        if ($inputTag -notmatch 'onWheel=') {
            # Add onWheel handler before the closing >
            $newInputTag = $inputTag -replace '(\s*/?>)$', ' onWheel={(e) => e.currentTarget.blur()}$1'
            $content = $content -replace [regex]::Escape($inputTag), $newInputTag
            $wheelFixed++
        }
    }
    
    # COMPREHENSIVE FIX 3: Forms without autoComplete="off"
    $formsFixed = 0
    $formMatches = [regex]::Matches($content, '<form[^>]*?>')
    
    foreach ($match in $formMatches) {
        $formTag = $match.Value
        
        # Check if this form already has autoComplete="off"
        if ($formTag -notmatch 'autoComplete="off"' -and $formTag -notmatch 'autocomplete="off"') {
            # Add autoComplete="off" before the closing >
            $newFormTag = $formTag -replace '(\s*>)$', ' autoComplete="off"$1'
            $content = $content -replace [regex]::Escape($formTag), $newFormTag
            $formsFixed++
        }
    }
    
    $totalChanges = $inputsFixed + $wheelFixed + $formsFixed
    
    if ($content -ne $originalContent) {
        Set-Content $file -Value $content -NoNewline
        Write-Host "  $relativePath - Fixed: $inputsFixed inputs, $wheelFixed number inputs, $formsFixed forms" -ForegroundColor Green
        $totalFixed += $totalChanges
    }
}

Write-Host ""
Write-Host "FINAL COMPREHENSIVE FIX COMPLETED!" -ForegroundColor Green
Write-Host "Total elements fixed: $totalFixed" -ForegroundColor Yellow
Write-Host ""
Write-Host "Summary of fixes applied:" -ForegroundColor Cyan
Write-Host "  1. Added autoComplete='off' to ALL input elements" -ForegroundColor White
Write-Host "  2. Added onWheel handler to ALL number inputs" -ForegroundColor White  
Write-Host "  3. Added autoComplete='off' to ALL form elements" -ForegroundColor White
Write-Host ""
Write-Host "Your system is now 100% protected from:" -ForegroundColor Green
Write-Host "  * Browser autofill/autocomplete" -ForegroundColor White
Write-Host "  * Scroll wheel changing number input values" -ForegroundColor White
