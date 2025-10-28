#!/usr/bin/env bash

#################################################################################
# EMS3 API Installation Script
# Description: Deploys and configures the EMS3 Monitoring API service
# Usage: ./install.sh [--skip-backup] [--force]
#################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
DEPLOY_DIR=/opt/ems3/api
BACKUP_DIR=/opt/ems3/backups
SERVICE_NAME=ems3_api.service
SERVICE_FILE=ems3_api.service
BUILD_CONFIG=Release
MIN_DOTNET_VERSION="9.0"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

# Parse command line arguments
SKIP_BACKUP=false
FORCE_INSTALL=false

for arg in "$@"; do
    case $arg in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --force)
            FORCE_INSTALL=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-backup    Skip backup of existing installation"
            echo "  --force          Force installation without confirmations"
            echo "  --help           Display this help message"
            exit 0
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $1"
}

log_success() {
    echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_RESET} $1"
}

log_warning() {
    echo -e "${COLOR_YELLOW}[WARNING]${COLOR_RESET} $1"
}

log_error() {
    echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"
}

# Error handler
error_exit() {
    log_error "$1"
    log_error "Installation failed. Check the logs above for details."
    exit 1
}

# Check if running with sudo/root
check_privileges() {
    if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
        log_warning "This script requires sudo privileges. You may be prompted for your password."
    fi
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check for dotnet
    if ! command -v dotnet &> /dev/null; then
        error_exit "dotnet CLI is not installed. Please install .NET $MIN_DOTNET_VERSION SDK or later."
    fi
    
    # Check dotnet version
    local dotnet_version=$(dotnet --version | cut -d'.' -f1)
    local required_version=$(echo $MIN_DOTNET_VERSION | cut -d'.' -f1)
    
    if [[ $dotnet_version -lt $required_version ]]; then
        error_exit "dotnet version $dotnet_version detected. Required: $MIN_DOTNET_VERSION or later."
    fi
    
    log_success "dotnet CLI found (version: $(dotnet --version))"
    
    # Check for systemctl
    if ! command -v systemctl &> /dev/null; then
        error_exit "systemctl is not available. This script requires systemd."
    fi
    
    log_success "systemctl found"
}

# Check if service file exists
check_service_file() {
    if [[ ! -f "$SERVICE_FILE" ]]; then
        error_exit "Service file '$SERVICE_FILE' not found in current directory."
    fi
    log_success "Service file found"
}

# Backup existing installation
backup_existing() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        log_warning "Skipping backup as requested"
        return
    fi
    
    if [[ -d "$DEPLOY_DIR" ]]; then
        log_info "Backing up existing installation..."
        
        sudo mkdir -p "$BACKUP_DIR"
        
        local backup_path="${BACKUP_DIR}/api_backup_${TIMESTAMP}.tar.gz"
        
        if sudo tar -czf "$backup_path" -C "$(dirname $DEPLOY_DIR)" "$(basename $DEPLOY_DIR)" 2>/dev/null; then
            log_success "Backup created: $backup_path"
            
            # Keep only last 5 backups
            local backup_count=$(sudo ls -1 "$BACKUP_DIR"/api_backup_*.tar.gz 2>/dev/null | wc -l)
            if [[ $backup_count -gt 5 ]]; then
                log_info "Cleaning old backups (keeping last 5)..."
                sudo ls -1t "$BACKUP_DIR"/api_backup_*.tar.gz | tail -n +6 | xargs sudo rm -f
            fi
        else
            log_warning "Backup failed, but continuing with installation"
        fi
    else
        log_info "No existing installation found, skipping backup"
    fi
}

# Stop service if running
stop_service() {
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        log_info "Stopping service: $SERVICE_NAME"
        sudo systemctl stop "$SERVICE_NAME" || log_warning "Failed to stop service (may not exist yet)"
    else
        log_info "Service is not running"
    fi
}

