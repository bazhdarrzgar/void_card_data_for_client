@echo off
title Voide Form Dev Server

echo ==================================================
echo 🚀 Starting Voide Form in Development Mode...
echo ==================================================

:: Check if server node_modules exist
if not exist "server\node_modules\" (
    echo 📦 Installing server dependencies...
    cd server
    call npm install
    cd ..
)

:: Check if client node_modules exist
if not exist "client\node_modules\" (
    echo 📦 Installing client dependencies...
    cd client
    call npm install
    cd ..
)

echo Starting backend API server (Port 3001)...
start "Voide Form Backend" cmd /c "cd server && npm run dev"

echo Starting frontend dev server (Vite)...
start "Voide Form Frontend" cmd /c "cd client && npm run dev"

echo ==================================================
echo   Backend is running in a new window.
echo   Frontend (Vite) is running in a new window.
echo ==================================================
echo Close the individual terminal windows to stop the servers.
pause
