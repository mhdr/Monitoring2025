#!/usr/bin/env bash

set -e  # Exit on error

app_name=ems3-ui
app_port=3000

echo "========================================"
echo "EMS3 UI Deployment Script (Express + PM2)"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed!"
    echo "Please install Node.js 18+ first:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing PM2 globally..."
    sudo npm install -g pm2
    echo "PM2 installed successfully"
else
    echo "PM2 is already installed (version: $(pm2 --version))"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo ""
    echo "Installing dependencies..."
    npm install
else
    echo "Dependencies already installed"
fi

# Build the React app
echo ""
echo "Building React app..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

if [ ! -d "dist" ]; then
    echo "Error: dist directory not found after build!"
    exit 1
fi

echo "Build completed successfully"

# Create logs directory
echo ""
echo "Creating logs directory..."
mkdir -p logs

# Stop existing PM2 process if running
echo ""
if pm2 list | grep -q "${app_name}"; then
    echo "Stopping existing ${app_name} process..."
    pm2 stop ${app_name} || true
    pm2 delete ${app_name} || true
fi

# Start application with PM2
echo ""
echo "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot (only once)
if ! sudo systemctl list-unit-files | grep -q pm2-root.service; then
    echo ""
    echo "Setting up PM2 to start on boot..."
    sudo pm2 startup systemd -u $USER --hp $HOME
fi

# Show status
echo ""
pm2 list
pm2 info ${app_name}

echo ""
echo "========================================"
echo "Deployment completed successfully!"
echo "========================================"
echo ""
echo "UI is now accessible at:"
echo "  - http://localhost:${app_port}"
echo "  - http://$(hostname -I | awk '{print $1}'):${app_port}"
echo ""
echo "Health check:"
echo "  - http://localhost:${app_port}/health"
echo ""
echo "PM2 Commands:"
echo "  - View logs:    pm2 logs ${app_name}"
echo "  - Restart:      pm2 restart ${app_name}"
echo "  - Stop:         pm2 stop ${app_name}"
echo "  - Status:       pm2 status"
echo "  - Monitor:      pm2 monit"
echo ""
echo "Or use npm scripts:"
echo "  - npm start         (direct run without PM2)"
echo "  - npm run logs:pm2  (view logs)"
echo "  - npm run restart:pm2"
echo "  - npm run stop:pm2"
echo ""

