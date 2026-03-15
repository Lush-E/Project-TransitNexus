@echo off
setlocal
cd /d "%~dp0"
echo.
echo === TransitNexus Launcher ===
echo [1] Start app
echo [2] Update and start
echo [3] Install dependencies only
echo [4] Exit
echo.

set ACTION=
choice /c 1234 /n /m "Choose 1-4: "
if errorlevel 4 goto :end
if errorlevel 3 goto :actionInstall
if errorlevel 2 goto :actionUpdateStart
if errorlevel 1 goto :actionStart

:actionStart
set ACTION=start
goto :run

:actionUpdateStart
set ACTION=update-start
goto :run

:actionInstall
set ACTION=install
goto :run

:run
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher.ps1" -Action %ACTION%
if errorlevel 1 (
  echo.
  echo Launcher exited with an error.
  pause
)

:end
endlocal
