# Caddy Reverse Proxy Setup for Monitoring2025

## Overview

This setup provides a **portable, conflict-free HTTPS reverse proxy** using [Caddy Server](https://caddyserver.com/) to unify your backend API and frontend UI under a single domain with automatic SSL certificates.

### Why Caddy?

- ✅ **Portable**: Single binary, no dependencies
- ✅ **No conflicts**: Runs on any port, won't interfere with existing web servers
- ✅ **Automatic HTTPS**: Free SSL certificates from Let's Encrypt
- ✅ **Simple config**: Minimal Caddyfile syntax
- ✅ **WebSocket support**: Built-in for SignalR real-time streaming
- ✅ **Zero-downtime reloads**: Update config without stopping service
- ✅ **Cross-platform**: Works on Linux/Windows/macOS

## Architecture

```
                                   ┌─────────────────┐
                                   │   Caddy Proxy   │
                                   │  (Port 8443)    │
                                   │   HTTPS Only    │
                                   └────────┬────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
            ┌───────────────┐       ┌──────────────┐      ┌──────────────┐
            │  Frontend UI  │       │  Backend API │      │  SignalR Hub │
            │  (Port 5173)  │       │ (Port 5030)  │      │ (Port 5030)  │
            │  React/Vite   │       │ ASP.NET Core │      │   WebSocket  │
            └───────────────┘       └──────────────┘      └──────────────┘
```

### Request Routing

| URL Pattern | Proxied To | Purpose |
|-------------|------------|---------|
| `https://localhost:8443/` | `http://localhost:5173` | Frontend UI (React/Vite) |
| `https://localhost:8443/api/*` | `http://localhost:5030/api/*` | Backend REST API |
| `https://localhost:8443/hubs/*` | `http://localhost:5030/hubs/*` | SignalR WebSocket Hub |
| `https://localhost:8443/swagger/*` | `http://localhost:5030/swagger/*` | API Documentation |

## Installation

### Prerequisites

- Linux server (Ubuntu/Debian/CentOS/RHEL/Arch)
- Backend API running on port 5030
- Frontend UI running on port 5173
- Root or sudo access (for system-wide installation)

### Quick Install

```bash
# Clone or navigate to project directory
cd /path/to/Monitoring2025

# Make scripts executable
chmod +x caddy-install.sh caddy-manager.sh

# Install Caddy (as root for system-wide, or regular user for user-mode)
./caddy-install.sh

# The script will:
# 1. Install Caddy server
# 2. Create systemd service
# 3. Copy and validate Caddyfile
# 4. Start the service
```

### Installation Modes

**System-wide Installation (requires root):**
```bash
sudo ./caddy-install.sh
# Service runs as 'caddy' user
# Config: /etc/caddy/Caddyfile
# Logs: /var/log/caddy/
# Data: /var/lib/caddy/
```

**User-mode Installation (no root required):**
```bash
./caddy-install.sh
# Service runs as your user
# Config: ~/.config/caddy/Caddyfile
# Logs: ~/.local/var/log/caddy/
# Data: ~/.local/var/lib/caddy/
```

## Configuration

### Development (localhost)

Default configuration uses `localhost:8443` for local development with self-signed certificates.

**No changes needed** - works out of the box!

### Production (real domain)

**Interactive domain configuration** (recommended):

```bash
./caddy-manager.sh domain
```

The script will:
1. Ask if you want localhost or custom domain
2. Prompt for your domain name (e.g., `monitoring.yourdomain.com`)
3. Prompt for your email (for Let's Encrypt notifications)
4. Generate and validate the new configuration
5. Backup the old configuration
6. Reload Caddy with zero downtime

**Manual steps:**
1. Point your domain's DNS A record to your server's IP
2. Run `./caddy-manager.sh domain`
3. Choose option 2 (Custom domain)
4. Enter your domain and email
5. Caddy will automatically get a free Let's Encrypt SSL certificate! 🎉

**Note**: You can also configure the domain during installation when prompted.

### Environment Variables

Set `CADDY_DOMAIN` environment variable to override default domain:

```bash
# For development
export CADDY_DOMAIN=localhost:8443

# For production
export CADDY_DOMAIN=monitoring.yourdomain.com
```

## Management

### Service Manager Script

Use `caddy-manager.sh` for convenient service management:

```bash
# Show help
./caddy-manager.sh help

# Common commands
./caddy-manager.sh start       # Start service
./caddy-manager.sh stop        # Stop service
./caddy-manager.sh restart     # Restart service
./caddy-manager.sh reload      # Reload config (zero downtime)
./caddy-manager.sh status      # Show service status
./caddy-manager.sh logs        # Show recent logs
./caddy-manager.sh follow      # Follow logs in real-time
./caddy-manager.sh validate    # Validate Caddyfile
./caddy-manager.sh edit        # Edit Caddyfile
./caddy-manager.sh info        # Show service info
```

### Manual Service Commands

**System-wide service:**
```bash
sudo systemctl start caddy-monitoring
sudo systemctl stop caddy-monitoring
sudo systemctl restart caddy-monitoring
sudo systemctl reload caddy-monitoring
sudo systemctl status caddy-monitoring
sudo journalctl -u caddy-monitoring -f
```

**User-mode service:**
```bash
systemctl --user start caddy-monitoring
systemctl --user stop caddy-monitoring
systemctl --user restart caddy-monitoring
systemctl --user reload caddy-monitoring
systemctl --user status caddy-monitoring
journalctl --user -u caddy-monitoring -f
```

## Security Features

### Automatic HTTPS

- **Let's Encrypt**: Automatic certificate issuance and renewal
- **TLS 1.2/1.3**: Modern protocol versions only
- **Self-signed certs**: For localhost development

### Security Headers

All responses include security headers:

- `Strict-Transport-Security`: Force HTTPS for 1 year
- `X-Frame-Options`: Prevent clickjacking
- `X-Content-Type-Options`: Prevent MIME sniffing
- `Referrer-Policy`: Control referrer information
- `Content-Security-Policy`: XSS protection

### Client IP Forwarding

Caddy forwards real client IP to backend:

- `X-Real-IP`: Client IP address
- `X-Forwarded-For`: Proxy chain
- `X-Forwarded-Proto`: Original protocol (https)

## Testing

### 1. Verify Services are Running

```bash
# Check backend API
curl http://localhost:5030/api/health

# Check frontend UI
curl http://localhost:5173

# Check Caddy status
./caddy-manager.sh status
```

### 2. Test HTTPS Proxy

```bash
# Test frontend (accept self-signed cert for localhost)
curl -k https://localhost:8443/

# Test API
curl -k https://localhost:8443/api/health

# Test with certificate verification (production with real domain)
curl https://monitoring.yourdomain.com/api/health
```

### 3. Test SignalR WebSocket

```bash
# Check WebSocket upgrade support
curl -k -i \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  https://localhost:8443/hubs/monitoring
```

### 4. Browser Testing

Open in browser:
- Frontend: `https://localhost:8443/`
- API Docs: `https://localhost:8443/swagger/`

**Note**: Browser will show certificate warning for localhost - this is normal. Click "Advanced" → "Proceed" to continue.

## Troubleshooting

### Service Won't Start

```bash
# Check logs
./caddy-manager.sh logs

# Validate configuration
./caddy-manager.sh validate

# Check if ports are in use
sudo netstat -tlnp | grep -E ':(8443|5030|5173)'
```

### Certificate Issues

```bash
# Check certificate status (production)
caddy trust list

# Force certificate renewal
caddy renew

# Check Let's Encrypt logs
./caddy-manager.sh logs | grep -i "certificate"
```

### WebSocket Connection Failures

```bash
# Check SignalR hub is running
curl http://localhost:5030/hubs/monitoring

# Check Caddy WebSocket config
./caddy-manager.sh validate

# Check browser console for WebSocket errors
# Look for "101 Switching Protocols" in network tab
```

### Backend/Frontend Not Accessible

```bash
# Verify services are running
systemctl status ems3-api.service     # Backend
systemctl --user status ems3-ui       # Frontend (PM2)

# Check if Caddy can reach them
curl http://localhost:5030/api/health
curl http://localhost:5173/
```

### Port Conflicts

If port 8443 is already in use:

1. Edit Caddyfile:
```bash
./caddy-manager.sh edit
```

2. Change port:
```caddyfile
# From:
localhost:8443 {

# To:
localhost:9443 {
```

3. Reload:
```bash
./caddy-manager.sh reload
```

## Performance Tuning

### Connection Limits

Edit systemd service to increase limits:

```bash
# System-wide
sudo systemctl edit caddy-monitoring.service

# User-mode
systemctl --user edit caddy-monitoring.service
```

Add:
```ini
[Service]
LimitNOFILE=1048576
LimitNPROC=512
```

Reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart caddy-monitoring
```

### WebSocket Timeouts

Edit Caddyfile to adjust timeouts:

```caddyfile
handle /hubs/* {
    reverse_proxy localhost:5030 {
        transport http {
            read_timeout 120s
            write_timeout 120s
        }
    }
}
```

Reload:
```bash
./caddy-manager.sh reload
```

## Advanced Configuration

### Custom Port

```caddyfile
:9443 {  # Listen on port 9443
    # ... rest of config
}
```

### Multiple Domains

```caddyfile
monitoring.domain1.com {
    # Production site
}

staging.domain1.com {
    # Staging site
}
```

### Basic Authentication

```caddyfile
monitoring.yourdomain.com {
    basicauth /admin/* {
        admin $2a$14$hashed_password
    }
}
```

Generate password hash:
```bash
caddy hash-password --plaintext "your-password"
```

### Rate Limiting

```caddyfile
monitoring.yourdomain.com {
    rate_limit {
        zone api {
            match path /api/*
            rate 100r/m
        }
    }
}
```

## Migration from nginx

If migrating from nginx:

1. **Stop nginx** (to free port 443):
```bash
sudo systemctl stop nginx
sudo systemctl disable nginx
```

2. **Update Caddyfile** to listen on port 443:
```caddyfile
monitoring.yourdomain.com {
    # Caddy will automatically use port 443
}
```

3. **Copy SSL certificates** (optional):
```bash
# Caddy can use existing certs
tls /path/to/cert.pem /path/to/key.pem
```

4. **Reload Caddy**:
```bash
./caddy-manager.sh reload
```

## Monitoring & Logs

### Log Files

**System-wide:**
- Access logs: `/var/log/caddy/access.log`
- Error logs: `/var/log/caddy/error.log`

**User-mode:**
- Access logs: `~/.local/var/log/caddy/access.log`
- Error logs: `~/.local/var/log/caddy/error.log`

### Real-time Monitoring

```bash
# Follow all logs
./caddy-manager.sh follow

# Filter for errors only
./caddy-manager.sh logs | grep ERROR

# Monitor access logs
tail -f /var/log/caddy/access.log | jq .

# Check service health
./caddy-manager.sh status
```

### Metrics Endpoint

Enable Caddy admin API for metrics:

```caddyfile
{
    admin localhost:2019
}
```

Query metrics:
```bash
curl http://localhost:2019/metrics
```

## Backup & Restore

### Backup Configuration

```bash
# System-wide
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup

# User-mode
cp ~/.config/caddy/Caddyfile ~/.config/caddy/Caddyfile.backup
```

### Backup Certificates

```bash
# System-wide
sudo tar -czf caddy-certs-backup.tar.gz /var/lib/caddy/.local/share/caddy/

# User-mode
tar -czf caddy-certs-backup.tar.gz ~/.local/var/lib/caddy/
```

### Restore

```bash
# Restore config
./caddy-manager.sh edit  # Paste backup content

# Validate and reload
./caddy-manager.sh validate
./caddy-manager.sh reload
```

## Uninstall

```bash
# Stop service
./caddy-manager.sh stop

# Disable service
sudo systemctl disable caddy-monitoring  # System-wide
systemctl --user disable caddy-monitoring  # User-mode

# Remove service file
sudo rm /etc/systemd/system/caddy-monitoring.service  # System-wide
rm ~/.config/systemd/user/caddy-monitoring.service  # User-mode

# Remove Caddy
sudo apt remove caddy  # Ubuntu/Debian
sudo dnf remove caddy  # CentOS/RHEL/Fedora

# Remove configs and data (optional)
sudo rm -rf /etc/caddy /var/log/caddy /var/lib/caddy  # System-wide
rm -rf ~/.config/caddy ~/.local/var/log/caddy ~/.local/var/lib/caddy  # User-mode
```

## Resources

- [Official Caddy Documentation](https://caddyserver.com/docs/)
- [Caddyfile Syntax](https://caddyserver.com/docs/caddyfile)
- [Reverse Proxy Guide](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [Community Forum](https://caddy.community/)

## Support

For issues specific to this setup:
1. Check `./caddy-manager.sh logs` for error messages
2. Validate config: `./caddy-manager.sh validate`
3. Check service status: `./caddy-manager.sh status`
4. Review this README's troubleshooting section

For Caddy-specific issues, consult official documentation or community forum.

---

**Quick Start Checklist:**

- [ ] Run `./caddy-install.sh` to install Caddy
- [ ] Verify backend running on port 5030
- [ ] Verify frontend running on port 5173
- [ ] Access via `https://localhost:8443`
- [ ] (Optional) Configure production domain in Caddyfile
- [ ] (Optional) Test SignalR WebSocket connection

**Production Deployment:**

- [ ] Edit Caddyfile with your domain
- [ ] Point DNS A record to server IP
- [ ] Reload Caddy: `./caddy-manager.sh reload`
- [ ] Verify Let's Encrypt certificate issued
- [ ] Test HTTPS access from browser
- [ ] Set up monitoring and log rotation

---

**Need help?** Run `./caddy-manager.sh help` for quick reference.
