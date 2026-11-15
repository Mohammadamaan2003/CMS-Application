@echo off
title IQRA Customer Management System
color 0b
echo ========================================================
echo    Starting IQRA Customer Management System (CRM)...
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend Server (Port 5000)...
start "CRM Backend (Port 5000)" /min cmd /c "node server/server.js"

echo [2/2] Starting Frontend Client (Port 3000)...
start "CRM Frontend (Port 3000)" /min cmd /c "npm run dev --prefix client"

echo.
echo Waiting for services to initialize...
timeout /t 4 /nobreak >nul

echo Opening application in your browser...
start http://localhost:3000

echo.
echo ========================================================
echo  CRM is now running!
echo  - Frontend: http://localhost:3000
echo  - Backend:  http://localhost:5000
echo ========================================================
echo.
echo You can keep this window or close it.
echo To stop all CRM services, run "Stop_CRM.bat".
echo.
timeout /t 6
