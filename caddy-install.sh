#!/bin/bash

# Caddy Server Installation Script for Monitoring2025
# Portable reverse proxy setup with automatic HTTPS

set -e

echo "=========================================="
echo "Caddy Reverse Proxy Installation"
echo "Monitoring2025 Project"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if script is run as root (needed for systemd service)
if [ "$EUID" -eq 0 ]; then
    print_warn "Running as root. Service will be installed system-wide."
    INSTALL_TYPE="system"
else
    print_info "Running as regular user. Service will be installed in user mode."
    INSTALL_TYPE="user"
fi

# Ask about proxychains usage
echo ""
print_info "Some servers require proxychains to access the internet."
read -p "Do you need to use proxychains for internet access? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    USE_PROXYCHAINS=true
    print_info "Will use proxychains for all internet commands."
    
    # Check if proxychains is installed
    if ! command -v proxychains &> /dev/null && ! command -v proxychains4 &> /dev/null; then
        print_error "proxychains/proxychains4 not found!"
        print_error "Please install proxychains first:"
        echo "  Ubuntu/Debian: sudo apt install proxychains4"
        echo "  CentOS/RHEL:   sudo yum install proxychains-ng"
        echo "  Arch:          sudo pacman -S proxychains-ng"
        exit 1
    fi
    
    # Determine which proxychains command to use
    if command -v proxychains4 &> /dev/null; then
        PROXY_CMD="proxychains4 -q"
    else
        PROXY_CMD="proxychains -q"
    fi
    print_info "Using: $PROXY_CMD"
else
    USE_PROXYCHAINS=false
    PROXY_CMD=""
    print_info "Will run commands without proxychains."
fi
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
    print_info "Detected OS: $PRETTY_NAME"
else
    print_error "Cannot detect OS. /etc/os-release not found."
    exit 1
fi

# Install Caddy based on OS
install_caddy() {
    print_info "Installing Caddy server..."
    
    case "$OS" in
        ubuntu|debian)
            print_info "Installing Caddy on Debian/Ubuntu..."
            sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
            $PROXY_CMD curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
            $PROXY_CMD curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
            sudo apt update
            sudo apt install caddy -y
            ;;
        
        centos|rhel|fedora|rocky|almalinux)
            print_info "Installing Caddy on RedHat/CentOS/Fedora..."
            sudo dnf install 'dnf-command(copr)' -y
            sudo dnf copr enable @caddy/caddy -y
            sudo dnf install caddy -y
            ;;
        
        arch|manjaro)
            print_info "Installing Caddy on Arch Linux..."
            sudo pacman -Sy --noconfirm caddy
            ;;
        
        *)
            print_warn "Unsupported OS. Attempting generic binary installation..."
            install_caddy_binary
            ;;
    esac
}

# Fallback: Install Caddy as standalone binary
install_caddy_binary() {
    print_info "Installing Caddy as standalone binary..."
    
    # Detect architecture
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64)
            CADDY_ARCH="amd64"
            ;;
        aarch64|arm64)
            CADDY_ARCH="arm64"
            ;;
        armv7l)
            CADDY_ARCH="armv7"
            ;;
        *)
            print_error "Unsupported architecture: $ARCH"
            exit 1
            ;;
    esac
    
    # Download latest Caddy
    CADDY_VERSION=$($PROXY_CMD curl -s https://api.github.com/repos/caddyserver/caddy/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')
    print_info "Downloading Caddy v$CADDY_VERSION for linux/$CADDY_ARCH..."
    
    cd /tmp
    $PROXY_CMD curl -L "https://github.com/caddyserver/caddy/releases/download/v${CADDY_VERSION}/caddy_${CADDY_VERSION}_linux_${CADDY_ARCH}.tar.gz" -o caddy.tar.gz
    tar -xzf caddy.tar.gz caddy
    
    # Install to /usr/local/bin or ~/.local/bin
    if [ "$INSTALL_TYPE" = "system" ]; then
        sudo mv caddy /usr/local/bin/
        sudo chmod +x /usr/local/bin/caddy
        print_info "Caddy installed to /usr/local/bin/caddy"
    else
        mkdir -p ~/.local/bin
        mv caddy ~/.local/bin/
        chmod +x ~/.local/bin/caddy
        print_info "Caddy installed to ~/.local/bin/caddy"
        print_warn "Make sure ~/.local/bin is in your PATH"
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    fi
    
    rm -f caddy.tar.gz
}

# Check if Caddy is already installed
if command -v caddy &> /dev/null; then
    print_info "Caddy is already installed: $(caddy version)"
    read -p "Reinstall Caddy? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_caddy
    fi
else
    install_caddy
fi

# Verify installation
if ! command -v caddy &> /dev/null; then
    print_error "Caddy installation failed!"
    exit 1
