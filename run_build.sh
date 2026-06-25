#!/usr/bin/env bash

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

echo -e "${CYAN}🚀 Preparing Voide Form Dataset Studio for Production (Build Mode)...${RESET}"

# Check for node_modules in backend
if [ ! -d "server/node_modules" ]; then
    echo -e "${BLUE}📦 Installing server dependencies...${RESET}"
    (cd server && rm -f package-lock.json && nub install)
fi

# Check for node_modules in frontend
if [ ! -d "client/node_modules" ]; then
    echo -e "${BLUE}📦 Installing client dependencies...${RESET}"
    (cd client && rm -f package-lock.json && nub install)
fi

# Build frontend static assets
echo -e "${BLUE}🛠️ Building frontend static assets...${RESET}"
cd client
nub run build
cd ..

# Start backend server which serves both API and Client Build
echo -e "${GREEN}Starting backend production server (serving both API & Frontend on Port 3001)...${RESET}"
cd server
nub index.js
