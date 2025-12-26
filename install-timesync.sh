#!/bin/bash

# Installation script for HTTP Time Sync service
# Following Monitoring2025 project patterns

# Color definitions
color_green='\033[0;32m'
color_red='\033[0;31m'
color_yellow='\033[1;33m'
color_blue='\033[0;34m'
color_nocolor='\033[0m'

echo -e "${color_blue}=== HTTP Time Sync Installation ===${color_nocolor}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${color_red}This script must be run as root${color_nocolor}"
   exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${color_blue}[1/7]${color_nocolor} Checking dependencies..."
if ! command -v dos2unix &> /dev/null; then
    echo -e "${color_yellow}Installing dos2unix...${color_nocolor}"
    apt-get update -qq && apt-get install -y -qq dos2unix
fi

if ! command -v proxychains4 &> /dev/null; then
    echo -e "${color_red}ERROR: proxychains4 is not installed!${color_nocolor}"
    echo "Please install proxychains4 first: apt-get install proxychains4"
    exit 1
fi

echo -e "${color_green}✓ Dependencies OK${color_nocolor}"

# Fix line endings
echo -e "${color_blue}[2/7]${color_nocolor} Converting line endings..."
dos2unix "$SCRIPT_DIR/sync-time-proxy.sh" 2>/dev/null
echo -e "${color_green}✓ Line endings fixed${color_nocolor}"

# Make script executable
echo -e "${color_blue}[3/7]${color_nocolor} Setting permissions..."
chmod +x "$SCRIPT_DIR/sync-time-proxy.sh"
echo -e "${color_green}✓ Script is executable${color_nocolor}"

# Create monitoring directory if not exists
echo -e "${color_blue}[4/7]${color_nocolor} Creating directories..."
mkdir -p /opt/monitoring
echo -e "${color_green}✓ Directories created${color_nocolor}"

# Copy files
echo -e "${color_blue}[5/7]${color_nocolor} Copying files..."
cp "$SCRIPT_DIR/sync-time-proxy.sh" /opt/monitoring/
cp "$SCRIPT_DIR/monitoring-timesync.service" /etc/systemd/system/
cp "$SCRIPT_DIR/monitoring-timesync.timer" /etc/systemd/system/
echo -e "${color_green}✓ Files copied${color_nocolor}"

# Reload systemd
echo -e "${color_blue}[6/7]${color_nocolor} Reloading systemd..."
systemctl daemon-reload
echo -e "${color_green}✓ Systemd reloaded${color_nocolor}"

# Enable and start timer
echo -e "${color_blue}[7/7]${color_nocolor} Enabling and starting timer..."
systemctl enable monitoring-timesync.timer
systemctl start monitoring-timesync.timer
echo -e "${color_green}✓ Timer enabled and started${color_nocolor}"

echo ""
echo -e "${color_green}=== Installation Complete ===${color_nocolor}"
echo ""

# Display status
echo -e "${color_blue}Timer Status:${color_nocolor}"
systemctl status monitoring-timesync.timer --no-pager -l

echo ""
echo -e "${color_blue}Next scheduled run:${color_nocolor}"
systemctl list-timers monitoring-timesync.timer --no-pager

echo ""
echo -e "${color_blue}Manual Commands:${color_nocolor}"
echo -e "  ${color_yellow}Run sync now:${color_nocolor}       systemctl start monitoring-timesync.service"
echo -e "  ${color_yellow}View logs:${color_nocolor}          journalctl -u monitoring-timesync.service -f"
echo -e "  ${color_yellow}Timer status:${color_nocolor}       systemctl status monitoring-timesync.timer"
echo -e "  ${color_yellow}Disable timer:${color_nocolor}      systemctl disable --now monitoring-timesync.timer"
echo ""

# Offer to run initial sync
echo -e "${color_yellow}Would you like to run an initial time sync now? (y/n)${color_nocolor}"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${color_blue}Running initial sync...${color_nocolor}"
    systemctl start monitoring-timesync.service
    
    sleep 3
    
    echo ""
    echo -e "${color_blue}Sync Result:${color_nocolor}"
    journalctl -u monitoring-timesync.service -n 50 --no-pager
fi

echo ""
echo -e "${color_green}Installation successful!${color_nocolor}"
