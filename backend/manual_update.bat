@echo off
setlocal
cd /d %~dp0

echo ==========================================
echo       BACKEND MANUAL UPDATE TOOL
echo ==========================================
echo.
echo This will:
echo 1. Stop the current backend
echo 2. Pull latest code (git pull)
echo 3. Update dependencies (pip install)
echo 4. Restart the server
echo.
pause

powershell -ExecutionPolicy Bypass -File update_backend.ps1

echo.
echo ==========================================
echo       UPDATE PROCESS FINISHED
echo ==========================================
pause
