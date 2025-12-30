#!/bin/bash

# Development run script for EMS API
# This script checks for port usage, kills any blocking process, and runs the API in development mode

set -e

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

# Check if port is in use
echo -e "${YELLOW}[CHECK]${NC} Checking if port ${PORT} is in use..."
PID=$(lsof -ti:${PORT} 2>/dev/null || true)

if [ -n "$PID" ]; then
    echo -e "${YELLOW}[WARNING]${NC} Port ${PORT} is in use by process(es): ${PID}"
    echo -e "${YELLOW}[ACTION]${NC} Killing process(es)..."
    
    # Kill the process
    kill -9 $PID 2>/dev/null || true
    
    # Wait a moment for the port to be released
    sleep 2
    
    # Verify port is now free
    PID_CHECK=$(lsof -ti:${PORT} 2>/dev/null || true)
    if [ -n "$PID_CHECK" ]; then
        echo -e "${RED}[ERROR]${NC} Failed to free port ${PORT}"
        exit 1
    fi
    
    echo -e "${GREEN}[SUCCESS]${NC} Port ${PORT} is now free"
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
