#!/usr/bin/env bash

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

echo -e "${CYAN}🔍 Scanning for active Voide Form processes and ports...${RESET}"

# Target ports:
# 3000 - General dev port
# 3001 - Backend server port
# 5173 - Default Vite frontend port
# 5174 - Backup Vite frontend port
PORTS=(3000 3001 5173 5174)

for port in "${PORTS[@]}"; do
    # Check if anything is listening on the port
    PID=$(lsof -t -i :"$port" 2>/dev/null)
    if [ -n "$PID" ]; then
        echo -e "${RED}💥 Killing process $PID listening on port $port...${RESET}"
        kill -9 $PID 2>/dev/null
    else
        echo -e "${BLUE}✔ Port $port is free.${RESET}"
    fi
done

# Kill local background Node/Vite/Nub processes spawned in this directory
local_nodes=$(pgrep -f "node.*voide_form" 2>/dev/null)
local_nubs=$(pgrep -f "nub.*voide_form" 2>/dev/null)
if [ -n "$local_nodes" ] || [ -n "$local_nubs" ]; then
    echo -e "${RED}💥 Killing background Node/Nub processes: $local_nodes $local_nubs${RESET}"
    kill -9 $local_nodes $local_nubs 2>/dev/null
fi

echo -e "${GREEN}✨ Project stopped successfully.${RESET}"
