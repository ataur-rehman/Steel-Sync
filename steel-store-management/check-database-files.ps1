# DATABASE FILE MONITORING SCRIPT
# Monitors database files to ensure only one is being used

Write-Host "🔍 DATABASE FILE MONITORING" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green

# Define database file locations
$appDataDb = "$env:APPDATA\com.itehadironstore.app\store.db"
$programDataDb = "$env:PROGRAMDATA\USOPrivate\UpdateStore\store.db"
$projectDb = "e:\claude Pro\steel-store-management\store.db"

Write-Host "`n📊 CHECKING DATABASE FILES..." -ForegroundColor Yellow

$dbFiles = @()

# Check AppData location
if (Test-Path $appDataDb) {
    $file = Get-Item $appDataDb
    $dbFiles += [PSCustomObject]@{
        Location = "AppData Roaming"
        Path = $file.FullName
        Size = $file.Length
        LastModified = $file.LastWriteTime
        Status = if ($file.Length -gt 10000) { "HAS DATA" } else { "EMPTY/SMALL" }
    }
}

# Check ProgramData location  
if (Test-Path $programDataDb) {
    $file = Get-Item $programDataDb
    $dbFiles += [PSCustomObject]@{
        Location = "ProgramData"
        Path = $file.FullName
        Size = $file.Length
        LastModified = $file.LastWriteTime
        Status = if ($file.Length -gt 10000) { "HAS DATA" } else { "EMPTY/SMALL" }
    }
}

# Check project directory
if (Test-Path $projectDb) {
    $file = Get-Item $projectDb
    $dbFiles += [PSCustomObject]@{
        Location = "Project Directory"
        Path = $file.FullName
        Size = $file.Length
        LastModified = $file.LastWriteTime
        Status = if ($file.Length -gt 10000) { "HAS DATA" } else { "EMPTY/SMALL" }
    }
}

# Display results
if ($dbFiles.Count -eq 0) {
    Write-Host "✅ NO DATABASE FILES FOUND" -ForegroundColor Green
    Write-Host "   Database will be created on next app run" -ForegroundColor Gray
}
elseif ($dbFiles.Count -eq 1) {
    Write-Host "✅ SINGLE DATABASE FILE (CORRECT)" -ForegroundColor Green
    $dbFiles | Format-Table -AutoSize
}
else {
    Write-Host "❌ MULTIPLE DATABASE FILES FOUND (PROBLEM)" -ForegroundColor Red
    $dbFiles | Format-Table -AutoSize
    
    Write-Host "`n🔧 RECOMMENDED ACTIONS:" -ForegroundColor Yellow
    
    $dataFile = $dbFiles | Where-Object { $_.Status -eq "HAS DATA" } | Select-Object -First 1
    $emptyFiles = $dbFiles | Where-Object { $_.Status -eq "EMPTY/SMALL" }
    
    if ($dataFile) {
        Write-Host "   1. KEEP this file (contains data):" -ForegroundColor Green
        Write-Host "      $($dataFile.Path) ($($dataFile.Size) bytes)" -ForegroundColor Cyan
    }
    
    if ($emptyFiles) {
        Write-Host "   2. DELETE these empty/small files:" -ForegroundColor Red
        foreach ($file in $emptyFiles) {
            Write-Host "      $($file.Path) ($($file.Size) bytes)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n🎯 DATABASE USAGE ANALYSIS:" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

foreach ($db in $dbFiles) {
    Write-Host "`n📂 $($db.Location)" -ForegroundColor White
    Write-Host "   Path: $($db.Path)" -ForegroundColor Gray
    Write-Host "   Size: $($db.Size) bytes" -ForegroundColor Gray  
    Write-Host "   Last Modified: $($db.LastModified)" -ForegroundColor Gray
    Write-Host "   Status: $($db.Status)" -ForegroundColor $(if ($db.Status -eq "HAS DATA") { "Green" } else { "Yellow" })
    
    # Check if file is currently in use
    try {
        $fileStream = [System.IO.File]::OpenWrite($db.Path)
        $fileStream.Close()
        Write-Host "   In Use: NO (file is available)" -ForegroundColor Gray
    }
    catch {
        Write-Host "   In Use: YES (file is locked/in use)" -ForegroundColor Red
    }
}

Write-Host "`n🎯 SUMMARY:" -ForegroundColor Green
if ($dbFiles.Count -gt 1) {
    Write-Host "   ❌ Multiple database files detected - this causes data inconsistency" -ForegroundColor Red
    Write-Host "   🔧 Run the single database enforcer to fix this issue" -ForegroundColor Yellow
}
else {
    Write-Host "   ✅ Single database configuration is correct" -ForegroundColor Green
}
