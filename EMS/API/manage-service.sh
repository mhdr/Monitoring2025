#!/bin/bash

################################################################################
# EMS API - Service Management Helper Script
# 
# Quick commands for managing the EMS API service on Ubuntu
################################################################################

SERVICE_NAME="ems3_api"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_service_exists() {
    if ! systemctl list-unit-files | grep -q "${SERVICE_NAME}.service"; then
        print_error "Service ${SERVICE_NAME}.service not found"
        print_info "Run deploy-ubuntu.sh to install the service first"
        exit 1
    fi
}

cmd_start() {
    check_service_exists
    print_info "Starting ${SERVICE_NAME}.service..."
    sudo systemctl start ${SERVICE_NAME}.service
    sleep 1
    cmd_status
}

cmd_stop() {
    check_service_exists
    print_info "Stopping ${SERVICE_NAME}.service..."
    sudo systemctl stop ${SERVICE_NAME}.service
    print_success "Service stopped"
}

cmd_restart() {
    check_service_exists
    print_info "Restarting ${SERVICE_NAME}.service..."
    sudo systemctl restart ${SERVICE_NAME}.service
    sleep 2
    cmd_status
}

cmd_status() {
    check_service_exists
    sudo systemctl status ${SERVICE_NAME}.service --no-pager -l
}

cmd_enable() {
    check_service_exists
    print_info "Enabling ${SERVICE_NAME}.service to start on boot..."
    sudo systemctl enable ${SERVICE_NAME}.service
    print_success "Service enabled"
}

cmd_disable() {
    check_service_exists
    print_info "Disabling ${SERVICE_NAME}.service from starting on boot..."
    sudo systemctl disable ${SERVICE_NAME}.service
    print_success "Service disabled"
}

cmd_logs() {
    check_service_exists
    local lines="${1:-50}"
    print_info "Showing last ${lines} log lines (Ctrl+C to exit)..."
    sudo journalctl -u ${SERVICE_NAME}.service -n "$lines" -f
}

cmd_logs_all() {
    check_service_exists
    print_info "Showing all logs (Ctrl+C to exit)..."
    sudo journalctl -u ${SERVICE_NAME}.service -f
}

cmd_logs_errors() {
    check_service_exists
    print_info "Showing error logs..."
    sudo journalctl -u ${SERVICE_NAME}.service -p err -n 100 --no-pager
}

cmd_test() {
    check_service_exists
    print_info "Testing API endpoint..."
    
    # Get port from service file
    local port=$(grep -oP 'urls.*:(\d+)' /etc/systemd/system/${SERVICE_NAME}.service | grep -oP '\d+' | head -1)
    if [[ -z "$port" ]]; then
        port=5030
    fi
    
    # Test HTTP endpoint
    if command -v curl &> /dev/null; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/swagger/index.html" 2>/dev/null)
        if [[ "$response" == "200" ]]; then
            print_success "API is responding on port ${port}"
            print_info "Swagger UI: http://localhost:${port}/swagger"
        else
            print_error "API is not responding (HTTP ${response})"
            print_info "Check logs with: $0 logs"
        fi
    else
        print_error "curl not found. Install with: sudo apt install curl"
    fi
}

cmd_config() {
    check_service_exists
    print_info "Service configuration:"
    echo ""
    cat /etc/systemd/system/${SERVICE_NAME}.service
}

cmd_config_edit() {
    check_service_exists
    print_info "Opening service configuration..."
    sudo nano /etc/systemd/system/${SERVICE_NAME}.service
    print_info "Reloading systemd daemon..."
    sudo systemctl daemon-reload
    print_success "Configuration updated. Restart service to apply changes."
}

