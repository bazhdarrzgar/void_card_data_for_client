#!/usr/bin/env bash

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0;5m' # No Color
RESET='\033[0m'

echo -e "${CYAN}🚀 Starting Voide Form Dataset Studio in Development Mode...${RESET}"

# Function to clean up background processes on exit
cleanup() {
    echo -e "\n${RED}🛑 Stopping servers...${RESET}"
    kill "$BACKEND_PID" 2>/dev/null
    kill "$FRONTEND_PID" 2>/dev/null
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Check if npm dependencies are installed (install if node_modules missing)
if [ ! -d "server/node_modules" ]; then
    echo -e "${BLUE}📦 Installing server dependencies...${RESET}"
    (cd server && npm install)
fi

if [ ! -d "client/node_modules" ]; then
    echo -e "${BLUE}📦 Installing client dependencies...${RESET}"
    (cd client && npm install)
fi

# Start Backend Server
echo -e "${GREEN}Starting backend API server (Port 3001)...${RESET}"
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# Start Frontend Dev Server
echo -e "${GREEN}Starting frontend dev server (Vite)...${RESET}"
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "${CYAN}──────────────────────────────────────────────────"
echo -e "  Backend running on:  http://localhost:3001"
echo -e "  Frontend running on: Check terminal output above"
echo -e "──────────────────────────────────────────────────${RESET}"
echo -e "Press ${RED}Ctrl+C${RESET} to stop both servers."

# Keep script running and wait for background processes
wait
