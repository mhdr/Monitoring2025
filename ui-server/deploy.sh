#!/bin/bash

# EMS3 UI Server Deployment Script
# This script deploys the UI server to /opt/ems3/ui and sets up systemd service

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/opt/ems3/ui"
SERVICE_NAME="ems3-ui"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running as root, elevate if necessary
if [ "$EUID" -ne 0 ]; then
    exec sudo "$0" "$@"
fi

print_info "Starting EMS3 UI Server deployment..."

# Stop the service if it's running
if systemctl is-active --quiet ${SERVICE_NAME}; then
    print_info "Stopping existing ${SERVICE_NAME} service..."
    systemctl stop ${SERVICE_NAME}
    print_success "Service stopped"
fi

# Create deployment directory
print_info "Creating deployment directory: ${DEPLOY_DIR}"
mkdir -p ${DEPLOY_DIR}

# Copy application files
print_info "Copying application files..."
rsync -av --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.env' \
    ${SCRIPT_DIR}/ ${DEPLOY_DIR}/

print_success "Application files copied"

# Install dependencies
print_info "Installing Node.js dependencies..."
cd ${DEPLOY_DIR}
npm install --production
print_success "Dependencies installed"

# Set proper permissions
print_info "Setting file permissions..."
chown -R root:root ${DEPLOY_DIR}
chmod -R 755 ${DEPLOY_DIR}
print_success "Permissions set"

# Create systemd service file
print_info "Creating systemd service file..."
cat > ${SERVICE_FILE} << 'EOF'
[Unit]
Description=EMS3 UI Server
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ems3/ui
ExecStart=/usr/bin/node /opt/ems3/ui/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ems3-ui

# Security settings
NoNewPrivileges=true
PrivateTmp=true

# Environment
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

print_success "Systemd service file created"

# Reload systemd daemon
print_info "Reloading systemd daemon..."
systemctl daemon-reload
print_success "Systemd daemon reloaded"

# Enable service to start on boot
print_info "Enabling ${SERVICE_NAME} service to start on boot..."
systemctl enable ${SERVICE_NAME}
print_success "Service enabled for auto-start on boot"

# Start the service
print_info "Starting ${SERVICE_NAME} service..."
systemctl start ${SERVICE_NAME}
print_success "Service started"

# Wait a moment for the service to initialize
sleep 2

# Check service status
print_info "Checking service status..."
if systemctl is-active --quiet ${SERVICE_NAME}; then
    print_success "Service is running successfully!"
    echo ""
    print_info "Service Status:"
    systemctl status ${SERVICE_NAME} --no-pager -l
    echo ""
    print_info "Application is deployed and running at /opt/ems3/ui"
    print_info "The service will start automatically on system boot"
    echo ""
    print_info "Useful commands:"
    echo "  - Check status:  sudo systemctl status ${SERVICE_NAME}"
    echo "  - Stop service:  sudo systemctl stop ${SERVICE_NAME}"
    echo "  - Start service: sudo systemctl start ${SERVICE_NAME}"
    echo "  - Restart:       sudo systemctl restart ${SERVICE_NAME}"
    echo "  - View logs:     sudo journalctl -u ${SERVICE_NAME} -f"
else
    print_error "Service failed to start. Check logs with: journalctl -u ${SERVICE_NAME} -xe"
    exit 1
fi

print_success "Deployment completed successfully!"

