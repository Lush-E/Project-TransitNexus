@echo off
setlocal

set "BASE_DIR=%~dp0"
set "PKG=%BASE_DIR%package.json"

if not exist "%PKG%" (
  echo [ERROR] package.json not found: %PKG%
  pause
  exit /b 1
)

pushd "%BASE_DIR%"

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    popd
    pause
    exit /b 1
  )
)

echo Building Windows EXE (NSIS + Portable)...
call npm run dist:win
set "EXIT_CODE=%ERRORLEVEL%"

popd

if not "%EXIT_CODE%"=="0" (
  echo [ERROR] EXE build failed with code %EXIT_CODE%.
  pause
  exit /b %EXIT_CODE%
)

echo Build completed. Check .\dist folder.
pause
exit /b 0
