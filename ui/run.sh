#!/bin/bash

# Development server startup script
# Checks for port usage and kills any process using the dev port before starting

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Port used by Vite dev server
DEV_PORT=5173

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Monitoring System - Development Server${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if port is in use
echo -e "${YELLOW}Checking if port ${DEV_PORT} is in use...${NC}"

# Find process using the port
PID=$(lsof -ti:${DEV_PORT} 2>/dev/null || true)

if [ -n "$PID" ]; then
    echo -e "${YELLOW}Found process(es) using port ${DEV_PORT}: ${PID}${NC}"
    
    # Get process details
    for pid in $PID; do
        if ps -p $pid > /dev/null 2>&1; then
            PROCESS_INFO=$(ps -p $pid -o comm=,args= 2>/dev/null || echo "unknown")
            echo -e "${YELLOW}  PID ${pid}: ${PROCESS_INFO}${NC}"
        fi
    done
    
    echo -e "${RED}Killing process(es)...${NC}"
    kill -9 $PID 2>/dev/null || true
    
    # Wait a moment for port to be released
    sleep 1
    
    # Verify port is free
    if lsof -ti:${DEV_PORT} > /dev/null 2>&1; then
        echo -e "${RED}Error: Failed to free port ${DEV_PORT}${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Port ${DEV_PORT} freed successfully${NC}"
else
    echo -e "${GREEN}✓ Port ${DEV_PORT} is available${NC}"
fi

echo ""
echo -e "${BLUE}Starting development server...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Run the development server
npm run dev
