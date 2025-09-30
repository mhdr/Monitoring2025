#!/bin/bash

# Stop UI Server
# This script stops any running UI server on port 8080

echo "🛑 Stopping UI Server..."

# Check if port 8080 is in use
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PID=$(lsof -Pi :8080 -sTCP:LISTEN -t)
    echo "Found server running with PID: $PID"
    kill -9 $PID 2>/dev/null
    sleep 1
    
    # Verify it stopped
    if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "❌ Failed to stop the server"
        exit 1
    else
        echo "✅ Server stopped successfully"
    fi
else
    echo "ℹ️  No server running on port 8080"
fi
