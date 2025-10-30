#!/bin/bash

# Caddy Service Manager for Monitoring2025
# Convenient wrapper for managing Caddy reverse proxy

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detect if running as root or user
if systemctl --version &> /dev/null && systemctl list-units --all | grep -q "caddy-monitoring.service"; then
    SERVICE_TYPE="system"
    SYSTEMCTL_CMD="sudo systemctl"
    JOURNALCTL_CMD="sudo journalctl"
elif systemctl --user --version &> /dev/null && systemctl --user list-units --all | grep -q "caddy-monitoring.service"; then
    SERVICE_TYPE="user"
    SYSTEMCTL_CMD="systemctl --user"
    JOURNALCTL_CMD="journalctl --user"
else
    echo -e "${RED}ERROR: Caddy service not found!${NC}"
    echo "Run ./caddy-install.sh first to install Caddy."
    exit 1
fi

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=========================================="
    echo -e "$1"
    echo -e "==========================================${NC}"
}

show_status() {
    print_header "Caddy Service Status"
    $SYSTEMCTL_CMD status caddy-monitoring.service --no-pager
}

start_service() {
    print_info "Starting Caddy service..."
    $SYSTEMCTL_CMD start caddy-monitoring.service
    sleep 2
    if $SYSTEMCTL_CMD is-active --quiet caddy-monitoring.service; then
        print_info "Caddy service started successfully!"
        show_status
    else
        print_error "Failed to start Caddy service!"
        show_logs
        exit 1
    fi
}

stop_service() {
    print_info "Stopping Caddy service..."
    $SYSTEMCTL_CMD stop caddy-monitoring.service
    sleep 1
    print_info "Caddy service stopped."
}

restart_service() {
    print_info "Restarting Caddy service..."
    $SYSTEMCTL_CMD restart caddy-monitoring.service
    sleep 2
    if $SYSTEMCTL_CMD is-active --quiet caddy-monitoring.service; then
        print_info "Caddy service restarted successfully!"
        show_status
    else
        print_error "Failed to restart Caddy service!"
        show_logs
        exit 1
    fi
}

reload_config() {
    print_info "Reloading Caddy configuration..."
    
    # Validate first
    if [ "$SERVICE_TYPE" = "system" ]; then
        if sudo caddy validate --config /etc/caddy/Caddyfile; then
            print_info "Configuration is valid!"
        else
            print_error "Configuration validation failed!"
            exit 1
        fi
    else
        if caddy validate --config "$HOME/.config/caddy/Caddyfile"; then
            print_info "Configuration is valid!"
        else
            print_error "Configuration validation failed!"
            exit 1
        fi
    fi
    
    # Reload with timeout
    if timeout 10s $SYSTEMCTL_CMD reload caddy-monitoring.service 2>/dev/null; then
        sleep 1
        print_info "Configuration reloaded successfully!"
    else
        print_warn "Reload timed out or failed, trying restart instead..."
        if timeout 15s $SYSTEMCTL_CMD restart caddy-monitoring.service; then
            sleep 2
            print_info "Service restarted successfully!"
        else
            print_error "Restart also failed!"
            show_logs
            exit 1
        fi
    fi
}

show_logs() {
    print_header "Caddy Service Logs (last 50 lines)"
    $JOURNALCTL_CMD -u caddy-monitoring.service --no-pager -n 50
    echo ""
    print_info "To follow logs in real-time: $JOURNALCTL_CMD -u caddy-monitoring -f"
}

follow_logs() {
    print_info "Following Caddy logs (Ctrl+C to stop)..."
    $JOURNALCTL_CMD -u caddy-monitoring.service -f
}

validate_config() {
    print_info "Validating Caddyfile configuration..."
    if [ "$SERVICE_TYPE" = "system" ]; then
        sudo caddy validate --config /etc/caddy/Caddyfile
    else
        caddy validate --config "$HOME/.config/caddy/Caddyfile"
    fi
    
    if [ $? -eq 0 ]; then
        print_info "Configuration is valid!"
    else
        print_error "Configuration validation failed!"
        exit 1
    fi
}

