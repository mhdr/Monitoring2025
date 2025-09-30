#!/bin/bash

# Build and Deploy Script
# This script builds the React app and deploys it to the Express server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Building and Deploying React App ===${NC}"

# Step 1: Navigate to UI folder and install dependencies
echo -e "${YELLOW}Step 1: Installing UI dependencies...${NC}"
cd ui
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "Dependencies already installed"
fi

# Step 2: Build the React app
echo -e "${YELLOW}Step 2: Building React app...${NC}"
npm run build

# Step 3: Navigate to ui-server and install dependencies
echo -e "${YELLOW}Step 3: Installing UI Server dependencies...${NC}"
cd ../ui-server
npm install

# Step 4: Create public directory if it doesn't exist
echo -e "${YELLOW}Step 4: Preparing deployment directory...${NC}"
if [ -d "public" ]; then
    echo "Removing old deployment files..."
    rm -rf public
fi
mkdir -p public

# Step 5: Copy built files from ui/dist to ui-server/public
echo -e "${YELLOW}Step 5: Copying build files to server...${NC}"
cp -r ../ui/dist/* public/

# Step 6: Check for SSL certificates and create if needed
echo -e "${YELLOW}Step 6: Checking SSL certificates...${NC}"
if [ ! -f "certificates/ui-server-cert.pem" ] || [ ! -f "certificates/ui-server-key.pem" ]; then
    echo -e "${YELLOW}SSL certificates not found. Creating them...${NC}"
    chmod +x create-ssl-certificates.sh
    ./create-ssl-certificates.sh
else
    echo "SSL certificates already exist"
fi

# Step 7: Return to root directory
cd ..

echo -e "${GREEN}=== Build and Deploy Complete! ===${NC}"
echo -e "${GREEN}Built files are now in: ui-server/public${NC}"
echo -e "${YELLOW}To start the HTTPS server, run:${NC}"
echo -e "  cd ui-server"
echo -e "  npm start"
echo -e "${GREEN}The server will be available at: https://localhost:8080${NC}"
