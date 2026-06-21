#!/usr/bin/env bash

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
RESET='\033[0m'

echo -e "${CYAN}==================================================${RESET}"
echo -e "${CYAN}🚀 Installing Prerequisites & Dependencies for Voide Form${RESET}"
echo -e "${CYAN}==================================================${RESET}"

# 1. Check if Node.js is installed
echo -e "${BLUE}🔍 Checking for Node.js...${RESET}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed!${RESET}"
    echo -e "${YELLOW}Please install Node.js (v18 or higher is recommended) before running this project.${RESET}"
    echo -e "You can download it from: ${CYAN}https://nodejs.org/${RESET}"
    exit 1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✔ Node.js is installed ($NODE_VERSION)${RESET}"
fi

# 2. Check if npm is installed
echo -e "${BLUE}🔍 Checking for npm...${RESET}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Error: npm (Node Package Manager) is not installed!${RESET}"
    echo -e "${YELLOW}Please install npm (usually bundled with Node.js) before running this project.${RESET}"
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✔ npm is installed ($NPM_VERSION)${RESET}"
fi

# 3. Check for compiler tools (better-sqlite3 may require compilation if prebuilds fail)
echo -e "${BLUE}🔍 Checking for build tools (required for native dependencies)...${RESET}"
if command -v make &> /dev/null && (command -v g++ &> /dev/null || command -v gcc &> /dev/null); then
    echo -e "${GREEN}✔ Build tools (make/gcc) found.${RESET}"
else
    echo -e "${YELLOW}⚠ Note: Build tools (make, gcc/g++) were not found.${RESET}"
    echo -e "${YELLOW}Usually, better-sqlite3 will download a prebuilt binary, but if it fails, you may need to install build essentials.${RESET}"
    echo -e "${YELLOW}For Ubuntu/Debian: sudo apt update && sudo apt install build-essential${RESET}"
fi

# 4. Install backend server dependencies
echo -e "\n${BLUE}📦 Installing backend (server) dependencies...${RESET}"
if [ -d "server" ]; then
    cd server
    if npm install; then
        echo -e "${GREEN}✔ Backend dependencies installed successfully.${RESET}"
    else
        echo -e "${RED}❌ Failed to install backend dependencies!${RESET}"
        exit 1
    fi
    cd ..
else
    echo -e "${RED}❌ Error: 'server' directory not found!${RESET}"
    exit 1
fi

# 5. Install frontend client dependencies
echo -e "\n${BLUE}📦 Installing frontend (client) dependencies...${RESET}"
if [ -d "client" ]; then
    cd client
    if npm install; then
        echo -e "${GREEN}✔ Frontend dependencies installed successfully.${RESET}"
    else
        echo -e "${RED}❌ Failed to install frontend dependencies!${RESET}"
        exit 1
    fi
    cd ..
else
    echo -e "${RED}❌ Error: 'client' directory not found!${RESET}"
    exit 1
fi

echo -e "\n${GREEN}==================================================${RESET}"
echo -e "${GREEN}✨ All requirements and dependencies installed successfully!${RESET}"
echo -e "${GREEN}==================================================${RESET}"
echo -e "To start the development servers, run:"
echo -e "  ${CYAN}chmod +x run_dev.sh && ./run_dev.sh${RESET}"
echo -e ""
