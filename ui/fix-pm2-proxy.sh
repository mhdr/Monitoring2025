#!/bin/bash

# Quick Fix Script for PM2 API Proxy Issue
# Run this on the production server (192.168.70.10)

set -e  # Exit on error

COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[0;33m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

echo_info() {
    echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $1"
}

echo_success() {
    echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_RESET} $1"
}

echo_error() {
    echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"
}

echo_warning() {
    echo -e "${COLOR_YELLOW}[WARNING]${COLOR_RESET} $1"
}

echo ""
echo "========================================"
echo "  PM2 API Proxy Fix - Deployment"
echo "========================================"
echo ""

# Step 1: Check if backend is running
echo_info "Checking if backend API is running on port 5030..."
if curl -s http://localhost:5030/health > /dev/null 2>&1; then
    echo_success "Backend API is running"
else
    echo_error "Backend API is NOT running on port 5030"
    echo_warning "Please start the .NET backend first:"
    echo "  cd /path/to/backend && dotnet run"
    exit 1
fi

# Step 2: Stop PM2 app
echo ""
echo_info "Stopping PM2 app..."
pm2 stop ems3-ui || echo_warning "App was not running"

# Step 3: Pull latest code
echo ""
echo_info "Pulling latest code from Git..."
git pull origin main

# Step 3.5: Generate .env.production with auto-detected IP
echo ""
echo_info "Generating .env.production with server IP..."
chmod +x generate-env.sh
./generate-env.sh

# Step 4: Install dependencies (if needed)
echo ""
echo_info "Checking for new dependencies..."
npm install

# Step 5: Rebuild
echo ""
echo_info "Building production bundle..."
npm run build

if [ ! -f "dist/index.html" ]; then
    echo_error "Build failed - dist/index.html not found"
    exit 1
fi

echo_success "Build completed"

# Step 6: Delete and restart PM2 app with new config
echo ""
echo_info "Restarting PM2 app with new configuration..."
pm2 delete ems3-ui 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save

echo_success "PM2 app restarted"

# Step 7: Wait for app to start
echo ""
echo_info "Waiting for app to start (5 seconds)..."
sleep 5

# Step 8: Verify deployment
echo ""
echo "========================================"
echo "  Verification"
echo "========================================"
echo ""

# Check PM2 status
echo_info "PM2 Status:"
pm2 list | grep ems3-ui || echo_error "App not found in PM2"

# Check if API_URL is set
echo ""
echo_info "Environment Variables:"
pm2 info ems3-ui | grep -E "API_URL|PORT" || echo_warning "Environment variables not visible"

# Test frontend health
echo ""
echo_info "Testing frontend health endpoint..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo_success "Frontend is responding"
    curl -s http://localhost:3000/health
else
    echo_error "Frontend is NOT responding"
fi

# Test API proxy
echo ""
echo_info "Testing API proxy (login endpoint)..."
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/api_test.txt \
    http://localhost:3000/api/Auth/login \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"userName":"test","password":"Password@12345"}')

if [ "$RESPONSE" = "200" ]; then
    echo_success "API proxy is working! (HTTP 200)"
    cat /tmp/api_test.txt | jq . 2>/dev/null || cat /tmp/api_test.txt
elif [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "400" ]; then
    echo_success "API proxy is working! (HTTP $RESPONSE - backend is responding)"
    cat /tmp/api_test.txt
elif [ "$RESPONSE" = "404" ]; then
    echo_error "API proxy NOT working - still getting 404"
    echo_warning "Check PM2 logs: pm2 logs ems3-ui"
else
    echo_warning "Unexpected response: HTTP $RESPONSE"
    cat /tmp/api_test.txt
fi

# Show logs
echo ""
echo_info "Recent PM2 logs:"
pm2 logs ems3-ui --lines 20 --nostream

# Show access URLs
echo ""
echo "========================================"
echo "  Access URLs"
echo "========================================"
echo ""
echo "Frontend: http://192.168.70.10:3000"
echo "Health:   http://192.168.70.10:3000/health"
echo ""
echo_success "Deployment complete!"
echo ""
echo "If you still see 404 errors in the browser:"
echo "  1. Hard refresh the browser (Ctrl+Shift+R)"
echo "  2. Clear browser cache"
echo "  3. Check PM2 logs: pm2 logs ems3-ui"
echo ""
