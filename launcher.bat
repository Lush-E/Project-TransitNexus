@echo off
setlocal

set "BASE_DIR=%~dp0"
set "PKG=%BASE_DIR%package.json"
set "NODE_MODULES=%BASE_DIR%node_modules"

if not exist "%PKG%" (
  echo [ERROR] package.json not found: %PKG%
  pause
  exit /b 1
)

if not exist "%NODE_MODULES%" (
  echo Installing dependencies...
  pushd "%BASE_DIR%"
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    popd
    pause
    exit /b 1
  )
  popd
)

pushd "%BASE_DIR%"
call npm run start
set "EXIT_CODE=%ERRORLEVEL%"
popd

if not "%EXIT_CODE%"=="0" (
  echo [ERROR] App exited with code %EXIT_CODE%.
  pause
  exit /b %EXIT_CODE%
)

exit /b 0
