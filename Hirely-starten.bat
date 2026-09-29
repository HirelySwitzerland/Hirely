@echo off
REM Startet Hirely und oeffnet den Browser.
cd /d "%~dp0"
echo Hirely startet... dieses Fenster bitte offen lassen.
start "" cmd /c "timeout /t 8 >nul && start http://localhost:3000/login"
npm run dev
pause
