#!/bin/bash

# Development run script for EMS API
# This script checks for port usage, kills any blocking process, and runs the API in development mode

# Change to the script's directory
cd "$(dirname "$0")"

# Configuration
PORT=5030
PROJECT_NAME="API"
ASPNETCORE_ENV="Development"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  EMS API - Development Mode${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to kill all processes using the port
kill_port_processes() {
    local max_retries=5
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        # Get all PIDs using the port
        PIDS=$(lsof -ti:${PORT} 2>/dev/null || true)
        
        if [ -z "$PIDS" ]; then
            echo -e "${GREEN}[SUCCESS]${NC} Port ${PORT} is now free"
            return 0
        fi
        
        if [ $retry_count -eq 0 ]; then
            echo -e "${YELLOW}[WARNING]${NC} Port ${PORT} is in use by process(es): ${PIDS}"
            echo -e "${YELLOW}[ACTION]${NC} Killing process(es)..."
        else
            echo -e "${YELLOW}[RETRY ${retry_count}/${max_retries}]${NC} Port still in use, retrying..."
        fi
        
        # Kill all PIDs
        for pid in $PIDS; do
            kill -9 $pid 2>/dev/null || true
        done
        
        # Also try to kill by pattern
        pkill -9 -f "dotnet.*API" 2>/dev/null || true
        
        # Wait for processes to die
        sleep 2
        
        retry_count=$((retry_count + 1))
    done
    
    echo -e "${RED}[ERROR]${NC} Failed to free port ${PORT} after ${max_retries} attempts"
    echo -e "${RED}[ERROR]${NC} Please manually kill the processes using: sudo lsof -ti:${PORT} | xargs kill -9"
    exit 1
}

# Check if port is in use
echo -e "${YELLOW}[CHECK]${NC} Checking if port ${PORT} is in use..."
PID=$(lsof -ti:${PORT} 2>/dev/null || true)

if [ -n "$PID" ]; then
    kill_port_processes
else
    echo -e "${GREEN}[OK]${NC} Port ${PORT} is available"
fi

echo ""
echo -e "${BLUE}[INFO]${NC} Starting ${PROJECT_NAME} in ${ASPNETCORE_ENV} mode..."
echo -e "${BLUE}[INFO]${NC} API will be available at:"
echo -e "${GREEN}  - http://localhost:${PORT}${NC}"
echo -e "${GREEN}  - http://0.0.0.0:${PORT}${NC}"
echo ""
echo -e "${YELLOW}[TIP]${NC} Press Ctrl+C to stop the application"
echo ""

# Export environment variable
export ASPNETCORE_ENVIRONMENT=${ASPNETCORE_ENV}

# Run the application in development mode without hot reload
dotnet run --project ${PROJECT_NAME}.csproj
