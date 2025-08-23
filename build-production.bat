@echo off
title Ittehad Iron Store - Production Build

echo.
echo ======================================================
echo       🏪 Building Ittehad Iron Store for Production
echo ======================================================
echo.

:: Check if npm is available
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed or not in PATH
    pause
    exit /b 1
)

:: Check if cargo is available
where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Rust/Cargo is not installed or not in PATH
    pause
    exit /b 1
)

echo [INFO] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [INFO] Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed
    pause
    exit /b 1
)

echo.
echo [INFO] Building Tauri application...
call npm run tauri build
if %errorlevel% neq 0 (
    echo [ERROR] Tauri build failed
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Build completed successfully!
echo.
echo [INFO] Build artifacts location:
echo   📁 Windows: src-tauri\target\release\bundle\msi\
echo   📁 Portable: src-tauri\target\release\bundle\nsis\
echo.
echo [INFO] Your installer files:

:: List MSI files
for %%f in (src-tauri\target\release\bundle\msi\*.msi) do (
    echo   📦 %%f
)

:: List NSIS files
for %%f in (src-tauri\target\release\bundle\nsis\*.exe) do (
    echo   📦 %%f
)

echo.
echo [SUCCESS] 🎉 Ready for distribution!
echo [WARNING] Remember to test the installer on a clean machine before distributing to clients.
echo.
echo Press any key to open the build folder...
pause >nul

:: Open the build folder
start explorer "src-tauri\target\release\bundle"
