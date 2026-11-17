@echo off
title Restart IQRA Customer Management System
color 0e
echo ========================================================
echo    Restarting IQRA Customer Management System (CRM)...
echo ========================================================
echo.

call "%~dp0Stop_CRM.bat"
timeout /t 2 /nobreak >nul
call "%~dp0Start_CRM.bat"
