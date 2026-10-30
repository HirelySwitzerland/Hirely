@echo off
REM Startet Recruit24 und oeffnet den Browser.
cd /d "%~dp0"
echo Recruit24 startet... dieses Fenster bitte offen lassen.
start "" cmd /c "timeout /t 8 >nul && start http://localhost:3000/login"
npm run dev
pause
