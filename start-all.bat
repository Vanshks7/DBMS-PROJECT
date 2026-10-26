@echo off
title Smart Parking Web Portal Launcher
echo ========================================================
echo    Smart Parking Web Portal (Full Stack System)
echo ========================================================
echo.
echo Starting Backend API (Port 5000)...
start "SmartPark Backend API" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 2 /nobreak >nul

echo Starting Frontend Web Portal (Port 3000)...
start "SmartPark Frontend Web" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo Opening browser at http://localhost:3000 ...
start "" http://localhost:3000
echo.
echo Both servers started!
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:5000
echo ========================================================
pause
