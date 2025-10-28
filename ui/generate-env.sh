#!/bin/bash

# Auto-detect Server IP and Generate .env.production
# This script detects the server's public/network IP and creates .env.production

set -e

COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

echo_info() {
    echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $1"
}

echo_success() {
    echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_RESET} $1"
}

echo ""
echo "========================================"
echo "  Auto-Generate .env.production"
echo "========================================"
echo ""

# Detect server IP (prioritize non-localhost addresses)
echo_info "Detecting server IP address..."

# Try multiple methods to get the IP
SERVER_IP=""

# Method 1: hostname -I (most reliable on Linux)
if command -v hostname &> /dev/null; then
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

# Method 2: ip route (if hostname fails)
if [ -z "$SERVER_IP" ] && command -v ip &> /dev/null; then
    SERVER_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+')
fi

# Method 3: ifconfig (fallback for older systems)
if [ -z "$SERVER_IP" ] && command -v ifconfig &> /dev/null; then
    SERVER_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1)
fi

# Method 4: Check common network interfaces
if [ -z "$SERVER_IP" ]; then
    for iface in eth0 ens33 enp0s3 wlan0; do
        if [ -d "/sys/class/net/$iface" ]; then
            SERVER_IP=$(ip addr show $iface 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n1)
            [ -n "$SERVER_IP" ] && break
        fi
    done
fi

# Validate IP address
if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" == "127.0.0.1" ]; then
    echo_info "Could not auto-detect IP. Please enter manually:"
    read -p "Server IP address: " SERVER_IP
fi

echo_success "Detected Server IP: $SERVER_IP"

# Backend port (default 5030)
BACKEND_PORT="${BACKEND_PORT:-5030}"

# Generate API URL
API_URL="http://${SERVER_IP}:${BACKEND_PORT}"

echo ""
echo_info "Configuration:"
echo "  Server IP:    $SERVER_IP"
echo "  Backend Port: $BACKEND_PORT"
echo "  API URL:      $API_URL"
echo ""

# Create .env.production file
ENV_FILE=".env.production"

echo_info "Creating $ENV_FILE..."

cat > "$ENV_FILE" << EOF
# Production Environment Variables
# Auto-generated on $(date)
# Server IP: $SERVER_IP

# Backend API URL - Direct access (no proxy needed)
VITE_API_BASE_URL=$API_URL

# Optional: Override in PM2 ecosystem.config.cjs if needed
# API_URL=$API_URL
EOF

echo_success "Created $ENV_FILE"
echo ""

# Show file contents
echo_info "File contents:"
cat "$ENV_FILE"
echo ""

# Verify backend is accessible
echo_info "Testing backend connectivity..."
if curl -s --connect-timeout 5 "${API_URL}/health" > /dev/null 2>&1; then
    echo_success "Backend is accessible at $API_URL"
else
    echo -e "${COLOR_YELLOW}[WARNING]${COLOR_RESET} Backend not responding at $API_URL"
    echo "Make sure the backend is running before building:"
    echo "  cd /path/to/backend && dotnet run"
fi

echo ""
echo_success "Configuration complete!"
echo ""
echo "Next steps:"
echo "  1. npm run build      # Build with new API URL"
echo "  2. pm2 restart ems3-ui  # Restart PM2 (if using PM2)"
echo ""
