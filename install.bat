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
    echo ⚠️ nub is not installed.
    echo 📦 Attempting to install nub globally via npm...
    call npm install -g --ignore-scripts=false @nubjs/nub
    if !errorlevel! neq 0 (
        echo ❌ Error: Failed to install nub globally!
        echo Please try installing it manually: npm install -g --ignore-scripts=false @nubjs/nub
        goto ERROR
    )
    :: Re-verify nub installation
    cmd /c nub --version >nul 2>&1
    if !errorlevel! neq 0 (
        echo ❌ Error: nub was installed but the 'nub' command is still not recognized.
        echo You may need to restart your terminal or add the npm global bin folder to your PATH.
        goto ERROR
    )
)

:: Detect package manager
cmd /c nub --version >nul 2>&1
if %errorlevel% equ 0 (
    set PKG_MANAGER=nub
    for /f "tokens=*" %%i in ('cmd /c nub --version') do (
        set NUB_VER=%%i
        goto NUB_CHECK_DONE
    )
    :NUB_CHECK_DONE
    echo ✔ nub is installed (!NUB_VER!) and will be used.
) else (
    set PKG_MANAGER=npm
    echo ⚠️ nub is not working. Falling back to npm for package installation.
)

:: 3. Install backend server dependencies
echo.
echo 📦 Installing backend (server) dependencies using !PKG_MANAGER!...
if not exist "server\" (
    echo ❌ Error: 'server' directory not found!
    goto ERROR
)
cd server
if exist package-lock.json del package-lock.json
if "!PKG_MANAGER!"=="nub" (
    call nub install
) else (
    call npm install
)
if !errorlevel! neq 0 (
    echo ❌ Failed to install backend dependencies!
    cd ..
    goto ERROR
)
cd ..
echo ✔ Backend dependencies installed successfully.

:: 4. Install frontend client dependencies
echo.
echo 📦 Installing frontend (client) dependencies using !PKG_MANAGER!...
if not exist "client\" (
    echo ❌ Error: 'client' directory not found!
    goto ERROR
)
cd client
if exist package-lock.json del package-lock.json
if "!PKG_MANAGER!"=="nub" (
    call nub install
) else (
    call npm install
)
if !errorlevel! neq 0 (
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
