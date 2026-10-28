@echo off
REM Startet Hirely fuer eine Vorfuehrung: alle Seiten werden vorab gebaut, danach oeffnet sich jede Seite sofort.
REM Vorher alle anderen Hirely-Fenster schliessen.
cd /d "%~dp0"
echo.
echo  Hirely - Vorfuehrungs-Modus
echo  ==========================
echo.
choice /c JN /m "Demo-Daten jetzt frisch zuruecksetzen (J = ja, N = nein)"
if errorlevel 2 goto build
call npm run db:seed
:build
echo.
echo Hirely wird vorbereitet. Das dauert 1 bis 3 Minuten ...
call npm run build
if errorlevel 1 (
  echo.
  echo Die Vorbereitung ist fehlgeschlagen. Sind noch andere Hirely-Fenster offen? Diese schliessen und erneut starten.
  pause
  exit /b 1
)
echo.
echo Hirely startet ... dieses Fenster bitte offen lassen.
start "" cmd /c "timeout /t 5 >/dev/null && start http://localhost:3000/login"
call npm start
pause
