@echo off
title Voide Form Production Build & Run
setlocal enabledelayedexpansion

echo ==================================================
echo 🚀 Preparing Voide Form Dataset Studio for Production (Build Mode)...
echo ==================================================

:: Detect package manager
cmd /c nub --version >nul 2>&1
if %errorlevel% equ 0 (
    set PKG_MANAGER=nub
    echo 🟢 Using nub for production build and execution.
) else (
    set PKG_MANAGER=npm
    echo 🟡 Using npm (fallback) for production build and execution.
)

:: Check for node_modules in backend
if not exist "server\node_modules\" (
    echo 📦 Installing server dependencies using !PKG_MANAGER!...
    cd server
    if exist package-lock.json del package-lock.json
    if "!PKG_MANAGER!"=="nub" (
        call nub install
    ) else (
        call npm install
    )
    cd ..
)

:: Check for node_modules in frontend
if not exist "client\node_modules\" (
    echo 📦 Installing client dependencies using !PKG_MANAGER!...
    cd client
    if exist package-lock.json del package-lock.json
    if "!PKG_MANAGER!"=="nub" (
        call nub install
    ) else (
        call npm install
    )
    cd ..
)

:: Build frontend static assets
echo 🛠️ Building frontend static assets...
cd client
if "!PKG_MANAGER!"=="nub" (
    call nub run build
) else (
    call npm run build
)
cd ..

:: Start backend server which serves both API and Client Build
echo Starting backend production server (serving both API ^& Frontend on Port 3001)...
cd server
if "!PKG_MANAGER!"=="nub" (
    call nub index.js
) else (
    node index.js
)
