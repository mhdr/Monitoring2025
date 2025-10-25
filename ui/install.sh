#!/usr/bin/env bash

set -e  # Exit on error
set -o pipefail  # Catch errors in pipes

# Configuration
app_name=ems3-ui
app_port=3000
min_node_version=18
min_disk_space_mb=500
backup_dir="./backups"
log_file="./logs/install-$(date +%Y%m%d-%H%M%S).log"

# Color output
color_green='\033[0;32m'
color_red='\033[0;31m'
color_yellow='\033[0;33m'
color_blue='\033[0;34m'
color_nocolor='\033[0m'

# Logging functions
log_info() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [INFO] $1"
    echo -e "${color_blue}${msg}${color_nocolor}"
    echo "$msg" >> "$log_file" 2>/dev/null || true
}

log_success() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS] $1"
    echo -e "${color_green}${msg}${color_nocolor}"
    echo "$msg" >> "$log_file" 2>/dev/null || true
}

log_warning() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [WARNING] $1"
    echo -e "${color_yellow}${msg}${color_nocolor}"
    echo "$msg" >> "$log_file" 2>/dev/null || true
}

log_error() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $1"
    echo -e "${color_red}${msg}${color_nocolor}" >&2
    echo "$msg" >> "$log_file" 2>/dev/null || true
}

# Cleanup function
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Installation failed with exit code $exit_code"
        log_warning "Check log file: $log_file"
        log_info "To rollback, run: ./manager.sh and select 'Restore from backup'"
    fi
}

trap cleanup EXIT

echo "========================================"
echo "EMS3 UI Deployment Script (Express + PM2)"
echo "========================================"
log_info "Starting deployment process..."
mkdir -p logs

# Pre-flight checks
log_info "Running pre-flight checks..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed!"
    echo "Please install Node.js ${min_node_version}+ first:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

node_version=$(node --version | sed 's/v//')
node_major=$(echo "$node_version" | cut -d. -f1)
log_info "Node.js version: v$node_version"
log_info "npm version: $(npm --version)"

# Validate Node.js version
if [ "$node_major" -lt "$min_node_version" ]; then
    log_error "Node.js version must be $min_node_version or higher (found: v$node_version)"
    exit 1
fi
log_success "Node.js version check passed"

# Check available disk space
available_space_mb=$(df -m . | tail -1 | awk '{print $4}')
log_info "Available disk space: ${available_space_mb}MB"
if [ "$available_space_mb" -lt "$min_disk_space_mb" ]; then
    log_error "Insufficient disk space. Required: ${min_disk_space_mb}MB, Available: ${available_space_mb}MB"
    exit 1
fi
log_success "Disk space check passed"

# Check if port is available
if command -v netstat &> /dev/null; then
    if netstat -tuln 2>/dev/null | grep -q ":${app_port} "; then
        log_warning "Port ${app_port} is already in use"
        log_info "Will attempt to stop existing process during deployment"
    else
        log_success "Port ${app_port} is available"
    fi
elif command -v ss &> /dev/null; then
    if ss -tuln 2>/dev/null | grep -q ":${app_port} "; then
        log_warning "Port ${app_port} is already in use"
        log_info "Will attempt to stop existing process during deployment"
    else
        log_success "Port ${app_port} is available"
    fi
fi

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    log_warning "PM2 is not installed. Installing PM2 globally..."
    
    # Try to install without sudo first (if npm is in user space)
    if npm install -g pm2 2>/dev/null; then
        log_success "PM2 installed successfully"
    else
        # If that fails, try with sudo using full npm path
        NPM_PATH=$(which npm)
        if [ -n "$NPM_PATH" ]; then
            log_info "Installing PM2 with elevated permissions..."
            sudo "$NPM_PATH" install -g pm2
            log_success "PM2 installed successfully"
        else
            log_warning "Could not install PM2 globally."
            log_info "You can install it manually: npm install -g pm2"
            log_info "Or the application will still work with: npm start"
        fi
    fi
else
    log_success "PM2 is already installed (version: $(pm2 --version))"
fi

# Create backup of existing deployment
if [ -d "dist" ]; then
    log_info "Creating backup of existing deployment..."
    mkdir -p "$backup_dir"
    backup_name="dist-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "${backup_dir}/${backup_name}" dist/ 2>/dev/null || true
    
    # Keep only last 5 backups
    backup_count=$(ls -1 "$backup_dir"/dist-backup-*.tar.gz 2>/dev/null | wc -l)
    if [ "$backup_count" -gt 5 ]; then
        log_info "Cleaning old backups (keeping last 5)..."
        ls -1t "$backup_dir"/dist-backup-*.tar.gz | tail -n +6 | xargs rm -f
    fi
    log_success "Backup created: ${backup_name}"
fi

# Install dependencies (always run to ensure all packages are up to date)
log_info "Installing dependencies..."
if npm install; then
    log_success "Dependencies installed successfully"
else
    log_error "Failed to install dependencies"
    exit 1
fi

# Auto-generate .env.production with server IP
log_info "Generating .env.production with auto-detected server IP..."

# Detect server IP (prioritize non-localhost addresses)
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

# Fallback to localhost if detection failed
if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" == "127.0.0.1" ]; then
    log_warning "Could not auto-detect server IP, using localhost"
    SERVER_IP="localhost"
else
    log_success "Detected Server IP: $SERVER_IP"
