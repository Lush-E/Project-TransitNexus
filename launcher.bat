@echo off
setlocal

set "BASE_DIR=%~dp0"
set "PKG=%BASE_DIR%package.json"
if not exist "%PKG%" (
  echo [ERROR] package.json not found: %PKG%
  pause
  exit /b 1
)

echo Checking dependencies...
if not exist "%BASE_DIR%node_modules\electron\cli.js" (
  echo Missing dependency detected. Installing...
  pushd "%BASE_DIR%"
  call npm.cmd install --include=dev
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    popd
    pause
    exit /b 1
  )
  popd
)

pushd "%BASE_DIR%"
call npm.cmd run start
set "EXIT_CODE=%ERRORLEVEL%"
popd

if not "%EXIT_CODE%"=="0" (
  echo [ERROR] App exited with code %EXIT_CODE%.
  pause
  exit /b %EXIT_CODE%
)

exit /b 0
