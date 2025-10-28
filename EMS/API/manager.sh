#!/usr/bin/env bash

#################################################################################
# EMS3 API Management Script
# Description: Manages the EMS3 Monitoring API service
# Usage: ./manager.sh [operation_number]
#################################################################################

set -u  # Exit on undefined variable

# Configuration
SERVICE_NAME=ems3_api.service
DEPLOY_DIR=/opt/ems3/api
BACKUP_DIR=/opt/ems3/backups
API_URL="http://localhost:5030"
HEALTH_ENDPOINT="${API_URL}/health"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_CYAN='\033[0;36m'
COLOR_RESET='\033[0m'

# Check if operation passed as argument
BYPASS_USER_SELECTION=0
if [[ $# -gt 0 ]]; then
    BYPASS_USER_SELECTION=1
    OPERATION=$1
fi

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

log_header() {
    echo -e "${COLOR_CYAN}========================================${COLOR_RESET}"
    echo -e "${COLOR_CYAN}$1${COLOR_RESET}"
    echo -e "${COLOR_CYAN}========================================${COLOR_RESET}"
}

# Check if service exists
check_service_exists() {
    if ! systemctl list-unit-files | grep -q "^${SERVICE_NAME}"; then
        log_error "Service '${SERVICE_NAME}' is not installed"
        log_info "Run ./install.sh to install the service first"
        return 1
    fi
    return 0
}

# Check if running with appropriate privileges
check_privileges() {
    if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
        log_warning "Some operations require sudo privileges"
    fi
}

#################################################################################
# Service Operations
#################################################################################

# Start service
app_start() {
    log_header "Starting EMS3 API Service"
    
    if ! check_service_exists; then
        return 1
    fi
    
    if systemctl is-active --quiet ${SERVICE_NAME}; then
        log_warning "Service is already running"
        app_status
        return 0
    fi
    
    log_info "Starting service..."
    if sudo systemctl start ${SERVICE_NAME}; then
        log_success "Service started successfully"
        sleep 2
        app_status
        check_health
    else
        log_error "Failed to start service"
        return 1
    fi
}

# Stop service
app_stop() {
    log_header "Stopping EMS3 API Service"
    
    if ! check_service_exists; then
        return 1
    fi
    
    if ! systemctl is-active --quiet ${SERVICE_NAME}; then
        log_warning "Service is not running"
        return 0
    fi
    
    log_info "Stopping service..."
    if sudo systemctl stop ${SERVICE_NAME}; then
        log_success "Service stopped successfully"
    else
        log_error "Failed to stop service"
        return 1
    fi
}

# Restart service
app_restart() {
    log_header "Restarting EMS3 API Service"
    
    if ! check_service_exists; then
        return 1
    fi
    
    log_info "Restarting service..."
    if sudo systemctl restart ${SERVICE_NAME}; then
        log_success "Service restarted successfully"
        sleep 2
        app_status
        check_health
    else
        log_error "Failed to restart service"
        return 1
    fi
}

# Show service status
app_status() {
    log_header "EMS3 API Service Status"
    
    if ! check_service_exists; then
        return 1
    fi
    
    sudo systemctl status ${SERVICE_NAME} --no-pager -l
    echo ""
    
    # Show additional info
    if systemctl is-active --quiet ${SERVICE_NAME}; then
        local pid=$(systemctl show ${SERVICE_NAME} -p MainPID --value)
        if [[ "$pid" != "0" ]]; then
            log_info "Process ID: $pid"
            
            # Show memory usage
            if command -v ps &> /dev/null; then
                local mem=$(ps -p $pid -o rss= 2>/dev/null | awk '{print int($1/1024)" MB"}')
                if [[ -n "$mem" ]]; then
                    log_info "Memory usage: $mem"
                fi
            fi
        fi
    fi
}

# Deploy application
app_deploy() {
    log_header "Deploying EMS3 API"
    
    if [[ ! -f "install.sh" ]]; then
        log_error "install.sh not found in current directory"
        return 1
    fi
    
    # Convert line endings and make executable
    if command -v dos2unix &> /dev/null; then
        dos2unix install.sh 2>/dev/null || true
    fi
    chmod +x install.sh
    
    # Run installation
    log_info "Running installation script..."
    ./install.sh
}

# Show full log
app_full_log() {
    log_header "Full Service Log"
    
    if ! check_service_exists; then
        return 1
    fi
    
    journalctl -u ${SERVICE_NAME} --no-pager
}

# Show current boot log
app_current_log() {
    log_header "Current Boot Log"
    
    if ! check_service_exists; then
        return 1
    fi
    
    journalctl -u ${SERVICE_NAME} -b --no-pager
}

# Deploy and start
app_deploy_start() {
    log_header "Deploy and Start"
    
    app_stop
    echo ""
    app_deploy
    echo ""
    app_start
}

# Show live log
app_live_log() {
    log_header "Live Service Log (Ctrl+C to exit)"
    echo ""
    
    if ! check_service_exists; then
        return 1
    fi
    
    journalctl -u ${SERVICE_NAME} -f --no-pager
}

# Check health endpoint
check_health() {
    log_info "Checking health endpoint..."
    
    if ! command -v curl &> /dev/null; then
        log_warning "curl not installed, skipping health check"
        return 0
    fi
    
    local max_attempts=10
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s -f "${HEALTH_ENDPOINT}" > /dev/null 2>&1; then
            log_success "Health check passed: ${HEALTH_ENDPOINT}"
            return 0
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log_info "Waiting for service to be ready... (attempt $attempt/$max_attempts)"
            sleep 2
        fi
        
        attempt=$((attempt + 1))
    done
    
    log_warning "Health check failed after $max_attempts attempts"
    log_info "Service may still be starting or health endpoint may be unavailable"
    return 1
}

# Show service info
app_info() {
    log_header "EMS3 API Service Information"
    
    echo "Service Name: ${SERVICE_NAME}"
    echo "Deploy Directory: ${DEPLOY_DIR}"
    echo "API URL: ${API_URL}"
    echo "Health Endpoint: ${HEALTH_ENDPOINT}"
    echo ""
    
    if check_service_exists; then
        echo "Service Status: $(systemctl is-active ${SERVICE_NAME} 2>/dev/null || echo 'inactive')"
        echo "Auto-start: $(systemctl is-enabled ${SERVICE_NAME} 2>/dev/null || echo 'disabled')"
        
        if [[ -f "${DEPLOY_DIR}/API.dll" ]]; then
            echo "Installation: Present"
            local dll_date=$(stat -c %y "${DEPLOY_DIR}/API.dll" 2>/dev/null | cut -d' ' -f1)
            if [[ -n "$dll_date" ]]; then
                echo "Last deployed: $dll_date"
            fi
        else
            echo "Installation: Not found"
        fi
    else
        echo "Service Status: Not installed"
    fi
    
    echo ""
}

# Enable service auto-start
app_enable() {
    log_header "Enable Auto-Start"
    
    if ! check_service_exists; then
        return 1
    fi
    
    if systemctl is-enabled --quiet ${SERVICE_NAME} 2>/dev/null; then
        log_info "Service is already enabled for auto-start"
        return 0
    fi
    
    log_info "Enabling service for auto-start..."
    if sudo systemctl enable ${SERVICE_NAME}; then
        log_success "Service enabled for auto-start"
    else
        log_error "Failed to enable service"
        return 1
    fi
}

# Disable service auto-start
app_disable() {
    log_header "Disable Auto-Start"
    
    if ! check_service_exists; then
        return 1
    fi
    
    if ! systemctl is-enabled --quiet ${SERVICE_NAME} 2>/dev/null; then
        log_info "Service is already disabled"
        return 0
    fi
    
    log_info "Disabling service auto-start..."
    if sudo systemctl disable ${SERVICE_NAME}; then
        log_success "Service auto-start disabled"
    else
        log_error "Failed to disable service"
        return 1
    fi
}

# Show recent errors
app_errors() {
    log_header "Recent Service Errors"
    
    if ! check_service_exists; then
        return 1
    fi
    
    journalctl -u ${SERVICE_NAME} -p err -n 50 --no-pager
}

# Create backup
app_backup() {
    log_header "Backup EMS3 API"
    
    if [[ ! -d "$DEPLOY_DIR" ]]; then
        log_error "Deploy directory not found: $DEPLOY_DIR"
        return 1
    fi
    
    log_info "Creating backup..."
    sudo mkdir -p "$BACKUP_DIR"
    
    local backup_path="${BACKUP_DIR}/api_manual_backup_${TIMESTAMP}.tar.gz"
    
    if sudo tar -czf "$backup_path" -C "$(dirname $DEPLOY_DIR)" "$(basename $DEPLOY_DIR)" 2>/dev/null; then
        log_success "Backup created: $backup_path"
        
        # Show backup size
        local size=$(du -h "$backup_path" | cut -f1)
        log_info "Backup size: $size"
    else
        log_error "Backup failed"
        return 1
    fi
}

# List backups
app_list_backups() {
    log_header "Available Backups"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_info "No backup directory found"
        return 0
    fi
    
    local backups=$(sudo ls -1t "$BACKUP_DIR"/api_*.tar.gz 2>/dev/null)
    
    if [[ -z "$backups" ]]; then
        log_info "No backups found"
        return 0
    fi
    
    echo ""
    printf "%-5s %-45s %-15s %-20s\n" "#" "Backup File" "Size" "Date"
    echo "--------------------------------------------------------------------------------"
    
    local count=1
    while IFS= read -r backup; do
        local filename=$(basename "$backup")
        local size=$(du -h "$backup" 2>/dev/null | cut -f1)
        local date=$(stat -c %y "$backup" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
        printf "%-5s %-45s %-15s %-20s\n" "$count" "$filename" "$size" "$date"
        count=$((count + 1))
    done <<< "$backups"
    
    echo ""
}

# Configuration check
app_config_check() {
    log_header "Configuration Check"
    
    local config_file="${DEPLOY_DIR}/appsettings.Production.json"
    
    if [[ ! -f "$config_file" ]]; then
        log_error "Configuration file not found: $config_file"
        return 1
    fi
    
    log_success "Configuration file exists"
    
    # Check file permissions
    local perms=$(stat -c %a "$config_file" 2>/dev/null)
    if [[ "$perms" == "600" ]]; then
        log_success "Configuration file has secure permissions (600)"
    else
        log_warning "Configuration file permissions: $perms (recommended: 600)"
    fi
    
    # Check if file is readable
    if sudo cat "$config_file" > /dev/null 2>&1; then
        log_success "Configuration file is readable"
        
        # Validate JSON structure
        if command -v jq &> /dev/null; then
            if sudo jq empty "$config_file" 2>/dev/null; then
                log_success "Configuration file has valid JSON structure"
            else
                log_error "Configuration file has invalid JSON structure"
                return 1
            fi
        else
            log_info "jq not installed, skipping JSON validation"
        fi
    else
        log_error "Cannot read configuration file"
        return 1
    fi
}

#################################################################################
# Menu System
#################################################################################

show_menu() {
    clear
    log_header "EMS3 API Service Manager"
    echo ""
    echo "Service Operations:"
    echo "  1  - Start service"
    echo "  2  - Stop service"
    echo "  3  - Restart service"
    echo "  4  - Service status"
    echo "  5  - Deploy application"
    echo "  6  - Deploy and start"
    echo ""
    echo "Logs:"
    echo "  7  - Full log"
    echo "  8  - Current boot log"
    echo "  9  - Live log (tail -f)"
    echo "  10 - Recent errors"
    echo ""
    echo "Advanced:"
    echo "  11 - Service information"
    echo "  12 - Enable auto-start"
    echo "  13 - Disable auto-start"
    echo "  14 - Health check"
    echo "  15 - Configuration check"
    echo ""
    echo "Backup:"
    echo "  16 - Create backup"
    echo "  17 - List backups"
    echo ""
    echo "  0  - Exit"
    echo ""
}

#################################################################################
# Main
#################################################################################

main() {
    check_privileges
    
    if [[ ${BYPASS_USER_SELECTION} -eq 0 ]]; then
        while true; do
            show_menu
            read -p "Select operation: " OPERATION
            echo ""
            
            case ${OPERATION} in
                0)
                    log_info "Exiting..."
                    exit 0
                    ;;
                1) app_start ;;
                2) app_stop ;;
                3) app_restart ;;
                4) app_status ;;
                5) app_deploy ;;
                6) app_deploy_start ;;
                7) app_full_log ;;
                8) app_current_log ;;
                9) app_live_log ;;
                10) app_errors ;;
                11) app_info ;;
                12) app_enable ;;
                13) app_disable ;;
                14) check_health ;;
                15) app_config_check ;;
                16) app_backup ;;
                17) app_list_backups ;;
                *)
                    log_error "Invalid operation: ${OPERATION}"
                    ;;
            esac
            
            echo ""
            read -p "Press Enter to continue..."
        done
    else
        # Non-interactive mode
        case ${OPERATION} in
            1) app_start ;;
            2) app_stop ;;
            3) app_restart ;;
            4) app_status ;;
            5) app_deploy ;;
            6) app_deploy_start ;;
            7) app_full_log ;;
            8) app_current_log ;;
            9) app_live_log ;;
            10) app_errors ;;
            11) app_info ;;
            12) app_enable ;;
            13) app_disable ;;
            14) check_health ;;
            15) app_config_check ;;
            16) app_backup ;;
            17) app_list_backups ;;
            *)
                log_error "Invalid operation: ${OPERATION}"
                echo ""
                echo "Available operations:"
                echo "  1=start, 2=stop, 3=restart, 4=status, 5=deploy"
                echo "  6=deploy+start, 7=full-log, 8=current-log, 9=live-log"
                echo "  10=errors, 11=info, 12=enable, 13=disable, 14=health"
                echo "  15=config-check, 16=backup, 17=list-backups"
                exit 1
                ;;
        esac
    fi
}

# Run main function
main