fi

# Backend port (default 5030)
BACKEND_PORT="${BACKEND_PORT:-5030}"
API_URL="http://${SERVER_IP}:${BACKEND_PORT}"

# Create .env.production file
cat > .env.production << EOF
# Production Environment Variables
# Auto-generated on $(date)
# Server IP: $SERVER_IP

# Backend API URL - Direct access (no proxy needed)
VITE_API_BASE_URL=$API_URL
EOF

log_success "Created .env.production with API URL: $API_URL"

# Validate .env.production
if [ ! -f ".env.production" ]; then
    log_error ".env.production file was not created"
    exit 1
fi

if ! grep -q "VITE_API_BASE_URL" .env.production; then
    log_error ".env.production is missing VITE_API_BASE_URL"
    exit 1
fi
log_success ".env.production validation passed"

# Test backend connectivity with retry
log_info "Testing backend connectivity..."
backend_attempts=0
backend_max_attempts=3
backend_available=false

while [ $backend_attempts -lt $backend_max_attempts ]; do
    if curl -s --connect-timeout 3 "${API_URL}/health" > /dev/null 2>&1; then
        backend_available=true
        break
    fi
    backend_attempts=$((backend_attempts + 1))
    if [ $backend_attempts -lt $backend_max_attempts ]; then
        log_warning "Backend not responding, retrying ($backend_attempts/$backend_max_attempts)..."
        sleep 2
    fi
done

if [ "$backend_available" = true ]; then
    log_success "Backend is accessible at $API_URL"
else
    log_warning "Backend not responding at $API_URL (after $backend_max_attempts attempts)"
    log_warning "Make sure the backend is running before accessing the UI"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Deployment cancelled by user"
        exit 1
    fi
fi

# Build the React app
log_info "Building React app..."
build_start_time=$(date +%s)

if npm run build; then
    build_end_time=$(date +%s)
    build_duration=$((build_end_time - build_start_time))
    log_success "Build completed successfully in ${build_duration}s"
else
    log_error "Build failed!"
    exit 1
fi

# Validate build output
if [ ! -d "dist" ]; then
    log_error "dist directory not found after build!"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    log_error "dist/index.html not found after build!"
    exit 1
fi

# Show build statistics
file_count=$(find dist -type f | wc -l)
dist_size=$(du -sh dist 2>/dev/null | cut -f1)
log_success "Build output: ${file_count} files, ${dist_size} total"

# Create logs directory
log_info "Creating logs directory..."
mkdir -p logs

# Stop existing PM2 process if running
if command -v pm2 &> /dev/null && pm2 list | grep -q "${app_name}"; then
    log_info "Stopping existing ${app_name} process..."
    pm2 stop ${app_name} || true
    pm2 delete ${app_name} || true
    log_success "Stopped and removed existing process"
fi

# Start application with PM2 (if available)
if command -v pm2 &> /dev/null; then
    log_info "Starting application with PM2..."
    if pm2 start ecosystem.config.cjs; then
        log_success "Application started with PM2"
        
        # Save PM2 process list
        pm2 save
        
        # Setup PM2 to start on system boot (only once)
        if ! sudo systemctl list-unit-files 2>/dev/null | grep -q pm2-root.service; then
            log_info "Setting up PM2 to start on boot..."
            sudo pm2 startup systemd -u "$USER" --hp "$HOME" || log_warning "Failed to setup PM2 startup"
        fi
        
        # Wait for app to initialize
        log_info "Waiting for application to initialize..."
        sleep 3
        
        # Verify app is running
        if pm2 list | grep "${app_name}" | grep -q "online"; then
            log_success "Application is running"
        else
            log_error "Application failed to start properly"
            pm2 logs ${app_name} --lines 20 --nostream
            exit 1
        fi
        
        # Show status
        echo ""
        pm2 list
        pm2 info ${app_name}
    else
        log_error "Failed to start application with PM2"
        exit 1
    fi
else
    log_warning "PM2 not available. You can start the application manually with:"
    echo "  npm start"
    echo ""
    echo "Or install PM2 and use:"
    echo "  npm install -g pm2"
    echo "  npm run start:pm2"
fi

echo ""
echo "========================================"
log_success "Deployment completed successfully!"
echo "========================================"
echo ""
echo "UI is now accessible at:"
echo "  - http://localhost:${app_port}"
if [ "$SERVER_IP" != "localhost" ]; then
    echo "  - http://${SERVER_IP}:${app_port}"
fi
echo ""
echo "Health check:"
echo "  - http://localhost:${app_port}/health"
echo ""

if command -v pm2 &> /dev/null; then
    echo "PM2 Commands:"
    echo "  - View logs:    pm2 logs ${app_name}"
    echo "  - Restart:      pm2 restart ${app_name}"
    echo "  - Stop:         pm2 stop ${app_name}"
    echo "  - Status:       pm2 status"
    echo "  - Monitor:      pm2 monit"
    echo ""
fi

echo "NPM Scripts:"
echo "  - npm start         (direct run without PM2)"
if command -v pm2 &> /dev/null; then
    echo "  - npm run logs:pm2  (view logs)"
    echo "  - npm run restart:pm2"
    echo "  - npm run stop:pm2"
fi
echo ""
echo "Management Script:"
echo "  - ./manager.sh      (interactive management menu)"
echo ""

log_info "Installation log saved to: $log_file"


