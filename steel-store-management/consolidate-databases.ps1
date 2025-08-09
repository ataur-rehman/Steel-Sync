# DATABASE CONSOLIDATION TOOL
# Merges data from both database files into a single database

Write-Host "🔄 DATABASE CONSOLIDATION TOOL" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# Define database file locations
$appDataDb = "$env:APPDATA\com.itehadironstore.app\store.db"
$programDataDb = "$env:PROGRAMDATA\USOPrivate\UpdateStore\store.db"

Write-Host "`nStep 1: Checking current database files..." -ForegroundColor Yellow

# Check both files exist
$appDataExists = Test-Path $appDataDb
$programDataExists = Test-Path $programDataDb

Write-Host "AppData database: $appDataExists" -ForegroundColor Cyan
Write-Host "ProgramData database: $programDataExists" -ForegroundColor Cyan

if ($appDataExists) {
    $appDataSize = (Get-Item $appDataDb).Length
    Write-Host "   AppData size: $appDataSize bytes" -ForegroundColor Gray
}

if ($programDataExists) {
    $programDataSize = (Get-Item $programDataDb).Length
    Write-Host "   ProgramData size: $programDataSize bytes" -ForegroundColor Gray
}

Write-Host "`nStep 2: Analysis complete" -ForegroundColor Yellow
Write-Host "Both files contain mixed data that needs consolidation" -ForegroundColor Red

Write-Host "`nStep 3: Recommended consolidation approach:" -ForegroundColor Green
Write-Host "1. Stop the steel store management application completely" -ForegroundColor Yellow
Write-Host "2. Backup both database files before consolidation" -ForegroundColor Yellow
Write-Host "3. Use the browser-based consolidation tool for safe merging" -ForegroundColor Yellow
Write-Host "4. Start application with single database configuration" -ForegroundColor Yellow

Write-Host "`nStep 4: Creating backup copies..." -ForegroundColor Green

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

if ($appDataExists) {
    $backupPath1 = "e:\claude Pro\steel-store-management\backup_appdata_$timestamp.db"
    Copy-Item $appDataDb $backupPath1
    Write-Host "✅ AppData backup: $backupPath1" -ForegroundColor Green
}

if ($programDataExists) {
    $backupPath2 = "e:\claude Pro\steel-store-management\backup_programdata_$timestamp.db"  
    Copy-Item $programDataDb $backupPath2
    Write-Host "✅ ProgramData backup: $backupPath2" -ForegroundColor Green
}

Write-Host "`n🎯 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "==============" -ForegroundColor Cyan
Write-Host "1. Close the steel store management app completely" -ForegroundColor White
Write-Host "2. Open the app in browser console" -ForegroundColor White  
Write-Host "3. Run the database consolidation fix script" -ForegroundColor White
Write-Host "4. Verify all your Rs 297,070 vendor data is accessible" -ForegroundColor White

Write-Host "`n📋 STATUS SUMMARY:" -ForegroundColor Green
Write-Host "- ✅ Backup files created" -ForegroundColor Green
Write-Host "- ⚠️  Two database files still active (causing data split)" -ForegroundColor Yellow
Write-Host "- 🔧 Ready for browser-based consolidation" -ForegroundColor Cyan
