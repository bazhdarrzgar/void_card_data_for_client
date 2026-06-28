#!/usr/bin/env bash

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

echo -e "${CYAN}🚀 Preparing Voide Form Dataset Studio for Production (Build Mode)...${RESET}"

# Detect package manager
if command -v nub &> /dev/null; then
    PKG_MANAGER="nub"
    echo -e "${GREEN}🟢 Using nub for production build and execution.${RESET}"
else
    PKG_MANAGER="npm"
    echo -e "${YELLOW}🟡 Using npm (fallback) for production build and execution.${RESET}"
fi

# Check for node_modules in backend
if [ ! -d "server/node_modules" ]; then
    echo -e "${BLUE}📦 Installing server dependencies using ${PKG_MANAGER}...${RESET}"
    if [ "$PKG_MANAGER" = "nub" ]; then
        (cd server && rm -f package-lock.json && nub install)
    else
        (cd server && rm -f package-lock.json && npm install)
    fi
fi

# Check for node_modules in frontend
if [ ! -d "client/node_modules" ]; then
    echo -e "${BLUE}📦 Installing client dependencies using ${PKG_MANAGER}...${RESET}"
    if [ "$PKG_MANAGER" = "nub" ]; then
        (cd client && rm -f package-lock.json && nub install)
    else
        (cd client && rm -f package-lock.json && npm install)
    fi
fi

# Build frontend static assets
echo -e "${BLUE}🛠️ Building frontend static assets...${RESET}"
cd client
if [ "$PKG_MANAGER" = "nub" ]; then
    nub run build
else
    npm run build
fi
cd ..

# Start backend server which serves both API and Client Build
echo -e "${GREEN}Starting backend production server (serving both API & Frontend on Port 3001)...${RESET}"
cd server
if [ "$PKG_MANAGER" = "nub" ]; then
    nub index.js
else
    node index.js
fi
