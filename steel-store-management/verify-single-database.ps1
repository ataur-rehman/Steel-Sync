Write-Host "🔍 SINGLE DATABASE VERIFICATION" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# Check database files
$appDataDb = "$env:APPDATA\com.itehadironstore.app\store.db"
$programDataDb = "$env:PROGRAMDATA\USOPrivate\UpdateStore\store.db"
$projectDb = "e:\claude Pro\steel-store-management\store.db"

$foundFiles = @()

if (Test-Path $appDataDb) {
    $file = Get-Item $appDataDb
    $foundFiles += "AppData: $($file.Length) bytes"
}

if (Test-Path $programDataDb) {
    $file = Get-Item $programDataDb
    $foundFiles += "ProgramData: $($file.Length) bytes"
}

if (Test-Path $projectDb) {
    $file = Get-Item $projectDb  
    $foundFiles += "Project: $($file.Length) bytes"
}

Write-Host "`nDatabase files found: $($foundFiles.Count)" -ForegroundColor Yellow

if ($foundFiles.Count -eq 0) {
    Write-Host "✅ NO database files found - will create single file on next app start" -ForegroundColor Green
}
elseif ($foundFiles.Count -eq 1) {
    Write-Host "✅ SINGLE database file (CORRECT)" -ForegroundColor Green
    $foundFiles | ForEach-Object { Write-Host "   $_" -ForegroundColor Cyan }
}
else {
    Write-Host "❌ MULTIPLE database files (NEEDS FIX)" -ForegroundColor Red
    $foundFiles | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
    Write-Host "`n🔧 Run the permanent single database solution to fix this" -ForegroundColor Yellow
}

Write-Host "`n🎯 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Open your steel store management app" -ForegroundColor White
Write-Host "2. Press F12 and go to Console tab" -ForegroundColor White
Write-Host "3. Run: fetch('/permanent-single-database-solution.js').then(r=>r.text()).then(eval)" -ForegroundColor White
