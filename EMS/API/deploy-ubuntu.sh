#!/bin/bash

################################################################################
# EMS API - Automated Ubuntu Deployment Script
# 
# This script automates the deployment of EMS API as a systemd service on Ubuntu
# 
# Usage:
#   sudo ./deploy-ubuntu.sh [options]
#
# Options:
#   --user <username>          Service user (default: ems3api)
#   --install-dir <path>       Installation directory (default: /opt/ems3/api)
#   --db-host <host>          Database host (default: localhost)
#   --db-name <name>          Database name (default: monitoring_users)
#   --db-user <user>          Database username (default: monitoring)
#   --db-password <pass>      Database password (required)
#   --port <port>             HTTP port (default: 5030)
#   --skip-dotnet-check       Skip .NET runtime check
#   --skip-backup             Skip backing up existing installation
#   --help                    Show this help message
#
################################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
SERVICE_USER="root"
INSTALL_DIR="/opt/ems3/api"
DB_HOST="localhost"
DB_NAME="monitoring_users"
DB_USER="monitoring"
DB_PASSWORD=""
HTTP_PORT="5030"
SKIP_DOTNET_CHECK=false
SKIP_BACKUP=false
SERVICE_NAME="ems3_api"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

################################################################################
# Functions
################################################################################

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
}

show_help() {
    grep '^#' "$0" | grep -v '#!/bin/bash' | sed 's/^# //' | sed 's/^#//'
    exit 0
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --user)
                SERVICE_USER="$2"
                shift 2
                ;;
            --install-dir)
                INSTALL_DIR="$2"
                shift 2
                ;;
            --db-host)
                DB_HOST="$2"
                shift 2
                ;;
            --db-name)
                DB_NAME="$2"
                shift 2
                ;;
            --db-user)
                DB_USER="$2"
                shift 2
                ;;
            --db-password)
                DB_PASSWORD="$2"
                shift 2
                ;;
            --port)
                HTTP_PORT="$2"
                shift 2
                ;;
            --skip-dotnet-check)
                SKIP_DOTNET_CHECK=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --help)
                show_help
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                ;;
        esac
    done
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if running on Ubuntu
    if [[ ! -f /etc/os-release ]]; then
        print_error "Cannot determine OS. This script is designed for Ubuntu."
        exit 1
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        print_warning "This script is designed for Ubuntu. Detected: $ID"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Running on Ubuntu $VERSION"
    fi
    
    # Check for systemd
    if ! command -v systemctl &> /dev/null; then
        print_error "systemd not found. This script requires systemd."
        exit 1
    fi
    print_success "systemd detected"
    
    # Check for .NET runtime
    if [[ "$SKIP_DOTNET_CHECK" == false ]]; then
        if ! command -v dotnet &> /dev/null; then
            print_error ".NET runtime not found"
            print_info "Install .NET 9.0 runtime:"
            print_info "  wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh"
            print_info "  chmod +x dotnet-install.sh"
            print_info "  sudo ./dotnet-install.sh --channel 9.0 --runtime aspnetcore"
            exit 1
        fi
        
        DOTNET_VERSION=$(dotnet --version 2>/dev/null || echo "unknown")
        print_success ".NET runtime detected: $DOTNET_VERSION"
        
        # Check if .NET 9.0 is installed
        if ! dotnet --list-runtimes 2>/dev/null | grep -q "Microsoft.AspNetCore.App 9."; then
            print_warning ".NET 9.0 ASP.NET Core runtime not found"
            print_info "Install it with:"
            print_info "  wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh"
            print_info "  chmod +x dotnet-install.sh"
            print_info "  sudo ./dotnet-install.sh --channel 9.0 --runtime aspnetcore"
            read -p "Continue anyway? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        else
            print_success ".NET 9.0 ASP.NET Core runtime found"
        fi
    fi
    
    # Check for PostgreSQL (optional)
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL client not found (optional)"
        print_info "Database connectivity will not be tested"
    else
        print_success "PostgreSQL client detected"
    fi
    
    # Validate database password
    if [[ -z "$DB_PASSWORD" ]]; then
        print_warning "Database password not provided via --db-password"
        read -sp "Enter database password (or press Enter to skip): " DB_PASSWORD
        echo
        if [[ -z "$DB_PASSWORD" ]]; then
            print_warning "No database password provided. Service will fail to start without valid credentials."
        fi
    fi
}