fi

print_info "Caddy version: $(caddy version)"

# Setup directories
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
print_info "Project directory: $PROJECT_DIR"

# Ask for domain configuration
echo ""
echo "=========================================="
echo "Domain Configuration"
echo "=========================================="
echo ""
print_info "You can configure your domain now or later using ./caddy-manager.sh domain"
echo ""
echo "Domain options:"
echo "  1. localhost:8443 (Development - self-signed certificate)"
echo "  2. Custom domain (Production - automatic Let's Encrypt certificate)"
echo "  3. Skip (configure later with ./caddy-manager.sh domain)"
echo ""
read -p "Choose option [1-3] (default: 1): " -r DOMAIN_CHOICE

CADDY_DOMAIN=""
CADDY_EMAIL=""
CADDY_PORT=""

case "${DOMAIN_CHOICE:-1}" in
    1)
        CADDY_DOMAIN="localhost:8443"
        CADDY_PORT="8443"
        print_info "Using localhost:8443 for development"
        ;;
    2)
        echo ""
        read -p "Enter your domain (e.g., monitoring.yourdomain.com): " -r CADDY_DOMAIN
        if [ -z "$CADDY_DOMAIN" ]; then
            print_error "Domain cannot be empty!"
            exit 1
        fi
        
        # Remove protocol and trailing slash if present
        CADDY_DOMAIN=$(echo "$CADDY_DOMAIN" | sed -E 's~^https?://~~' | sed 's~/$~~')
        
        echo ""
        print_warn "IMPORTANT: Another web server may be running on port 443."
        print_warn "If you want to use port 443, you must stop the other web server first."
        echo ""
        read -p "Enter HTTPS port for Caddy (443 or custom like 8443, default: 8443): " -r CADDY_PORT
        CADDY_PORT="${CADDY_PORT:-8443}"
        
        # Validate port number
        if ! [[ "$CADDY_PORT" =~ ^[0-9]+$ ]] || [ "$CADDY_PORT" -lt 1 ] || [ "$CADDY_PORT" -gt 65535 ]; then
            print_error "Invalid port number! Must be between 1-65535"
            exit 1
        fi
        
        # Warn about privileged ports
        if [ "$CADDY_PORT" -lt 1024 ] && [ "$CADDY_PORT" != "443" ] && [ "$CADDY_PORT" != "80" ]; then
            print_warn "Port $CADDY_PORT is a privileged port (< 1024)"
        fi
        
        # Check if port is in use
        if command -v ss &> /dev/null; then
            if ss -tlnp 2>/dev/null | grep -q ":$CADDY_PORT "; then
                print_error "Port $CADDY_PORT is already in use!"
                print_error "Stop the service using this port first, or choose a different port."
                ss -tlnp 2>/dev/null | grep ":$CADDY_PORT " || true
                exit 1
            fi
        elif command -v netstat &> /dev/null; then
            if netstat -tlnp 2>/dev/null | grep -q ":$CADDY_PORT "; then
                print_error "Port $CADDY_PORT is already in use!"
                print_error "Stop the service using this port first, or choose a different port."
                netstat -tlnp 2>/dev/null | grep ":$CADDY_PORT " || true
                exit 1
            fi
        fi
        
        # Add port to domain (skip for standard ports 80 and 443)
        if [ "$CADDY_PORT" != "443" ] && [ "$CADDY_PORT" != "80" ]; then
            CADDY_DOMAIN="$CADDY_DOMAIN:$CADDY_PORT"
        fi
        
        echo ""
        read -p "Enter your email for Let's Encrypt notifications: " -r CADDY_EMAIL
        if [ -z "$CADDY_EMAIL" ]; then
            print_warn "No email provided. Let's Encrypt notifications will be disabled."
        fi
        
        print_info "Using domain: $CADDY_DOMAIN"
        [ -n "$CADDY_EMAIL" ] && print_info "Email: $CADDY_EMAIL"
        
        echo ""
        print_warn "IMPORTANT: Make sure your DNS A record points to this server's IP address!"
        print_warn "Domain: $CADDY_DOMAIN → $(hostname -I | awk '{print $1}')"
        print_warn "Users will access your app at: https://${CADDY_DOMAIN}"
        echo ""
        read -p "Press Enter to continue after DNS is configured, or Ctrl+C to cancel..."
        ;;
    3|*)
        CADDY_DOMAIN="localhost:8443"
        CADDY_PORT="8443"
        print_info "Skipping domain configuration. Using localhost:8443 as default."
        print_info "Run './caddy-manager.sh domain' later to configure your domain."
        ;;
esac

if [ "$INSTALL_TYPE" = "system" ]; then
    CADDY_CONFIG_DIR="/etc/caddy"
    CADDY_LOG_DIR="/var/log/caddy"
    CADDY_DATA_DIR="/var/lib/caddy"