# Build and publish application
build_application() {
    log_info "Building application in $BUILD_CONFIG mode..."
    
    if ! dotnet restore; then
        error_exit "Failed to restore NuGet packages"
    fi
    
    log_success "NuGet packages restored"
    
    if ! dotnet build --configuration "$BUILD_CONFIG" --no-restore; then
        error_exit "Failed to build application"
    fi
    
    log_success "Application built successfully"
    
    log_info "Publishing application to $DEPLOY_DIR..."
    
    if ! sudo dotnet publish --output "$DEPLOY_DIR" --configuration "$BUILD_CONFIG" --no-build; then
        error_exit "Failed to publish application"
    fi
    
    log_success "Application published successfully"
}

# Set secure permissions
set_permissions() {
    log_info "Setting secure permissions..."
    
    # Set restrictive permissions on configuration files (contain passwords)
    local config_files=(
        "${DEPLOY_DIR}/appsettings.Production.json"
        "${DEPLOY_DIR}/appsettings.json"
    )
    
    for config_file in "${config_files[@]}"; do
        if [[ -f "$config_file" ]]; then
            sudo chmod 600 "$config_file"
            log_success "Set permissions (600) on $(basename $config_file)"
        fi
    done
    
    # Set ownership
    sudo chown -R root:root "$DEPLOY_DIR"
    log_success "Set ownership to root:root"
    
    # Make the main executable executable
    if [[ -f "${DEPLOY_DIR}/API.dll" ]]; then
        sudo chmod 644 "${DEPLOY_DIR}/API.dll"
        log_success "Set permissions on API.dll"
    fi
}

# Install systemd service
install_service() {
    log_info "Installing systemd service..."
    
    # Disable and remove old service if exists
    if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
        sudo systemctl disable "$SERVICE_NAME" || true
        log_info "Disabled existing service"
    fi
    
    # Copy service file
    sudo rm -f "/etc/systemd/system/$SERVICE_FILE"
    sudo cp "$SERVICE_FILE" "/etc/systemd/system/$SERVICE_FILE"
    sudo chmod 644 "/etc/systemd/system/$SERVICE_FILE"
    
    log_success "Service file installed"
    
    # Reload systemd
    sudo systemctl daemon-reload
    log_success "Systemd daemon reloaded"
    
    # Enable service
    sudo systemctl enable "$SERVICE_NAME"
    log_success "Service enabled for auto-start"
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."
    
    if [[ ! -f "${DEPLOY_DIR}/API.dll" ]]; then
        error_exit "API.dll not found in deployment directory"
    fi
    
    if [[ ! -f "/etc/systemd/system/$SERVICE_FILE" ]]; then
        error_exit "Service file not found in systemd directory"
    fi
    
    if ! systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
        error_exit "Service is not enabled"
    fi
    
    log_success "Installation verified successfully"
}

# Display summary
display_summary() {
    echo ""
    echo "=========================================="
    log_success "Installation completed successfully!"
    echo "=========================================="
    echo ""
    echo "Service name: $SERVICE_NAME"
    echo "Deploy directory: $DEPLOY_DIR"
    echo "Configuration: $BUILD_CONFIG"
    echo ""
    echo "Next steps:"
    echo "  1. Review configuration: $DEPLOY_DIR/appsettings.Production.json"
    echo "  2. Start the service: sudo systemctl start $SERVICE_NAME"
    echo "  3. Check status: sudo systemctl status $SERVICE_NAME"
    echo "  4. View logs: journalctl -u $SERVICE_NAME -f"
    echo ""
    echo "Or use the manager script: ./manager.sh"
    echo ""
}

#################################################################################
# Main Installation Process
#################################################################################

main() {
    log_info "=========================================="
    log_info "EMS3 API Installation Script"
    log_info "=========================================="
    echo ""
    
    # Pre-flight checks
    check_privileges
    check_dependencies
    check_service_file
    
    # Confirmation prompt
    if [[ "$FORCE_INSTALL" != true ]]; then
        echo ""
        log_warning "This will install/update EMS3 API to $DEPLOY_DIR"
        read -p "Continue? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Installation cancelled"
            exit 0
        fi
    fi
    
    echo ""
    
    # Installation steps
    backup_existing
    stop_service
    build_application
    set_permissions
    install_service
    verify_installation
    
    # Summary
    display_summary
}

# Run main function
main "$@"