check_published_files() {
    print_header "Checking Published Files"
    
    if [[ ! -d "$SCRIPT_DIR/publish" ]]; then
        print_error "Published files not found at: $SCRIPT_DIR/publish"
        print_info "Please build and publish the application first:"
        print_info "  cd $SCRIPT_DIR"
        print_info "  dotnet publish -c Release -o ./publish"
        exit 1
    fi
    
    if [[ ! -f "$SCRIPT_DIR/publish/API.dll" ]]; then
        print_error "API.dll not found in publish directory"
        exit 1
    fi
    
    print_success "Published files found"
}

create_service_user() {
    print_header "Creating Service User"
    
    if [[ "$SERVICE_USER" == "root" ]]; then
        print_info "Service will run as root user"
        return
    fi
    
    if id "$SERVICE_USER" &>/dev/null; then
        print_info "User '$SERVICE_USER' already exists"
    else
        print_info "Creating system user: $SERVICE_USER"
        useradd -r -s /bin/false "$SERVICE_USER"
        print_success "User created: $SERVICE_USER"
    fi
}

backup_existing_installation() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        print_info "Skipping backup (--skip-backup flag set)"
        return
    fi
    
    if [[ -d "$INSTALL_DIR" ]]; then
        print_header "Backing Up Existing Installation"
        
        BACKUP_DIR="${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
        print_info "Backing up to: $BACKUP_DIR"
        
        cp -r "$INSTALL_DIR" "$BACKUP_DIR"
        print_success "Backup created: $BACKUP_DIR"
        
        # Keep only last 5 backups
        print_info "Cleaning up old backups (keeping last 5)"
        ls -dt ${INSTALL_DIR}.backup.* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
    fi
}

stop_existing_service() {
    print_header "Stopping Existing Service"
    
    if systemctl is-active --quiet ${SERVICE_NAME}.service; then
        print_info "Stopping ${SERVICE_NAME}.service"
        systemctl stop ${SERVICE_NAME}.service
        print_success "Service stopped"
    else
        print_info "Service is not running"
    fi
}

deploy_application() {
    print_header "Deploying Application"
    
    # Create installation directory
    print_info "Creating installation directory: $INSTALL_DIR"
    mkdir -p "$INSTALL_DIR"
    
    # Copy published files
    print_info "Copying published files..."
    cp -r "$SCRIPT_DIR/publish/"* "$INSTALL_DIR/"
    print_success "Files copied to $INSTALL_DIR"
    
    # Create production appsettings if it doesn't exist
    if [[ ! -f "$INSTALL_DIR/appsettings.Production.json" ]]; then
        print_info "Creating appsettings.Production.json"
        cat > "$INSTALL_DIR/appsettings.Production.json" <<EOF
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Host=${DB_HOST};Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASSWORD}"
  }
}
EOF
        print_success "Created appsettings.Production.json"
    else
        print_info "appsettings.Production.json already exists (not overwriting)"
    fi
    
    # Set ownership
    if [[ "$SERVICE_USER" != "root" ]]; then
        print_info "Setting ownership to $SERVICE_USER"
        chown -R ${SERVICE_USER}:${SERVICE_USER} "$INSTALL_DIR"
    fi
    
    # Set permissions
    chmod +x "$INSTALL_DIR/API.dll"
    print_success "Permissions set"
}

install_systemd_service() {
    print_header "Installing Systemd Service"
    
    # Create service file
    SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
    print_info "Creating service file: $SERVICE_FILE"
    
    # Encode connection string for systemd (escape special characters)
    CONNECTION_STRING="Host=${DB_HOST};Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASSWORD}"
    ENCODED_CONNECTION_STRING=$(echo "$CONNECTION_STRING" | sed 's/;/\\x3b/g' | sed 's/=/\\x3d/g')
    
    cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=EMS3 API - Monitoring System API Service
After=syslog.target network.target postgresql.service

[Service]
User=${SERVICE_USER}
Type=notify
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/dotnet ${INSTALL_DIR}/API.dll --urls "http://0.0.0.0:${HTTP_PORT}" --contentRoot ${INSTALL_DIR} --environment Production
SuccessExitStatus=143
MemoryMax=4096M
Restart=always
RestartSec=10
KillSignal=SIGINT
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false
Environment=ConnectionStrings__DefaultConnection=${ENCODED_CONNECTION_STRING}
SyslogIdentifier=ems3-api

[Install]
Alias=${SERVICE_NAME}.service
WantedBy=multi-user.target
EOF
    
    print_success "Service file created"
    
    # Reload systemd
    print_info "Reloading systemd daemon"
    systemctl daemon-reload
    print_success "Systemd daemon reloaded"
    
    # Enable service
    print_info "Enabling service to start on boot"
    systemctl enable ${SERVICE_NAME}.service
    print_success "Service enabled"
}

