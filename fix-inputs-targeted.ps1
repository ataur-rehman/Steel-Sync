# PowerShell script to comprehensively fix all input elements
# This script will handle edge cases and ensure 100% coverage

$filesToProcess = @(
    "src\components\billing\InvoiceDetails.tsx",
    "src\components\finance\BusinessFinanceDashboard.tsx",
    "src\components\stock\StockReceivingPayment.tsx",
    "src\components\stock\StockReceivingNew.tsx",
    "src\components\reports\DailyLedger.tsx",
    "src\components\vendor\VendorDetail.tsx"
)

Write-Host "Starting targeted input fixes for remaining files..." -ForegroundColor Green

foreach ($file in $filesToProcess) {
    if (Test-Path $file) {
        Write-Host "Processing: $file" -ForegroundColor Cyan
        
        $content = Get-Content $file -Raw
        $originalContent = $content
        $changes = 0
        
        # Pattern 1: Fix inputs that have type but no autoComplete
        $pattern1 = '(<input[^>]*?type="(?:text|email|password|tel|search)"[^>]*?)(?![^>]*?autoComplete="off")([^>]*?>)'
        if ($content -match $pattern1) {
            $content = $content -replace $pattern1, '$1 autoComplete="off"$2'
            $changes++
        }
        
        # Pattern 2: Fix number inputs that don't have both autoComplete and onWheel
        $pattern2 = '(<input[^>]*?type="number"[^>]*?)(?![^>]*?autoComplete="off")([^>]*?>)'
        if ($content -match $pattern2) {
            $content = $content -replace $pattern2, '$1 autoComplete="off"$2'
            $changes++
        }
        
        $pattern3 = '(<input[^>]*?type="number"[^>]*?)(?![^>]*?onWheel=)([^>]*?>)'
        if ($content -match $pattern3) {
            $content = $content -replace $pattern3, '$1 onWheel={(e) => e.currentTarget.blur()}$2'
            $changes++
        }
        
        # Pattern 3: Fix radio buttons and checkboxes
        $pattern4 = '(<input[^>]*?type="(?:radio|checkbox)"[^>]*?)(?![^>]*?autoComplete="off")([^>]*?>)'
        if ($content -match $pattern4) {
            $content = $content -replace $pattern4, '$1 autoComplete="off"$2'
            $changes++
        }
        
        # Pattern 4: Fix any remaining inputs without any type specified
        $pattern5 = '(<input(?![^>]*?type=)[^>]*?)(?![^>]*?autoComplete="off")([^>]*?>)'
        if ($content -match $pattern5) {
            $content = $content -replace $pattern5, '$1 autoComplete="off"$2'
            $changes++
        }
        
        # Write the file if changes were made
        if ($content -ne $originalContent) {
            Set-Content $file -Value $content -NoNewline
            Write-Host "  Fixed $changes pattern(s)" -ForegroundColor Green
        } else {
            Write-Host "  No changes needed" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  File not found: $file" -ForegroundColor Red
    }
}

Write-Host "Targeted fixes completed!" -ForegroundColor Green