cmd_info() {
    check_service_exists
    
    echo ""
    echo -e "${GREEN}=== EMS API Service Information ===${NC}"
    echo ""
    
    # Service status
    if systemctl is-active --quiet ${SERVICE_NAME}.service; then
        echo -e "Status:           ${GREEN}Running ✓${NC}"
    else
        echo -e "Status:           ${RED}Stopped ✗${NC}"
    fi
    
    # Enabled status
    if systemctl is-enabled --quiet ${SERVICE_NAME}.service; then
        echo -e "Auto-start:       ${GREEN}Enabled ✓${NC}"
    else
        echo -e "Auto-start:       ${YELLOW}Disabled${NC}"
    fi
    
    # Installation directory
    local install_dir=$(grep WorkingDirectory /etc/systemd/system/${SERVICE_NAME}.service | cut -d'=' -f2)
    echo -e "Install Dir:      ${install_dir}"
    
    # Service user
    local service_user=$(grep "^User=" /etc/systemd/system/${SERVICE_NAME}.service | cut -d'=' -f2)
    echo -e "Service User:     ${service_user}"
    
    # Port
    local port=$(grep -oP 'urls.*:(\d+)' /etc/systemd/system/${SERVICE_NAME}.service | grep -oP '\d+' | head -1)
    echo -e "HTTP Port:        ${port}"
    
    # Memory limit
    local mem_limit=$(grep MemoryMax /etc/systemd/system/${SERVICE_NAME}.service | cut -d'=' -f2)
    echo -e "Memory Limit:     ${mem_limit}"
    
    # Uptime
    if systemctl is-active --quiet ${SERVICE_NAME}.service; then
        local uptime=$(systemctl show ${SERVICE_NAME}.service --property=ActiveEnterTimestamp | cut -d'=' -f2)
        echo -e "Running Since:    ${uptime}"
    fi
    
    # Server IP
    local server_ip=$(hostname -I | awk '{print $1}')
    if [[ -n "$server_ip" && -n "$port" ]]; then
        echo ""
        echo -e "${BLUE}=== Access URLs ===${NC}"
        echo -e "Local:            http://localhost:${port}/swagger"
        echo -e "Network:          http://${server_ip}:${port}/swagger"
    fi
    
    echo ""
}

cmd_backup() {
    check_service_exists
    
    local install_dir=$(grep WorkingDirectory /etc/systemd/system/${SERVICE_NAME}.service | cut -d'=' -f2)
    local backup_dir="${install_dir}.backup.$(date +%Y%m%d_%H%M%S)"
    
    print_info "Backing up ${install_dir} to ${backup_dir}..."
    sudo cp -r "$install_dir" "$backup_dir"
    print_success "Backup created: ${backup_dir}"
}

cmd_help() {
    echo ""
    echo -e "${GREEN}EMS API Service Manager${NC}"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  start              Start the service"
    echo "  stop               Stop the service"
    echo "  restart            Restart the service"
    echo "  status             Show service status"
    echo "  enable             Enable auto-start on boot"
    echo "  disable            Disable auto-start on boot"
    echo "  logs [lines]       Show logs (default: last 50 lines, follow mode)"
    echo "  logs-all           Show all logs (follow mode)"
    echo "  logs-errors        Show error logs only"
    echo "  test               Test API endpoint"
    echo "  info               Show service information"
    echo "  config             Show service configuration"
    echo "  config-edit        Edit service configuration"
    echo "  backup             Backup current installation"
    echo "  help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start           # Start the service"
    echo "  $0 logs 100        # Show last 100 log lines"
    echo "  $0 restart         # Restart the service"
    echo ""
}

# Main execution
case "${1:-help}" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    status)
        cmd_status
        ;;
    enable)
        cmd_enable
        ;;
    disable)
        cmd_disable
        ;;
    logs)
        cmd_logs "${2:-50}"
        ;;
    logs-all)
        cmd_logs_all
        ;;
    logs-errors)
        cmd_logs_errors
        ;;
    test)
        cmd_test
        ;;
    info)
        cmd_info
        ;;
    config)
        cmd_config
        ;;
    config-edit)
        cmd_config_edit
        ;;
    backup)
        cmd_backup
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        print_error "Unknown command: $1"
        cmd_help
        exit 1
        ;;
esac
