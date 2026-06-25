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

# Function to find next available port
find_free_port() {
    local port=$1
    while (echo > /dev/tcp/127.0.0.1/$port) >/dev/null 2>&1; do
        port=$((port+1))
    done
    echo $port
}

# Check if dependencies are installed (install if node_modules missing)
if [ ! -d "server/node_modules" ]; then
    echo -e "${BLUE}📦 Installing server dependencies...${RESET}"
    (cd server && rm -f package-lock.json && nub install)
fi

if [ ! -d "client/node_modules" ]; then
    echo -e "${BLUE}📦 Installing client dependencies...${RESET}"
    (cd client && rm -f package-lock.json && nub install)
fi

# Find available ports
BACKEND_PORT=$(find_free_port 3001)
FRONTEND_PORT=$(find_free_port 5173)

export BACKEND_PORT
export FRONTEND_PORT

# Start Backend Server
echo -e "${GREEN}Starting backend API server (Port ${BACKEND_PORT})...${RESET}"
cd server
nub run dev &
BACKEND_PID=$!
cd ..

# Start Frontend Dev Server
echo -e "${GREEN}Starting frontend dev server (Port ${FRONTEND_PORT})...${RESET}"
cd client
nub run dev &
FRONTEND_PID=$!
cd ..

echo -e "${CYAN}──────────────────────────────────────────────────"
echo -e "  Backend running on:  http://localhost:${BACKEND_PORT}"
echo -e "  Frontend running on: http://localhost:${FRONTEND_PORT}"
echo -e "──────────────────────────────────────────────────${RESET}"
echo -e "Press ${RED}Ctrl+C${RESET} to stop both servers."

# Keep script running and wait for background processes
wait