configure_domain() {
    print_header "Configure Domain"
    echo ""
    
    # Load current config
    if [ "$SERVICE_TYPE" = "system" ]; then
        CONFIG_FILE="/etc/caddy/.caddy-domain-config"
        CADDY_FILE="/etc/caddy/Caddyfile"
    else
        CONFIG_FILE="$HOME/.config/caddy/.caddy-domain-config"
        CADDY_FILE="$HOME/.config/caddy/Caddyfile"
    fi
    
    # Show current configuration
    if [ -f "$CONFIG_FILE" ]; then
        # shellcheck disable=SC1090
        source "$CONFIG_FILE"
        print_info "Current domain: $CADDY_DOMAIN"
        [ -n "$CADDY_EMAIL" ] && print_info "Current email: $CADDY_EMAIL"
        [ -n "$CADDY_CERT_MODE" ] && print_info "Current cert mode: $CADDY_CERT_MODE"
    else
        print_warn "No domain configuration found."
    fi
    
    echo ""
    echo "Domain & Certificate Options:"
    echo ""
    echo "  1. localhost:8443 (Development - self-signed certificate)"
    echo "     • For local development only"
    echo "     • Browser will show security warning (normal)"
    echo ""
    echo "  2. Custom domain with Let's Encrypt on standard port 443 (RECOMMENDED)"
    echo "     • Best for production: ems3.sobhanonco.ir"
    echo "     • Automatic trusted SSL certificate"
    echo "     • Requires port 443 available (must stop other web servers first)"
    echo ""
    echo "  3. Custom domain with Let's Encrypt on custom port (e.g., 8443)"
    echo "     • For production when port 443 is occupied"
    echo "     • Requires port 80 available for ACME validation"
    echo "     • Users must specify port in URL: https://domain.com:8443"
    echo ""
    echo "  4. Custom domain with self-signed certificate on custom port"
    echo "     • When ports 80 and 443 are both occupied"
    echo "     • Browser will show security warning (must accept)"
    echo "     • No external port requirements"
    echo ""
    echo "  5. Cancel (keep current configuration)"
    echo ""
    read -p "Choose option [1-5]: " -r DOMAIN_CHOICE
    
    NEW_DOMAIN=""
    NEW_EMAIL=""
    CERT_MODE="letsencrypt"
    CONFIGURED_PORT=""
    
    case "$DOMAIN_CHOICE" in
        1)
            # Option 1: localhost development
            NEW_DOMAIN="localhost:8443"
            NEW_EMAIL=""
            CERT_MODE="internal"
            CONFIGURED_PORT="8443"
            print_info "Switching to localhost:8443 for development"
            ;;
        2)
            # Option 2: Production with Let's Encrypt on port 443
            echo ""
            read -p "Enter your domain (e.g., ems3.sobhanonco.ir): " -r NEW_DOMAIN
            if [ -z "$NEW_DOMAIN" ]; then
                print_error "Domain cannot be empty!"
                return 1
            fi
            
            # Remove protocol and trailing slash if present
            NEW_DOMAIN=$(echo "$NEW_DOMAIN" | sed -E 's~^https?://~~' | sed 's~/$~~')
            
            # Check if port 443 is available
            if command -v ss &> /dev/null; then
                if ss -tlnp 2>/dev/null | grep -q ":443 "; then
                    print_error "Port 443 is already in use!"
                    echo ""
                    ss -tlnp 2>/dev/null | grep ":443 " || true
                    echo ""
                    print_error "Stop the service using port 443 first, or choose option 3 or 4."
                    return 1
                fi
            elif command -v netstat &> /dev/null; then
                if netstat -tlnp 2>/dev/null | grep -q ":443 "; then
                    print_error "Port 443 is already in use!"
                    echo ""
                    netstat -tlnp 2>/dev/null | grep ":443 " || true
                    echo ""
                    print_error "Stop the service using port 443 first, or choose option 3 or 4."
                    return 1
                fi
            fi
            
            CONFIGURED_PORT="443"
            CERT_MODE="letsencrypt"
            
            echo ""
            read -p "Enter your email for Let's Encrypt notifications: " -r NEW_EMAIL
            if [ -z "$NEW_EMAIL" ]; then
                print_warn "No email provided. Let's Encrypt notifications will be disabled."
            fi
            
            print_info "Domain: $NEW_DOMAIN (port 443)"
            [ -n "$NEW_EMAIL" ] && print_info "Email: $NEW_EMAIL"
            
            echo ""
            print_warn "IMPORTANT: Make sure your DNS A record points to this server!"
            print_warn "Domain: $NEW_DOMAIN → $(hostname -I 2>/dev/null | awk '{print $1}' || echo 'N/A')"
            echo ""
            read -p "Press Enter to continue, or Ctrl+C to cancel..."
            ;;
        3)
            # Option 3: Custom port with Let's Encrypt (requires port 80)
            echo ""
            read -p "Enter your domain (e.g., ems3.sobhanonco.ir): " -r NEW_DOMAIN
            if [ -z "$NEW_DOMAIN" ]; then
                print_error "Domain cannot be empty!"
                return 1
            fi
            
            # Remove protocol and trailing slash if present
            NEW_DOMAIN=$(echo "$NEW_DOMAIN" | sed -E 's~^https?://~~' | sed 's~/$~~')
            
            echo ""
            read -p "Enter HTTPS port for Caddy (e.g., 8443): " -r NEW_PORT
            if [ -z "$NEW_PORT" ]; then
                print_error "Port cannot be empty!"
                return 1
            fi
            
            # Validate port number
            if ! [[ "$NEW_PORT" =~ ^[0-9]+$ ]] || [ "$NEW_PORT" -lt 1 ] || [ "$NEW_PORT" -gt 65535 ]; then
                print_error "Invalid port number! Must be between 1-65535"
                return 1
            fi
            
            # Check if chosen port is in use
            if command -v ss &> /dev/null; then
                if ss -tlnp 2>/dev/null | grep -q ":$NEW_PORT "; then
                    print_error "Port $NEW_PORT is already in use!"
                    ss -tlnp 2>/dev/null | grep ":$NEW_PORT " || true
                    return 1
                fi
            elif command -v netstat &> /dev/null; then
                if netstat -tlnp 2>/dev/null | grep -q ":$NEW_PORT "; then
                    print_error "Port $NEW_PORT is already in use!"
                    netstat -tlnp 2>/dev/null | grep ":$NEW_PORT " || true
                    return 1
                fi
            fi
            
            # Check if port 80 is available for ACME
            echo ""
            print_warn "IMPORTANT: Let's Encrypt requires port 80 for domain validation!"
            if command -v ss &> /dev/null; then
                if ss -tlnp 2>/dev/null | grep -q ":80 "; then
                    print_error "Port 80 is already in use!"
                    echo ""
                    ss -tlnp 2>/dev/null | grep ":80 " || true
                    echo ""
                    print_error "Let's Encrypt cannot validate domain without port 80 access."
                    print_error "Choose option 4 (self-signed) instead, or free up port 80."
                    return 1
                fi
            elif command -v netstat &> /dev/null; then
                if netstat -tlnp 2>/dev/null | grep -q ":80 "; then
                    print_error "Port 80 is already in use!"
                    echo ""
                    netstat -tlnp 2>/dev/null | grep ":80 " || true
                    echo ""
                    print_error "Let's Encrypt cannot validate domain without port 80 access."
                    print_error "Choose option 4 (self-signed) instead, or free up port 80."
                    return 1
                fi
            fi
            
            NEW_DOMAIN="$NEW_DOMAIN:$NEW_PORT"
            CONFIGURED_PORT="$NEW_PORT"
            CERT_MODE="letsencrypt"
            
            echo ""
            read -p "Enter your email for Let's Encrypt notifications: " -r NEW_EMAIL
            if [ -z "$NEW_EMAIL" ]; then
                print_warn "No email provided. Let's Encrypt notifications will be disabled."
            fi
            
            print_info "Domain: $NEW_DOMAIN"
            [ -n "$NEW_EMAIL" ] && print_info "Email: $NEW_EMAIL"
            print_info "Port 80 will be used for ACME challenges only"
            
            echo ""
            print_warn "IMPORTANT: Make sure your DNS A record points to this server!"
            print_warn "Domain: $NEW_DOMAIN → $(hostname -I 2>/dev/null | awk '{print $1}' || echo 'N/A')"
            echo ""
            read -p "Press Enter to continue, or Ctrl+C to cancel..."
            ;;
        4)
            # Option 4: Custom port with self-signed certificate
            echo ""
            read -p "Enter your domain (e.g., ems3.sobhanonco.ir): " -r NEW_DOMAIN
            if [ -z "$NEW_DOMAIN" ]; then
                print_error "Domain cannot be empty!"
                return 1
            fi
            
            # Remove protocol and trailing slash if present
            NEW_DOMAIN=$(echo "$NEW_DOMAIN" | sed -E 's~^https?://~~' | sed 's~/$~~')
            
            echo ""
            read -p "Enter HTTPS port for Caddy (e.g., 8443): " -r NEW_PORT
            if [ -z "$NEW_PORT" ]; then
                print_error "Port cannot be empty!"
                return 1
            fi
            
            # Validate port number
            if ! [[ "$NEW_PORT" =~ ^[0-9]+$ ]] || [ "$NEW_PORT" -lt 1 ] || [ "$NEW_PORT" -gt 65535 ]; then
                print_error "Invalid port number! Must be between 1-65535"
                return 1
            fi
            
            # Check if port is in use
            if command -v ss &> /dev/null; then
                if ss -tlnp 2>/dev/null | grep -q ":$NEW_PORT "; then
                    print_error "Port $NEW_PORT is already in use!"
                    ss -tlnp 2>/dev/null | grep ":$NEW_PORT " || true
                    return 1
                fi
            elif command -v netstat &> /dev/null; then
                if netstat -tlnp 2>/dev/null | grep -q ":$NEW_PORT "; then
                    print_error "Port $NEW_PORT is already in use!"
                    netstat -tlnp 2>/dev/null | grep ":$NEW_PORT " || true
                    return 1
                fi
            fi
            
            NEW_DOMAIN="$NEW_DOMAIN:$NEW_PORT"
            CONFIGURED_PORT="$NEW_PORT"
            CERT_MODE="internal"
            NEW_EMAIL=""
            
            print_info "Domain: $NEW_DOMAIN"
            print_info "Certificate: Self-signed (internal)"
            print_warn "Browser will show security warning - users must click 'Advanced' → 'Proceed'"
            
            echo ""
            read -p "Press Enter to continue, or Ctrl+C to cancel..."
            ;;
        5|*)
            print_info "Configuration unchanged."
            return 0
            ;;
    esac
    
    # Generate new Caddyfile
    print_info "Generating new Caddyfile..."
    
    cat > /tmp/Caddyfile.tmp <<EOF
