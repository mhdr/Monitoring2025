#!/bin/bash

# Start UI Server (without building)
# Use this when you've already built the app and just want to start the server

echo "🔒 Starting HTTPS UI Server..."

# Check if we're in the root directory
if [ ! -d "ui-server" ]; then
    echo "❌ Error: ui-server directory not found"
    exit 1
fi

# Check if public directory exists
if [ ! -d "ui-server/public" ]; then
    echo "❌ Error: No built files found in ui-server/public"
    echo "💡 Run './deploy.sh' first to build and deploy the app"
    exit 1
fi

# Check if port 8080 is already in use
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 8080 is already in use. Stopping existing server..."
    PID=$(lsof -Pi :8080 -sTCP:LISTEN -t)
    kill -9 $PID 2>/dev/null
    sleep 1
    echo "✅ Stopped process $PID"
fi

# Start the server
cd ui-server || exit
npm start