start_service() {
    print_header "Starting Service"
    
    print_info "Starting ${SERVICE_NAME}.service"
    systemctl start ${SERVICE_NAME}.service
    
    # Wait a moment for service to start
    sleep 2
    
    if systemctl is-active --quiet ${SERVICE_NAME}.service; then
        print_success "Service started successfully"
    else
        print_error "Service failed to start"
        print_info "Check logs with: journalctl -u ${SERVICE_NAME}.service -n 50"
        exit 1
    fi
}

verify_deployment() {
    print_header "Verifying Deployment"
    
    # Check service status
    print_info "Service status:"
    systemctl status ${SERVICE_NAME}.service --no-pager -l
    
    # Wait for service to be fully ready
    print_info "Waiting for service to be ready..."
    sleep 3
    
    # Test HTTP endpoint
    print_info "Testing HTTP endpoint: http://localhost:${HTTP_PORT}/swagger/index.html"
    
    if command -v curl &> /dev/null; then
        if curl -f -s -o /dev/null -w "%{http_code}" "http://localhost:${HTTP_PORT}/swagger/index.html" | grep -q "200"; then
            print_success "API is responding on port ${HTTP_PORT}"
        else
            print_warning "API might not be responding yet. Check logs:"
            print_info "  journalctl -u ${SERVICE_NAME}.service -f"
        fi
    else
        print_warning "curl not found. Cannot test HTTP endpoint."
    fi
}

configure_firewall() {
    print_header "Firewall Configuration"
    
    if command -v ufw &> /dev/null; then
        print_info "UFW firewall detected"
        
        if ufw status | grep -q "Status: active"; then
            print_info "Opening port ${HTTP_PORT}"
            ufw allow ${HTTP_PORT}/tcp
            print_success "Port ${HTTP_PORT} opened in firewall"
        else
            print_info "UFW is not active"
        fi
    else
        print_info "UFW not found. Manual firewall configuration may be required."
    fi
}

print_summary() {
    print_header "Deployment Summary"
    
    echo -e "${GREEN}✓${NC} Service Name:        ${SERVICE_NAME}.service"
    echo -e "${GREEN}✓${NC} Installation Dir:    ${INSTALL_DIR}"
    echo -e "${GREEN}✓${NC} Service User:        ${SERVICE_USER}"
    echo -e "${GREEN}✓${NC} HTTP Port:           ${HTTP_PORT}"
    echo -e "${GREEN}✓${NC} Database Host:       ${DB_HOST}"
    echo -e "${GREEN}✓${NC} Database Name:       ${DB_NAME}"
    echo -e "${GREEN}✓${NC} Database User:       ${DB_USER}"
    echo ""
    echo -e "${BLUE}Service Management Commands:${NC}"
    echo "  Start:    sudo systemctl start ${SERVICE_NAME}.service"
    echo "  Stop:     sudo systemctl stop ${SERVICE_NAME}.service"
    echo "  Restart:  sudo systemctl restart ${SERVICE_NAME}.service"
    echo "  Status:   sudo systemctl status ${SERVICE_NAME}.service"
    echo "  Logs:     sudo journalctl -u ${SERVICE_NAME}.service -f"
    echo ""
    echo -e "${BLUE}API Endpoints:${NC}"
    echo "  Swagger:  http://localhost:${HTTP_PORT}/swagger"
    echo "  API:      http://localhost:${HTTP_PORT}/api"
    echo ""
    
    # Get server IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    if [[ -n "$SERVER_IP" ]]; then
        echo -e "${BLUE}External Access:${NC}"
        echo "  Swagger:  http://${SERVER_IP}:${HTTP_PORT}/swagger"
        echo "  API:      http://${SERVER_IP}:${HTTP_PORT}/api"
        echo ""
    fi
    
    print_success "Deployment completed successfully!"
}

################################################################################
# Main Execution
################################################################################

main() {
    print_header "EMS API - Ubuntu Deployment Script"
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Check if running as root
    check_root
    
    # Run deployment steps
    check_prerequisites
    check_published_files
    create_service_user
    stop_existing_service
    backup_existing_installation
    deploy_application
    install_systemd_service
    start_service
    verify_deployment
    configure_firewall
    print_summary
}

# Run main function
main "$@"
