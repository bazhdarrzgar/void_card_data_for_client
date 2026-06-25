@echo off
title Voide Form Installer
setlocal enabledelayedexpansion

echo ==================================================
echo 🚀 Installing Prerequisites ^& Dependencies for Voide Form
echo ==================================================

:: 1. Check for Node.js
echo 🔍 Checking for Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed!
    echo Please install Node.js (v18 or higher is recommended) before running this project.
    echo You can download it from: https://nodejs.org/
    goto ERROR
) else (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
    echo ✔ Node.js is installed (!NODE_VER!)
)

:: 2. Check for nub
echo 🔍 Checking for nub...
cmd /c nub --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: nub is not installed!
    echo Please install nub before running this project.
    echo You can install it via: npm install -g @nubjs/nub
    goto ERROR
) else (
    for /f "tokens=*" %%i in ('cmd /c nub --version') do (
        set NUB_VER=%%i
        goto NUB_CHECK_DONE
    )
    :NUB_CHECK_DONE
    echo ✔ nub is installed (!NUB_VER!)
)

:: 3. Install backend server dependencies
echo.
echo 📦 Installing backend (server) dependencies...
if not exist "server\" (
    echo ❌ Error: 'server' directory not found!
    goto ERROR
)
cd server
if exist package-lock.json del package-lock.json
call nub install
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies!
    cd ..
    goto ERROR
)
cd ..
echo ✔ Backend dependencies installed successfully.

:: 4. Install frontend client dependencies
echo.
echo 📦 Installing frontend (client) dependencies...
if not exist "client\" (
    echo ❌ Error: 'client' directory not found!
    goto ERROR
)
cd client
if exist package-lock.json del package-lock.json
call nub install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies!
    cd ..
    goto ERROR
)
cd ..
echo ✔ Frontend dependencies installed successfully.

echo.
echo ==================================================
echo ✨ All requirements and dependencies installed successfully!
echo ==================================================
echo To start the development servers, run:
echo   run_dev.bat
echo.
pause
exit /b 0

:ERROR
echo.
echo ❌ Installation failed. Please check the errors above.
pause
exit /b 1
