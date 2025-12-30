#!/bin/bash

# Development server startup script
# Checks for port usage and kills any process using the dev port before starting

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

# Function to kill all processes using the port
kill_port_processes() {
    local max_retries=5
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        # Get all PIDs using the port
        PIDS=$(lsof -ti:${DEV_PORT} 2>/dev/null || true)
        
        if [ -z "$PIDS" ]; then
            echo -e "${GREEN}✓ Port ${DEV_PORT} freed successfully${NC}"
            return 0
        fi
        
        if [ $retry_count -eq 0 ]; then
            echo -e "${YELLOW}Found process(es) using port ${DEV_PORT}: ${PIDS}${NC}"
            
            # Get process details
            for pid in $PIDS; do
                if ps -p $pid > /dev/null 2>&1; then
                    PROCESS_INFO=$(ps -p $pid -o comm=,args= 2>/dev/null || echo "unknown")
                    echo -e "${YELLOW}  PID ${pid}: ${PROCESS_INFO}${NC}"
                fi
            done
            
            echo -e "${RED}Killing process(es)...${NC}"
        else
            echo -e "${YELLOW}[RETRY ${retry_count}/${max_retries}]${NC} Port still in use, retrying..."
        fi
        
        # Kill all PIDs
        for pid in $PIDS; do
            kill -9 $pid 2>/dev/null || true
        done
        
        # Also try to kill by pattern
        pkill -9 -f "vite.*${DEV_PORT}" 2>/dev/null || true
        pkill -9 -f "node.*vite" 2>/dev/null || true
        
        # Wait for processes to die
        sleep 2
        
        retry_count=$((retry_count + 1))
    done
    
    echo -e "${RED}Error: Failed to free port ${DEV_PORT} after ${max_retries} attempts${NC}"
    echo -e "${RED}Please manually kill the processes using: sudo lsof -ti:${DEV_PORT} | xargs kill -9${NC}"
    exit 1
}

# Check if port is in use
echo -e "${YELLOW}Checking if port ${DEV_PORT} is in use...${NC}"

# Find process using the port
PID=$(lsof -ti:${DEV_PORT} 2>/dev/null || true)

if [ -n "$PID" ]; then
    kill_port_processes
else
    echo -e "${GREEN}✓ Port ${DEV_PORT} is available${NC}"
fi

echo ""
echo -e "${BLUE}Starting development server...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Run the development server
npm run dev
