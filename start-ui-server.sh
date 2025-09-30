#!/bin/bash

# Quick Start Script - UI Server with SSL
# This script provides a one-command setup and start

echo "🚀 Starting UI Server Setup..."

# Check if we're in the root directory
if [ ! -d "ui" ] || [ ! -d "ui-server" ]; then
    echo "❌ Error: Please run this script from the project root directory"
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

# Run the deploy script
echo "📦 Building and deploying..."
./deploy.sh

# Start the server
echo "🔒 Starting HTTPS server..."
cd ui-server || exit
npm start