# Caddy Reverse Proxy Configuration - Monitoring2025
# Updated on $(date)
# Certificate Mode: $CERT_MODE

EOF

    # Add port 80 handler for Let's Encrypt ACME challenges (Option 3 only)
    if [ "$CERT_MODE" = "letsencrypt" ] && [ -n "$CONFIGURED_PORT" ] && [ "$CONFIGURED_PORT" != "443" ] && [ "$CONFIGURED_PORT" != "80" ]; then
        cat >> /tmp/Caddyfile.tmp <<EOF
# Port 80 - ACME HTTP-01 challenge handler for Let's Encrypt
:80 {
    # Handle ACME challenges for certificate validation
    handle /.well-known/acme-challenge/* {
        respond "ACME challenge handler active" 200
    }
    
    # Redirect all other traffic to HTTPS with custom port
    handle {
        redir https://{host}:$CONFIGURED_PORT{uri} permanent
    }
}

EOF
    fi

    # Global options for self-signed certificates
    if [ "$CERT_MODE" = "internal" ]; then
        cat >> /tmp/Caddyfile.tmp <<EOF
# Global options for self-signed certificates
{
    auto_https disable_redirects
}

EOF
    fi

    cat >> /tmp/Caddyfile.tmp <<EOF
# Main domain configuration
$NEW_DOMAIN {
EOF

    # Add TLS configuration based on mode
    if [ "$CERT_MODE" = "internal" ]; then
        cat >> /tmp/Caddyfile.tmp <<EOF
    # Self-signed certificate (internal CA)
    tls internal

EOF
    elif [ "$CERT_MODE" = "letsencrypt" ]; then
        if [[ ! "$NEW_DOMAIN" =~ ^localhost ]]; then
            if [ -n "$NEW_EMAIL" ]; then
                cat >> /tmp/Caddyfile.tmp <<EOF
    # Automatic HTTPS with Let's Encrypt
    tls $NEW_EMAIL {
        protocols tls1.2 tls1.3
    }

EOF
            else
                cat >> /tmp/Caddyfile.tmp <<EOF
    # Automatic HTTPS with Let's Encrypt
    tls {
        protocols tls1.2 tls1.3
    }

EOF
            fi
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

    # Validate new configuration
    print_info "Validating new configuration..."
    if caddy validate --config /tmp/Caddyfile.tmp 2>&1 | grep -q "Valid"; then
        print_info "Configuration is valid!"
    else
        print_error "Configuration validation failed!"
        caddy validate --config /tmp/Caddyfile.tmp
        rm -f /tmp/Caddyfile.tmp
        return 1
    fi
    
    # Backup old config
    print_info "Backing up current configuration..."
    if [ "$SERVICE_TYPE" = "system" ]; then
        sudo cp "$CADDY_FILE" "${CADDY_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    else
        cp "$CADDY_FILE" "${CADDY_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Install new config
    print_info "Installing new configuration..."
    if [ "$SERVICE_TYPE" = "system" ]; then
        sudo mv /tmp/Caddyfile.tmp "$CADDY_FILE"
        sudo chown caddy:caddy "$CADDY_FILE" 2>/dev/null || true
        
        # Save domain config
        sudo tee "$CONFIG_FILE" > /dev/null <<EOF
CADDY_DOMAIN=$NEW_DOMAIN
CADDY_EMAIL=$NEW_EMAIL
CADDY_PORT=$CONFIGURED_PORT
CADDY_CERT_MODE=$CERT_MODE
EOF
        sudo chown caddy:caddy "$CONFIG_FILE" 2>/dev/null || true
    else
        mv /tmp/Caddyfile.tmp "$CADDY_FILE"
        
        # Save domain config
        cat > "$CONFIG_FILE" <<EOF
CADDY_DOMAIN=$NEW_DOMAIN
CADDY_EMAIL=$NEW_EMAIL
CADDY_PORT=$CONFIGURED_PORT
CADDY_CERT_MODE=$CERT_MODE
EOF
    fi
    
    # Reload Caddy with timeout
    print_info "Reloading Caddy with new configuration..."
    
    # Try reload first with timeout
    if timeout 10s $SYSTEMCTL_CMD reload caddy-monitoring.service 2>/dev/null; then
        print_info "Configuration reloaded via systemctl reload"
    else
        print_warn "Reload timed out or failed, trying restart instead..."
        if timeout 15s $SYSTEMCTL_CMD restart caddy-monitoring.service; then
            print_info "Service restarted successfully"
        else
            print_error "Restart also failed!"
            show_logs
            return 1
        fi
    fi
    
    sleep 2
    
    if $SYSTEMCTL_CMD is-active --quiet caddy-monitoring.service; then
        print_info "Configuration updated successfully!"
        echo ""
        print_info "Access your application at: https://$NEW_DOMAIN"
        echo ""
        
        # Display certificate mode specific information
        if [ "$CERT_MODE" = "internal" ]; then
            print_warn "Using self-signed certificate - browser will show a security warning"
            print_warn "This is expected - click 'Advanced' → 'Proceed to $NEW_DOMAIN' to continue"
            echo ""
            print_info "The connection is still encrypted, but the certificate is not from a trusted CA"
        elif [ "$CERT_MODE" = "letsencrypt" ]; then
            print_info "Using Let's Encrypt for automatic trusted SSL certificate"
            print_info "Certificate will be obtained on first access (may take 10-30 seconds)"
            echo ""
            if [ -n "$CONFIGURED_PORT" ] && [ "$CONFIGURED_PORT" != "443" ]; then
                print_info "Port 80 is being used for ACME challenges only"
            fi
            print_info "Certificate will auto-renew before expiration"
        fi
        
        echo ""
        print_info "URLs:"
        print_info "  Frontend:    https://$NEW_DOMAIN"
        print_info "  API:         https://$NEW_DOMAIN/api/"
        print_info "  SignalR:     https://$NEW_DOMAIN/hubs/monitoring"
        print_info "  API Docs:    https://$NEW_DOMAIN/swagger/"
    else
        print_error "Failed to reload Caddy with new configuration!"
        show_logs
        return 1
    fi
}

edit_config() {
    print_warn "Manual editing is not recommended. Use './caddy-manager.sh domain' instead."
    echo ""
    read -p "Continue with manual edit? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 0
    fi
    
    print_info "Opening Caddyfile for editing..."
    
    if [ "$SERVICE_TYPE" = "system" ]; then
        CADDY_FILE="/etc/caddy/Caddyfile"
        if command -v nano &> /dev/null; then
            sudo nano "$CADDY_FILE"
        elif command -v vim &> /dev/null; then
            sudo vim "$CADDY_FILE"
        elif command -v vi &> /dev/null; then
            sudo vi "$CADDY_FILE"
        else
            print_error "No editor found (nano, vim, vi). Edit manually: $CADDY_FILE"
            exit 1
        fi
    else
        CADDY_FILE="$HOME/.config/caddy/Caddyfile"
        if command -v nano &> /dev/null; then
            nano "$CADDY_FILE"
        elif command -v vim &> /dev/null; then
            vim "$CADDY_FILE"
        elif command -v vi &> /dev/null; then
            vi "$CADDY_FILE"
        else
            print_error "No editor found (nano, vim, vi). Edit manually: $CADDY_FILE"
            exit 1
        fi
    fi
    
    # Validate and offer to reload
    echo ""
    validate_config
    echo ""
    read -p "Reload configuration now? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        reload_config
    fi
}

show_info() {
    print_header "Caddy Service Information"
    
    # Load current config
    if [ "$SERVICE_TYPE" = "system" ]; then
        CONFIG_FILE="/etc/caddy/.caddy-domain-config"
        echo "Service Type: System-wide"
        echo "Config File:  /etc/caddy/Caddyfile"
        echo "Log Files:    /var/log/caddy/"
        echo "Data Dir:     /var/lib/caddy/"
    else
        CONFIG_FILE="$HOME/.config/caddy/.caddy-domain-config"
        echo "Service Type: User mode"
        echo "Config File:  $HOME/.config/caddy/Caddyfile"
        echo "Log Files:    $HOME/.local/var/log/caddy/"
        echo "Data Dir:     $HOME/.local/var/lib/caddy/"
    fi
    
    echo ""
    echo "Service Status:"
    if $SYSTEMCTL_CMD is-active --quiet caddy-monitoring.service; then
        echo -e "  ${GREEN}● Running${NC}"
    else
        echo -e "  ${RED}● Stopped${NC}"
    fi
    
    echo ""
    echo "Caddy Version:"
    caddy version
    
    echo ""
    echo "Current Configuration:"
    if [ -f "$CONFIG_FILE" ]; then
        # shellcheck disable=SC1090
        source "$CONFIG_FILE"
        echo "  Domain: $CADDY_DOMAIN"
        [ -n "$CADDY_EMAIL" ] && echo "  Email:  $CADDY_EMAIL"
        [ -n "$CADDY_CERT_MODE" ] && echo "  Cert Mode: $CADDY_CERT_MODE"
    else
        echo "  Domain: Not configured"
    fi
    
    echo ""
    echo "Access URLs:"
    if [ -f "$CONFIG_FILE" ]; then
        # shellcheck disable=SC1090
        source "$CONFIG_FILE"
        echo "  Frontend:     https://$CADDY_DOMAIN"
        echo "  API:          https://$CADDY_DOMAIN/api/"
        echo "  SignalR Hub:  https://$CADDY_DOMAIN/hubs/monitoring"
        echo "  API Swagger:  https://$CADDY_DOMAIN/swagger/"
    else
        echo "  Frontend:     https://localhost:8443"
        echo "  API:          https://localhost:8443/api/"
        echo "  SignalR Hub:  https://localhost:8443/hubs/monitoring"
        echo "  API Swagger:  https://localhost:8443/swagger/"
    fi
    
    echo ""
    echo "Backend Services (proxied):"
    echo "  API:          http://localhost:5030"
    echo "  Frontend UI:  http://localhost:5173"
}

check_ports() {
    print_header "Port Usage Check"
    echo ""
    
    print_info "Checking which ports are in use..."
    echo ""
    
    # Check port 80
    echo "Port 80 (HTTP):"
    if command -v ss &> /dev/null; then
        ss -tlnp 2>/dev/null | grep ":80 " || echo "  Not in use"
    elif command -v netstat &> /dev/null; then
        netstat -tlnp 2>/dev/null | grep ":80 " || echo "  Not in use"
    else
        echo "  Cannot check (ss/netstat not available)"
    fi
    
    echo ""
    
    # Check port 443
    echo "Port 443 (HTTPS):"
    if command -v ss &> /dev/null; then
        ss -tlnp 2>/dev/null | grep ":443 " || echo "  Not in use"
    elif command -v netstat &> /dev/null; then
        netstat -tlnp 2>/dev/null | grep ":443 " || echo "  Not in use"
    else
        echo "  Cannot check (ss/netstat not available)"
    fi
    
    echo ""
    
    # Check port 8443
    echo "Port 8443 (Alternative HTTPS):"
    if command -v ss &> /dev/null; then
        ss -tlnp 2>/dev/null | grep ":8443 " || echo "  Not in use"
    elif command -v netstat &> /dev/null; then
        netstat -tlnp 2>/dev/null | grep ":8443 " || echo "  Not in use"
    else
        echo "  Cannot check (ss/netstat not available)"
    fi
    
    echo ""
    
    # Show current Caddyfile configuration
    if [ "$SERVICE_TYPE" = "system" ]; then
        CADDY_FILE="/etc/caddy/Caddyfile"
    else
        CADDY_FILE="$HOME/.config/caddy/Caddyfile"
    fi
    
    if [ -f "$CADDY_FILE" ]; then
        print_info "Current Caddyfile domain configuration:"
        grep -E "^[a-zA-Z0-9.-]+(:)?[0-9]*\s+{" "$CADDY_FILE" | head -1 || echo "  Could not detect domain line"
    fi
    
    echo ""
    print_info "SSL/TLS Certificate Options:"
    echo "  Run: $0 domain"
    echo ""
    echo "  Option 1: localhost:8443 (development)"
    echo "  Option 2: Standard port 443 + Let's Encrypt (production, recommended)"
    echo "  Option 3: Custom port + Let's Encrypt (needs port 80 for validation)"
    echo "  Option 4: Custom port + self-signed cert (no port 80/443 needed)"
}

show_help() {
    print_header "Caddy Service Manager - Monitoring2025"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start       Start Caddy service"
    echo "  stop        Stop Caddy service"
    echo "  restart     Restart Caddy service"
    echo "  reload      Reload configuration without downtime"
    echo "  status      Show service status"
    echo "  logs        Show recent logs"
    echo "  follow      Follow logs in real-time"
    echo "  domain      Configure domain (interactive)"
    echo "  validate    Validate Caddyfile configuration"
    echo "  edit        Edit Caddyfile manually (not recommended)"
    echo "  info        Show service information"
    echo "  ports       Check port usage and diagnose conflicts"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                # Start Caddy service"
    echo "  $0 domain               # Configure domain interactively"
    echo "  $0 logs                 # Show recent logs"
    echo "  $0 reload               # Reload configuration"
    echo "  $0 info                 # Show current configuration"
    echo "  $0 ports                # Check which ports are in use"
    echo ""
}

# Main command dispatcher
case "${1:-help}" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    reload)
        reload_config
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    follow)
        follow_logs
        ;;
    domain)
        configure_domain
        ;;
    validate)
        validate_config
        ;;
    edit)
        edit_config
        ;;
    info)
        show_info
        ;;
    ports)
        check_ports
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
