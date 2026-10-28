@echo off
title Morder's Writer // Autonomous SEO, GEO ^& Editorial Studio
color 0B

echo ============================================================================
echo    Morder's Writer // Autonomous SEO, GEO ^& Editorial Studio
echo ============================================================================
echo.

set "PROJECT_DIR=C:\Users\yoavm\.gemini\antigravity\scratch\seo-geo-studio"
cd /d "%PROJECT_DIR%"

if not exist "node_modules" (
    echo [1/3] Installing dependencies for the first time...
    call npm.cmd install
)

echo [1/2] Checking if port 3000 is already running...
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo [2/2] Morder's Writer is already running! Opening http://localhost:3000 ...
    start "" "http://localhost:3000"
    exit /b 0
)

echo [2/2] Starting Morder's Writer Server and opening browser at http://localhost:3000 ...
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"
call npm.cmd run dev
pause