else
    CADDY_CONFIG_DIR="$HOME/.config/caddy"
    CADDY_LOG_DIR="$HOME/.local/var/log/caddy"
    CADDY_DATA_DIR="$HOME/.local/var/lib/caddy"
fi

print_info "Creating directories..."
if [ "$INSTALL_TYPE" = "system" ]; then
    sudo mkdir -p "$CADDY_CONFIG_DIR"
    sudo mkdir -p "$CADDY_LOG_DIR"
    sudo mkdir -p "$CADDY_DATA_DIR"
else
    mkdir -p "$CADDY_CONFIG_DIR"
    mkdir -p "$CADDY_LOG_DIR"
    mkdir -p "$CADDY_DATA_DIR"
fi

# Generate Caddyfile with user's domain configuration
print_info "Generating Caddyfile configuration..."

generate_caddyfile() {
    local domain="$1"
    local email="$2"
    
    cat > /tmp/Caddyfile.tmp <<EOF
# Caddy Reverse Proxy Configuration - Monitoring2025
# Generated on $(date)

# Main domain configuration
$domain {
EOF

    # Add TLS configuration for production domains
    if [[ ! "$domain" =~ ^localhost ]]; then
        if [ -n "$email" ]; then
            cat >> /tmp/Caddyfile.tmp <<EOF
    # Automatic HTTPS with Let's Encrypt
    tls $email

EOF
        else
            cat >> /tmp/Caddyfile.tmp <<EOF
    # Automatic HTTPS with Let's Encrypt
    tls

EOF
        fi
    fi

    # Add common configuration
    cat >> /tmp/Caddyfile.tmp <<'EOF'
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;"
    }

    # Frontend UI - React/Vite app on port 5173
    handle /* {
        reverse_proxy localhost:5173 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            
            health_uri /
            health_interval 10s
            health_timeout 5s
        }
    }

    # Backend API - ASP.NET Core on port 5030
    handle /api/* {
        reverse_proxy localhost:5030 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            
            health_uri /api/health
            health_interval 10s
            health_timeout 5s
        }
    }

    # SignalR Hub - WebSocket support
    handle /hubs/* {
        reverse_proxy localhost:5030 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}
            
            transport http {
                read_timeout 60s
                write_timeout 60s
            }
        }
    }

    # Swagger/OpenAPI documentation
    handle /swagger/* {
        reverse_proxy localhost:5030 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Access and error logs
    log {
        output file /var/log/caddy/access.log {
            roll_size 100mb
            roll_keep 5
            roll_keep_for 720h
        }
        format json
    }
}
EOF
}

generate_caddyfile "$CADDY_DOMAIN" "$CADDY_EMAIL"

# Copy generated Caddyfile
if [ "$INSTALL_TYPE" = "system" ]; then
    sudo mv /tmp/Caddyfile.tmp "$CADDY_CONFIG_DIR/Caddyfile"
    sudo chown caddy:caddy "$CADDY_CONFIG_DIR/Caddyfile" 2>/dev/null || true
else
    mv /tmp/Caddyfile.tmp "$CADDY_CONFIG_DIR/Caddyfile"
fi

print_info "Caddyfile generated and saved to $CADDY_CONFIG_DIR/Caddyfile"

# Save domain config for later reference
CONFIG_FILE="$CADDY_CONFIG_DIR/.caddy-domain-config"
if [ "$INSTALL_TYPE" = "system" ]; then
    sudo tee "$CONFIG_FILE" > /dev/null <<EOF
CADDY_DOMAIN=$CADDY_DOMAIN
CADDY_EMAIL=$CADDY_EMAIL
CADDY_PORT=$CADDY_PORT
EOF
    sudo chown caddy:caddy "$CONFIG_FILE" 2>/dev/null || true
else
    cat > "$CONFIG_FILE" <<EOF
CADDY_DOMAIN=$CADDY_DOMAIN
CADDY_EMAIL=$CADDY_EMAIL
CADDY_PORT=$CADDY_PORT
EOF
fi

# Validate Caddyfile
print_info "Validating Caddyfile..."
if [ "$INSTALL_TYPE" = "system" ]; then
    sudo caddy validate --config "$CADDY_CONFIG_DIR/Caddyfile"
else
    caddy validate --config "$CADDY_CONFIG_DIR/Caddyfile"
fi

if [ $? -eq 0 ]; then
    print_info "Caddyfile is valid!"
else
    print_error "Caddyfile validation failed!"
    exit 1
fi

# Create systemd service
create_systemd_service() {
    print_info "Creating systemd service..."
    
    if [ "$INSTALL_TYPE" = "system" ]; then
        SERVICE_FILE="/etc/systemd/system/caddy-monitoring.service"
        sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Caddy Reverse Proxy for Monitoring2025
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target
Requires=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF
        
        # Create caddy user if doesn't exist
        if ! id -u caddy &> /dev/null; then
            print_info "Creating caddy user..."
            sudo useradd --system --home /var/lib/caddy --shell /usr/sbin/nologin caddy
        fi
        
        # Set permissions
        sudo chown -R caddy:caddy "$CADDY_CONFIG_DIR"
        sudo chown -R caddy:caddy "$CADDY_LOG_DIR"
        sudo chown -R caddy:caddy "$CADDY_DATA_DIR"
        
        sudo systemctl daemon-reload
        print_info "System service created: caddy-monitoring.service"
        
    else
        SERVICE_FILE="$HOME/.config/systemd/user/caddy-monitoring.service"
        mkdir -p "$HOME/.config/systemd/user"
        
        tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Caddy Reverse Proxy for Monitoring2025 (User Mode)
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target

[Service]
Type=notify
ExecStart=$(command -v caddy) run --environ --config $CADDY_CONFIG_DIR/Caddyfile
ExecReload=$(command -v caddy) reload --config $CADDY_CONFIG_DIR/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
PrivateTmp=true
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=default.target
EOF
        
        systemctl --user daemon-reload
        print_info "User service created: caddy-monitoring.service"
    fi
}

create_systemd_service

# Enable and start service
print_info "Enabling and starting Caddy service..."
if [ "$INSTALL_TYPE" = "system" ]; then
    sudo systemctl enable caddy-monitoring.service
    sudo systemctl start caddy-monitoring.service
    
    sleep 2
    
    if sudo systemctl is-active --quiet caddy-monitoring.service; then
        print_info "Caddy service is running!"
        sudo systemctl status caddy-monitoring.service --no-pager
    else
        print_error "Caddy service failed to start!"
        sudo journalctl -u caddy-monitoring.service --no-pager -n 50
        exit 1
    fi
else
    systemctl --user enable caddy-monitoring.service
    systemctl --user start caddy-monitoring.service
    
    sleep 2
    
    if systemctl --user is-active --quiet caddy-monitoring.service; then
        print_info "Caddy service is running!"
        systemctl --user status caddy-monitoring.service --no-pager
    else
        print_error "Caddy service failed to start!"
        journalctl --user -u caddy-monitoring.service --no-pager -n 50
        exit 1
    fi
fi

# Print summary
echo ""
echo "=========================================="
echo "Caddy Installation Complete!"
echo "=========================================="
echo ""
print_info "Configuration: $CADDY_CONFIG_DIR/Caddyfile"
print_info "Logs: $CADDY_LOG_DIR/"
print_info "Data: $CADDY_DATA_DIR/"
echo ""

if [ "$INSTALL_TYPE" = "system" ]; then
    print_info "Service commands:"
    echo "  Start:   sudo systemctl start caddy-monitoring"
    echo "  Stop:    sudo systemctl stop caddy-monitoring"
    echo "  Restart: sudo systemctl restart caddy-monitoring"
    echo "  Status:  sudo systemctl status caddy-monitoring"
    echo "  Logs:    sudo journalctl -u caddy-monitoring -f"
    echo "  Reload:  sudo systemctl reload caddy-monitoring"
else
    print_info "Service commands:"
    echo "  Start:   systemctl --user start caddy-monitoring"
    echo "  Stop:    systemctl --user stop caddy-monitoring"
    echo "  Restart: systemctl --user restart caddy-monitoring"
    echo "  Status:  systemctl --user status caddy-monitoring"
    echo "  Logs:    journalctl --user -u caddy-monitoring -f"
    echo "  Reload:  systemctl --user reload caddy-monitoring"
fi

echo ""
print_info "Access your application:"
if [[ "$CADDY_DOMAIN" =~ ^localhost ]]; then
    echo "  URL: https://$CADDY_DOMAIN"
    echo ""
    print_warn "For localhost, your browser will show a certificate warning."
    print_warn "This is normal - Caddy uses self-signed certs for localhost."
    print_warn "Click 'Advanced' → 'Proceed' to continue."
else
    echo "  URL: https://$CADDY_DOMAIN"
    echo ""
    print_info "Caddy will automatically obtain a Let's Encrypt certificate for your domain."
    print_info "This may take a few moments on first access."
fi
echo ""
print_info "Next steps:"
echo "  1. Start your backend API: cd EMS/API && dotnet run"
echo "  2. Start your frontend UI: cd ui && npm run dev"
echo "  3. Access via Caddy: https://$CADDY_DOMAIN"
echo ""
print_info "To change domain later:"
echo "  ./caddy-manager.sh domain"
echo ""
print_info "Installation complete! 🎉"
