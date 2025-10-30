#!/bin/bash

################################################################################
# Reverse Proxy Setup Script for EMS Monitoring Application
# Configures Nginx or Apache with HTTPS support
# API: Port 5030 | UI: Port 3000
################################################################################

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_PORT=5030
UI_PORT=3000
BACKUP_DIR="/etc/proxy-backup-$(date +%Y%m%d-%H%M%S)"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}===================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}===================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        print_error "Cannot detect OS. /etc/os-release not found."
        exit 1
    fi
    
    print_info "Detected OS: $OS $OS_VERSION"
}

get_package_manager() {
    if command -v apt-get &> /dev/null; then
        PKG_MANAGER="apt-get"
        PKG_UPDATE="apt-get update"
        PKG_INSTALL="apt-get install -y"
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
        PKG_UPDATE="yum check-update"
        PKG_INSTALL="yum install -y"
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
        PKG_UPDATE="dnf check-update"
        PKG_INSTALL="dnf install -y"
    else
        print_error "No supported package manager found (apt-get, yum, dnf)"
        exit 1
    fi
}

validate_domain() {
    local domain=$1
    if [[ ! $domain =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        return 1
    fi
    return 0
}

validate_email() {
    local email=$1
    if [[ ! $email =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 1
    fi
    return 0
}

check_ports() {
    print_info "Checking if required ports are available..."
    
    if netstat -tuln | grep -q ":$API_PORT "; then
        print_success "API port $API_PORT is in use (expected)"
    else
        print_warning "API port $API_PORT is not in use. Make sure your API is running."
    fi
    
    if netstat -tuln | grep -q ":$UI_PORT "; then
        print_success "UI port $UI_PORT is in use (expected)"
    else
        print_warning "UI port $UI_PORT is not in use. Make sure your UI is running."
    fi
    
    if netstat -tuln | grep -q ":80 "; then
        print_warning "Port 80 is already in use"
    fi
    
    if netstat -tuln | grep -q ":443 "; then
        print_warning "Port 443 is already in use"
    fi
}

create_backup() {
    local config_path=$1
    if [ -f "$config_path" ]; then
        mkdir -p "$BACKUP_DIR"
        cp "$config_path" "$BACKUP_DIR/"
        print_success "Backed up existing config to $BACKUP_DIR"
    fi
}

################################################################################
# Detection and Safety Functions
################################################################################

check_existing_webserver() {
    local server_type=$1
    
    if [ "$server_type" = "nginx" ]; then
        if command -v nginx &> /dev/null; then
            print_warning "Nginx is already installed"
            return 0
        fi
    elif [ "$server_type" = "apache" ]; then
        if command -v apache2 &> /dev/null || command -v httpd &> /dev/null; then
            print_warning "Apache is already installed"
            return 0
        fi
    fi
    return 1
}

check_webserver_running() {
    local server_type=$1
    
    if [ "$server_type" = "nginx" ]; then
        if systemctl is-active --quiet nginx 2>/dev/null; then
            print_warning "Nginx is currently running"
            return 0
        fi
    elif [ "$server_type" = "apache" ]; then
        if systemctl is-active --quiet apache2 2>/dev/null || systemctl is-active --quiet httpd 2>/dev/null; then
            print_warning "Apache is currently running"
            return 0
        fi
    fi
    return 1
}

list_existing_nginx_sites() {
    print_info "Existing Nginx sites:"
    if [ -d "/etc/nginx/sites-enabled" ]; then
        local sites=$(ls -1 /etc/nginx/sites-enabled/ 2>/dev/null | grep -v default)
        if [ -n "$sites" ]; then
            echo "$sites" | while read site; do
                echo "  - $site"
            done
        else
            echo "  (none found, only default)"
        fi
    else
        echo "  (no sites-enabled directory)"
    fi
}

list_existing_apache_sites() {
    print_info "Existing Apache sites:"
    if [ -d "/etc/apache2/sites-enabled" ]; then
        local sites=$(ls -1 /etc/apache2/sites-enabled/ 2>/dev/null | grep -v 000-default)
        if [ -n "$sites" ]; then
            echo "$sites" | while read site; do
                echo "  - $site"
            done
        else
            echo "  (none found, only default)"
        fi
    elif [ -d "/etc/httpd/conf.d" ]; then
        local sites=$(ls -1 /etc/httpd/conf.d/*.conf 2>/dev/null | xargs -n1 basename)
        if [ -n "$sites" ]; then
            echo "$sites" | while read site; do
                echo "  - $site"
            done
        else
            echo "  (none found)"
        fi
    else
        echo "  (no configuration directory found)"
    fi
}

backup_all_webserver_configs() {
    local server_type=$1
    
    print_info "Creating comprehensive backup..."
    mkdir -p "$BACKUP_DIR"
    
    if [ "$server_type" = "nginx" ]; then
        if [ -d "/etc/nginx" ]; then
            cp -r /etc/nginx "$BACKUP_DIR/" 2>/dev/null || true
            print_success "Backed up /etc/nginx to $BACKUP_DIR"
        fi
    elif [ "$server_type" = "apache" ]; then
        if [ -d "/etc/apache2" ]; then
            cp -r /etc/apache2 "$BACKUP_DIR/" 2>/dev/null || true
            print_success "Backed up /etc/apache2 to $BACKUP_DIR"
        elif [ -d "/etc/httpd" ]; then
            cp -r /etc/httpd "$BACKUP_DIR/" 2>/dev/null || true
            print_success "Backed up /etc/httpd to $BACKUP_DIR"
        fi
    fi
    
    # Create rollback script
    create_rollback_script "$server_type"
}

create_rollback_script() {
    local server_type=$1
    local rollback_script="$BACKUP_DIR/rollback.sh"
    
    cat > "$rollback_script" <<'ROLLBACK_EOF'
#!/bin/bash
# Rollback script for EMS Monitoring reverse proxy setup
# This script will restore the previous configuration

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}WARNING: This will restore the previous configuration!${NC}"
echo -e "${YELLOW}Any changes made by the setup script will be lost.${NC}"
echo ""
read -p "Are you sure you want to rollback? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

BACKUP_DIR=$(dirname "$0")
ROLLBACK_EOF

    if [ "$server_type" = "nginx" ]; then
        cat >> "$rollback_script" <<'ROLLBACK_EOF'

if [ -d "$BACKUP_DIR/nginx" ]; then
    echo "Restoring Nginx configuration..."
    rm -rf /etc/nginx
    cp -r "$BACKUP_DIR/nginx" /etc/nginx
    systemctl restart nginx
    echo -e "${GREEN}Nginx configuration restored${NC}"
fi
ROLLBACK_EOF
    elif [ "$server_type" = "apache" ]; then
        cat >> "$rollback_script" <<'ROLLBACK_EOF'

if [ -d "$BACKUP_DIR/apache2" ]; then
    echo "Restoring Apache configuration..."
    rm -rf /etc/apache2
    cp -r "$BACKUP_DIR/apache2" /etc/apache2
    systemctl restart apache2
    echo -e "${GREEN}Apache configuration restored${NC}"
elif [ -d "$BACKUP_DIR/httpd" ]; then
    echo "Restoring Apache configuration..."
    rm -rf /etc/httpd
    cp -r "$BACKUP_DIR/httpd" /etc/httpd
    systemctl restart httpd
    echo -e "${GREEN}Apache configuration restored${NC}"
fi
ROLLBACK_EOF
    fi
    
    cat >> "$rollback_script" <<'ROLLBACK_EOF'

echo -e "${GREEN}Rollback complete!${NC}"
ROLLBACK_EOF
    
    chmod +x "$rollback_script"
    print_success "Rollback script created at $rollback_script"
}

check_port_conflicts() {
    local has_conflict=0
    
    if netstat -tuln 2>/dev/null | grep -q ":80 "; then
        print_warning "Port 80 is already in use"
        local process=$(netstat -tulnp 2>/dev/null | grep ":80 " | awk '{print $7}' | head -1)
        echo "  Used by: $process"
        has_conflict=1
    fi
    
    if netstat -tuln 2>/dev/null | grep -q ":443 "; then
        print_warning "Port 443 is already in use"
        local process=$(netstat -tulnp 2>/dev/null | grep ":443 " | awk '{print $7}' | head -1)
        echo "  Used by: $process"
        has_conflict=1
    fi
    
    return $has_conflict
}

prompt_safe_installation() {
    local server_type=$1
    local is_installed=0
    local is_running=0
    
    print_header "Safety Check - Existing Installation"
    
    if check_existing_webserver "$server_type"; then
        is_installed=1
        echo ""
        
        if check_webserver_running "$server_type"; then
            is_running=1
            echo ""
        fi
        
        if [ "$server_type" = "nginx" ]; then
            list_existing_nginx_sites
        else
            list_existing_apache_sites
        fi
        
        echo ""
        check_port_conflicts || true
        
        echo ""
        print_warning "===== IMPORTANT ====="
        print_warning "An existing $server_type installation was detected!"
        echo ""
        
        if [ $is_running -eq 1 ]; then
            print_info "The web server is currently RUNNING and may be serving other sites."
        fi
        
        echo ""
        print_info "What this script will do:"
        echo "  1. Create a complete backup of all configurations"
        echo "  2. Add new site configurations for EMS Monitoring"
        echo "  3. Enable the new sites alongside existing ones"
        echo "  4. Reload (not restart) the web server to minimize disruption"
        echo "  5. Create a rollback script in case you need to undo changes"
        echo ""
        
        print_info "Your existing sites should continue to work normally."
        print_warning "However, there's always a risk when modifying production systems."
        echo ""
        
        read -p "Do you want to continue? (yes/no): " continue_install
        
        if [ "$continue_install" != "yes" ]; then
            print_info "Installation cancelled. No changes were made."
            exit 0
        fi
        
        # Create comprehensive backup
        backup_all_webserver_configs "$server_type"
        
    else
        print_success "No existing $server_type installation found. Safe to proceed."
    fi
}

################################################################################
# Nginx Functions
################################################################################

install_nginx() {
    print_header "Installing Nginx"
    
    if check_existing_webserver "nginx"; then
        print_info "Nginx is already installed. Skipping installation."
        print_info "Installing/updating certbot only..."
        $PKG_INSTALL certbot python3-certbot-nginx
    else
        print_info "Installing Nginx and certbot..."
        $PKG_UPDATE || true
        $PKG_INSTALL nginx certbot python3-certbot-nginx
        systemctl enable nginx
        print_success "Nginx installed successfully"
    fi
}

generate_nginx_config() {
    local ui_domain=$1
    local api_domain=$2
    local ssl_type=$3
    
    print_info "Generating Nginx configuration..."
    
    # UI Configuration
    cat > "/etc/nginx/sites-available/$ui_domain" <<EOF
# EMS Monitoring UI - Nginx Configuration
# Domain: $ui_domain
# Upstream: localhost:$UI_PORT

upstream ui_backend {
    server localhost:$UI_PORT fail_timeout=0;
}

server {
    listen 80;
    listen [::]:80;
    server_name $ui_domain;
    
    # Redirect HTTP to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $ui_domain;
    
    # SSL Configuration (will be updated by certbot or manual cert setup)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Strong SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/${ui_domain}_access.log;
    error_log /var/log/nginx/${ui_domain}_error.log;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
    
    # Root location - proxy to UI
    location / {
        proxy_pass http://ui_backend;
        proxy_http_version 1.1;
        
        # Proxy headers
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://ui_backend;
        proxy_cache_valid 200 7d;
        proxy_cache_valid 404 10m;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # API Configuration
    cat > "/etc/nginx/sites-available/$api_domain" <<EOF
# EMS Monitoring API - Nginx Configuration
# Domain: $api_domain
# Upstream: localhost:$API_PORT

upstream api_backend {
    server localhost:$API_PORT fail_timeout=0;
}

server {
    listen 80;
    listen [::]:80;
    server_name $api_domain;
    
    # Redirect HTTP to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $api_domain;
    
    # SSL Configuration (will be updated by certbot or manual cert setup)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Strong SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/${api_domain}_access.log;
    error_log /var/log/nginx/${api_domain}_error.log;
    
    # Increase body size for file uploads
    client_max_body_size 10M;
    
    # Root location - proxy to API
    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        
        # Proxy headers
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # Timeouts for API calls
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # No buffering for real-time responses
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # SignalR Hub - WebSocket Support
    location /monitoringHub {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        
        # WebSocket upgrade headers
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Proxy headers
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Long timeouts for WebSocket connections
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        
        # Disable buffering for WebSocket
        proxy_buffering off;
        proxy_request_buffering off;
        
        # Keep-alive
        proxy_set_header Connection "keep-alive";
    }
    
    # Health check endpoint (if exists)
    location /health {
        proxy_pass http://api_backend;
        access_log off;
    }
}
EOF

    # Enable sites
    mkdir -p /etc/nginx/sites-enabled
    ln -sf "/etc/nginx/sites-available/$ui_domain" "/etc/nginx/sites-enabled/"
    ln -sf "/etc/nginx/sites-available/$api_domain" "/etc/nginx/sites-enabled/"
    
    print_success "Nginx configurations created"
}

test_nginx_config() {
    print_info "Testing Nginx configuration..."
    if nginx -t; then
        print_success "Nginx configuration is valid"
        return 0
    else
        print_error "Nginx configuration test failed"
        return 1
    fi
}

reload_nginx() {
    print_info "Reloading Nginx..."
    systemctl reload nginx
    print_success "Nginx reloaded successfully"
}

################################################################################
# Apache Functions
################################################################################

install_apache() {
    print_header "Installing Apache"
    
    if check_existing_webserver "apache"; then
        print_info "Apache is already installed. Skipping installation."
        print_info "Installing/updating certbot only..."
        
        if [ "$PKG_MANAGER" = "apt-get" ]; then
            $PKG_INSTALL certbot python3-certbot-apache
            APACHE_SERVICE="apache2"
            APACHE_CONF_DIR="/etc/apache2/sites-available"
            
            # Enable required modules if not already enabled
            print_info "Ensuring required Apache modules are enabled..."
            a2enmod proxy proxy_http proxy_wstunnel rewrite ssl headers http2 2>/dev/null || true
        else
            $PKG_INSTALL certbot python3-certbot-apache
            APACHE_SERVICE="httpd"
            APACHE_CONF_DIR="/etc/httpd/conf.d"
        fi
    else
        print_info "Installing Apache and certbot..."
        $PKG_UPDATE || true
        
        if [ "$PKG_MANAGER" = "apt-get" ]; then
            $PKG_INSTALL apache2 certbot python3-certbot-apache
            APACHE_SERVICE="apache2"
            APACHE_CONF_DIR="/etc/apache2/sites-available"
        else
            $PKG_INSTALL httpd mod_ssl certbot python3-certbot-apache
            APACHE_SERVICE="httpd"
            APACHE_CONF_DIR="/etc/httpd/conf.d"
        fi
        
        # Enable required modules
        if [ "$PKG_MANAGER" = "apt-get" ]; then
            a2enmod proxy proxy_http proxy_wstunnel rewrite ssl headers http2
        fi
        
        systemctl enable $APACHE_SERVICE
        print_success "Apache installed successfully"
    fi
}

generate_apache_config() {
    local ui_domain=$1
    local api_domain=$2
    local ssl_type=$3
    
    print_info "Generating Apache configuration..."
    
    # UI Configuration
    cat > "${APACHE_CONF_DIR}/${ui_domain}.conf" <<EOF
# EMS Monitoring UI - Apache Configuration
# Domain: $ui_domain
# Upstream: localhost:$UI_PORT

<VirtualHost *:80>
    ServerName $ui_domain
    
    # Redirect HTTP to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
    
    # Let's Encrypt challenge
    Alias /.well-known/acme-challenge/ /var/www/html/.well-known/acme-challenge/
    <Directory "/var/www/html/.well-known/acme-challenge/">
        Options None
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>

<VirtualHost *:443>
    ServerName $ui_domain
    
    # SSL Configuration (will be updated by certbot or manual cert setup)
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/ssl-cert-snakeoil.pem
    SSLCertificateKeyFile /etc/ssl/private/ssl-cert-snakeoil.key
    
    # Strong SSL Security
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5
    SSLHonorCipherOrder on
    
    # HTTP/2 Support
    Protocols h2 http/1.1
    
    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    
    # Logging
    ErrorLog \${APACHE_LOG_DIR}/${ui_domain}_error.log
    CustomLog \${APACHE_LOG_DIR}/${ui_domain}_access.log combined
    
    # Proxy settings
    ProxyPreserveHost On
    ProxyRequests Off
    
    # Timeouts
    ProxyTimeout 60
    
    # Proxy to UI
    ProxyPass / http://localhost:$UI_PORT/
    ProxyPassReverse / http://localhost:$UI_PORT/
    
    # Proxy headers
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
EOF

    # API Configuration
    cat > "${APACHE_CONF_DIR}/${api_domain}.conf" <<EOF
# EMS Monitoring API - Apache Configuration
# Domain: $api_domain
# Upstream: localhost:$API_PORT

<VirtualHost *:80>
    ServerName $api_domain
    
    # Redirect HTTP to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
    
    # Let's Encrypt challenge
    Alias /.well-known/acme-challenge/ /var/www/html/.well-known/acme-challenge/
    <Directory "/var/www/html/.well-known/acme-challenge/">
        Options None
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>

<VirtualHost *:443>
    ServerName $api_domain
    
    # SSL Configuration (will be updated by certbot or manual cert setup)
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/ssl-cert-snakeoil.pem
    SSLCertificateKeyFile /etc/ssl/private/ssl-cert-snakeoil.key
    
    # Strong SSL Security
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5
    SSLHonorCipherOrder on
    
    # HTTP/2 Support
    Protocols h2 http/1.1
    
    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    
    # Logging
    ErrorLog \${APACHE_LOG_DIR}/${api_domain}_error.log
    CustomLog \${APACHE_LOG_DIR}/${api_domain}_access.log combined
    
    # Proxy settings
    ProxyPreserveHost On
    ProxyRequests Off
    
    # Increase body size for file uploads
    LimitRequestBody 10485760
    
    # Long timeouts for API calls
    ProxyTimeout 300
    
    # Proxy to API (non-WebSocket)
    ProxyPass /monitoringHub !
    ProxyPass / http://localhost:$API_PORT/
    ProxyPassReverse / http://localhost:$API_PORT/
    
    # SignalR Hub - WebSocket Support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /monitoringHub/(.*) ws://localhost:$API_PORT/monitoringHub/\$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /monitoringHub/(.*) http://localhost:$API_PORT/monitoringHub/\$1 [P,L]
    
    ProxyPass /monitoringHub http://localhost:$API_PORT/monitoringHub
    ProxyPassReverse /monitoringHub http://localhost:$API_PORT/monitoringHub
    
    # Proxy headers
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
EOF

    # Enable sites
    if [ "$PKG_MANAGER" = "apt-get" ]; then
        a2ensite "${ui_domain}.conf"
        a2ensite "${api_domain}.conf"
    fi
    
    print_success "Apache configurations created"
}

test_apache_config() {
    print_info "Testing Apache configuration..."
    if $APACHE_SERVICE -t 2>/dev/null || apachectl configtest 2>/dev/null; then
        print_success "Apache configuration is valid"
        return 0
    else
        print_error "Apache configuration test failed"
        return 1
    fi
}

reload_apache() {
    print_info "Reloading Apache..."
    systemctl reload $APACHE_SERVICE
    print_success "Apache reloaded successfully"
}

################################################################################
# SSL Certificate Functions
################################################################################

setup_letsencrypt() {
    local ui_domain=$1
    local api_domain=$2
    local email=$3
    local web_server=$4
    
    print_header "Setting up Let's Encrypt SSL Certificates"
    
    print_warning "Make sure your domains are pointing to this server's IP address!"
    print_info "DNS records should be set up before continuing."
    echo ""
    read -p "Are your DNS records configured? (yes/no): " dns_ready
    
    if [ "$dns_ready" != "yes" ]; then
        print_warning "Please configure your DNS records and run this script again."
        print_info "You need A records pointing:"
        print_info "  $ui_domain -> $(curl -s ifconfig.me)"
        print_info "  $api_domain -> $(curl -s ifconfig.me)"
        exit 1
    fi
    
    # Get certificates
    if [ "$web_server" = "nginx" ]; then
        certbot --nginx -d "$ui_domain" -d "$api_domain" --email "$email" --agree-tos --non-interactive --redirect
    else
        certbot --apache -d "$ui_domain" -d "$api_domain" --email "$email" --agree-tos --non-interactive --redirect
    fi
    
    if [ $? -eq 0 ]; then
        print_success "SSL certificates obtained successfully"
        
        # Setup auto-renewal
        print_info "Setting up automatic certificate renewal..."
        (crontab -l 2>/dev/null; echo "0 0 * * * certbot renew --quiet") | crontab -
        print_success "Auto-renewal configured"
    else
        print_error "Failed to obtain SSL certificates"
        print_warning "Falling back to self-signed certificates..."
        setup_selfsigned "$ui_domain" "$api_domain" "$web_server"
    fi
}

setup_selfsigned() {
    local ui_domain=$1
    local api_domain=$2
    local web_server=$3
    
    print_header "Setting up Self-Signed SSL Certificates"
    
    print_warning "Self-signed certificates will show security warnings in browsers."
    print_info "Use this only for testing or private networks."
    
    local cert_dir="/etc/ssl/ems-monitoring"
    mkdir -p "$cert_dir"
    
    # Generate certificates
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$cert_dir/$ui_domain.key" \
        -out "$cert_dir/$ui_domain.crt" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$ui_domain"
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$cert_dir/$api_domain.key" \
        -out "$cert_dir/$api_domain.crt" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$api_domain"
    
    # Update configurations
    if [ "$web_server" = "nginx" ]; then
        sed -i "s|ssl_certificate .*|ssl_certificate $cert_dir/$ui_domain.crt;|" "/etc/nginx/sites-available/$ui_domain"
        sed -i "s|ssl_certificate_key .*|ssl_certificate_key $cert_dir/$ui_domain.key;|" "/etc/nginx/sites-available/$ui_domain"
        sed -i "s|ssl_certificate .*|ssl_certificate $cert_dir/$api_domain.crt;|" "/etc/nginx/sites-available/$api_domain"
        sed -i "s|ssl_certificate_key .*|ssl_certificate_key $cert_dir/$api_domain.key;|" "/etc/nginx/sites-available/$api_domain"
    else
        sed -i "s|SSLCertificateFile .*|SSLCertificateFile $cert_dir/$ui_domain.crt|" "${APACHE_CONF_DIR}/${ui_domain}.conf"
        sed -i "s|SSLCertificateKeyFile .*|SSLCertificateKeyFile $cert_dir/$ui_domain.key|" "${APACHE_CONF_DIR}/${ui_domain}.conf"
        sed -i "s|SSLCertificateFile .*|SSLCertificateFile $cert_dir/$api_domain.crt|" "${APACHE_CONF_DIR}/${api_domain}.conf"
        sed -i "s|SSLCertificateKeyFile .*|SSLCertificateKeyFile $cert_dir/$api_domain.key|" "${APACHE_CONF_DIR}/${api_domain}.conf"
    fi
    
    print_success "Self-signed certificates created"
}

################################################################################
# Main Script
################################################################################

main() {
    print_header "EMS Monitoring - Reverse Proxy Setup"
    
    # Check prerequisites
    check_root
    detect_os
    get_package_manager
    
    # User inputs
    print_header "Configuration"
    
    echo -e "${BLUE}Choose web server:${NC}"
    echo "1) Nginx (recommended)"
    echo "2) Apache"
    read -p "Enter your choice (1 or 2): " server_choice
    
    case $server_choice in
        1)
            WEB_SERVER="nginx"
            print_info "Selected: Nginx"
            ;;
        2)
            WEB_SERVER="apache"
            print_info "Selected: Apache"
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    print_info "Enter your domain names (without http:// or https://)"
    
    while true; do
        read -p "UI Domain (e.g., monitoring.example.com): " UI_DOMAIN
        if validate_domain "$UI_DOMAIN"; then
            break
        else
            print_error "Invalid domain format. Please try again."
        fi
    done
    
    while true; do
        read -p "API Domain (e.g., api.monitoring.example.com): " API_DOMAIN
        if validate_domain "$API_DOMAIN"; then
            break
        else
            print_error "Invalid domain format. Please try again."
        fi
    done
    
    echo ""
    print_info "Choose SSL certificate type:"
    echo "1) Let's Encrypt (free, requires public domain)"
    echo "2) Self-signed (for testing/private networks)"
    read -p "Enter your choice (1 or 2): " ssl_choice
    
    case $ssl_choice in
        1)
            SSL_TYPE="letsencrypt"
            while true; do
                read -p "Email address for Let's Encrypt: " ADMIN_EMAIL
                if validate_email "$ADMIN_EMAIL"; then
                    break
                else
                    print_error "Invalid email format. Please try again."
                fi
            done
            ;;
        2)
            SSL_TYPE="selfsigned"
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    # Confirmation
    echo ""
    print_header "Configuration Summary"
    echo "Web Server: $WEB_SERVER"
    echo "UI Domain: $UI_DOMAIN (-> localhost:$UI_PORT)"
    echo "API Domain: $API_DOMAIN (-> localhost:$API_PORT)"
    echo "SSL Type: $SSL_TYPE"
    [ "$SSL_TYPE" = "letsencrypt" ] && echo "Email: $ADMIN_EMAIL"
    echo ""
    
    read -p "Proceed with this configuration? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Setup cancelled"
        exit 0
    fi
    
    # Check ports
    check_ports
    
    # Safety check before proceeding
    prompt_safe_installation "$WEB_SERVER"
    
    # Install web server
    if [ "$WEB_SERVER" = "nginx" ]; then
        install_nginx
        generate_nginx_config "$UI_DOMAIN" "$API_DOMAIN" "$SSL_TYPE"
        
        if test_nginx_config; then
            reload_nginx
        else
            print_error "Configuration test failed. Please check the logs."
            exit 1
        fi
    else
        install_apache
        generate_apache_config "$UI_DOMAIN" "$API_DOMAIN" "$SSL_TYPE"
        
        if test_apache_config; then
            reload_apache
        else
            print_error "Configuration test failed. Please check the logs."
            exit 1
        fi
    fi
    
    # Setup SSL
    if [ "$SSL_TYPE" = "letsencrypt" ]; then
        setup_letsencrypt "$UI_DOMAIN" "$API_DOMAIN" "$ADMIN_EMAIL" "$WEB_SERVER"
    else
        setup_selfsigned "$UI_DOMAIN" "$API_DOMAIN" "$WEB_SERVER"
    fi
    
    # Reload after SSL setup
    if [ "$WEB_SERVER" = "nginx" ]; then
        reload_nginx
    else
        reload_apache
    fi
    
    # Final steps
    print_header "Setup Complete!"
    
    print_success "Reverse proxy has been configured successfully"
    echo ""
    print_info "Access your application at:"
    echo "  UI:  https://$UI_DOMAIN"
    echo "  API: https://$API_DOMAIN"
    echo ""
    
    if [ "$SSL_TYPE" = "selfsigned" ]; then
        print_warning "You're using self-signed certificates. Browsers will show security warnings."
        print_info "To accept the certificates, visit the URLs and add security exceptions."
    fi
    
    echo ""
    print_header "Backup & Rollback Information"
    
    if [ -d "$BACKUP_DIR" ]; then
        print_success "Configuration backup saved to:"
        echo "  $BACKUP_DIR"
        echo ""
        
        if [ -f "$BACKUP_DIR/rollback.sh" ]; then
            print_info "If you need to undo these changes, run:"
            echo "  sudo bash $BACKUP_DIR/rollback.sh"
            echo ""
        fi
        
        print_warning "Keep this backup until you've confirmed everything works correctly!"
    fi
    
    echo ""
    print_info "Additional steps:"
    echo "  1. Make sure your firewall allows ports 80 and 443:"
    echo "     sudo ufw allow 80/tcp"
    echo "     sudo ufw allow 443/tcp"
    echo ""
    echo "  2. Update your application configuration:"
    echo "     - UI: Set API URL to https://$API_DOMAIN"
    echo "     - API: Update CORS settings if needed"
    echo ""
    echo "  3. Test the setup:"
    echo "     curl -I https://$UI_DOMAIN"
    echo "     curl -I https://$API_DOMAIN/health"
    echo ""
    echo "  4. Monitor your web server logs for any issues:"
    if [ "$WEB_SERVER" = "nginx" ]; then
        echo "     sudo tail -f /var/log/nginx/*_error.log"
    else
        echo "     sudo tail -f /var/log/apache2/*_error.log"
        echo "     (or /var/log/httpd/ on RHEL-based systems)"
    fi
    echo ""
    
    print_success "All done! 🚀"
}

# Run main function
main

exit 0
