# Caddy Reverse Proxy - Quick Usage Guide

## 🚀 Installation

Run the installation script on your Linux server:

```bash
./caddy-install.sh
```

### During Installation

You'll be prompted to configure your domain:

```
Domain Configuration
==========================================

Domain options:
  1. localhost:8443 (Development - self-signed certificate)
  2. Custom domain (Production - automatic Let's Encrypt certificate)
  3. Skip (configure later with ./caddy-manager.sh domain)

Choose option [1-3] (default: 1):
```

### Option 1: Development (localhost)
- Uses `localhost:8443`
- Self-signed certificate
- Perfect for local testing
- **No DNS required**

### Option 2: Production (custom domain)
- Prompts for your domain: `monitoring.yourdomain.com`
- Prompts for email: `admin@yourdomain.com` (for Let's Encrypt)
- Automatic SSL certificate from Let's Encrypt
- **Requires DNS A record pointing to server**

### Option 3: Skip
- Uses `localhost:8443` as default
- Configure later with `./caddy-manager.sh domain`

## 🔧 Managing Domain Configuration

### View Current Domain

```bash
./caddy-manager.sh info
```

Output:
```
Current Configuration:
  Domain: localhost:8443
  Email:  (none)

Access URLs:
  Frontend:     https://localhost:8443
  API:          https://localhost:8443/api/
  SignalR Hub:  https://localhost:8443/hubs/monitoring
  API Swagger:  https://localhost:8443/swagger/
```

### Change Domain (Interactive)

```bash
./caddy-manager.sh domain
```

The script will:
1. ✅ Show current configuration
2. ✅ Ask for new domain (localhost or custom)
3. ✅ Validate DNS if custom domain
4. ✅ Generate new Caddyfile automatically
5. ✅ Backup old configuration
6. ✅ Reload Caddy with zero downtime

**Example Session:**

```
Domain Configuration
====================

Current domain: localhost:8443

Domain options:
  1. localhost:8443 (Development - self-signed certificate)
  2. Custom domain (Production - automatic Let's Encrypt certificate)
  3. Cancel (keep current configuration)

Choose option [1-3]: 2

Enter your domain (e.g., monitoring.yourdomain.com): monitoring.example.com
Enter your email for Let's Encrypt notifications: admin@example.com

New domain: monitoring.example.com
New email: admin@example.com

IMPORTANT: Make sure your DNS A record points to this server's IP address!
Domain: monitoring.example.com → 192.168.1.100

Press Enter to continue, or Ctrl+C to cancel...

✓ Generating new Caddyfile...
✓ Validating new configuration...
✓ Configuration is valid!
✓ Backing up current configuration...
✓ Installing new configuration...
✓ Reloading Caddy with new configuration...
✓ Configuration updated successfully!

Access your application at: https://monitoring.example.com
Caddy will automatically obtain a Let's Encrypt certificate.
This may take a few moments on first access.
```

## 📋 Common Commands

```bash
# Service management
./caddy-manager.sh start        # Start Caddy
./caddy-manager.sh stop         # Stop Caddy
./caddy-manager.sh restart      # Restart Caddy
./caddy-manager.sh status       # Check status

# Configuration
./caddy-manager.sh domain       # Change domain (interactive)
./caddy-manager.sh reload       # Reload config (zero downtime)
./caddy-manager.sh validate     # Validate Caddyfile
./caddy-manager.sh info         # Show current setup

# Monitoring
./caddy-manager.sh logs         # Show recent logs
./caddy-manager.sh follow       # Follow logs in real-time

# Advanced (not recommended)
./caddy-manager.sh edit         # Manually edit Caddyfile
```

## 🌐 Production Deployment Workflow

### Step 1: Setup DNS
Point your domain's A record to your server:

```
Type: A
Name: monitoring (or @ for root domain)
Value: 192.168.1.100 (your server IP)
TTL: 300 (or default)
```

### Step 2: Install Caddy
```bash
./caddy-install.sh
# Choose option 2 during installation
# Enter your domain and email
```

**OR** install first, configure later:
```bash
./caddy-install.sh
# Choose option 1 or 3

# Later, when DNS is ready:
./caddy-manager.sh domain
# Choose option 2
```

### Step 3: Start Services
```bash
# Backend API
cd EMS/API
dotnet run &

# Frontend UI
cd ui
npm run dev &
```

### Step 4: Access Your Application
Open browser: `https://monitoring.yourdomain.com`

Caddy will automatically:
- ✅ Obtain Let's Encrypt certificate
- ✅ Redirect HTTP to HTTPS
- ✅ Proxy requests to backend/frontend
- ✅ Enable WebSocket for SignalR

## 🔄 Switching Environments

### Development → Production

```bash
./caddy-manager.sh domain
# Choose option 2
# Enter production domain
```

### Production → Development

```bash
./caddy-manager.sh domain
# Choose option 1
# Back to localhost:8443
```

## 🛡️ Security Features

All configurations include:
- ✅ **Automatic HTTPS** - Let's Encrypt or self-signed
- ✅ **HSTS** - Force HTTPS for 1 year
- ✅ **XSS Protection** - Content Security Policy
- ✅ **Clickjacking Protection** - X-Frame-Options
- ✅ **MIME Sniffing Protection** - X-Content-Type-Options
- ✅ **Real Client IPs** - X-Real-IP, X-Forwarded-For headers

## 📊 Monitoring

### Check Service Status
```bash
./caddy-manager.sh status
```

### View Logs
```bash
# Recent logs
./caddy-manager.sh logs

# Follow logs in real-time
./caddy-manager.sh follow

# Filter for errors
./caddy-manager.sh logs | grep ERROR

# Access logs (JSON format)
tail -f /var/log/caddy/access.log | jq .
```

### Health Checks
```bash
# Check frontend
curl -k https://localhost:8443/

# Check API
curl -k https://localhost:8443/api/health

# Check certificate (production)
curl -vI https://monitoring.yourdomain.com 2>&1 | grep -i "certificate"
```

## 🔧 Troubleshooting

### Certificate Issues

**Problem**: Certificate not obtained for production domain

**Solution**:
```bash
# 1. Verify DNS points to server
nslookup monitoring.yourdomain.com

# 2. Check Caddy logs
./caddy-manager.sh logs | grep -i certificate

# 3. Verify port 80/443 are not blocked
sudo netstat -tlnp | grep -E ':(80|443)'

# 4. Force certificate renewal
sudo caddy renew --config /etc/caddy/Caddyfile
```

### Backend/Frontend Not Accessible

**Problem**: 502 Bad Gateway

**Solution**:
```bash
# 1. Check if backend services are running
curl http://localhost:5030/api/health
curl http://localhost:5173/

# 2. Check Caddy is running
./caddy-manager.sh status

# 3. Check Caddy logs for proxy errors
./caddy-manager.sh logs | grep -i proxy
```

### Port Conflicts

**Problem**: Port 8443 already in use

**Solution**:
```bash
# Option 1: Change port in domain configuration
./caddy-manager.sh domain
# Enter: localhost:9443 (or any free port)

# Option 2: Find what's using the port
sudo netstat -tlnp | grep :8443
sudo lsof -i :8443
```

### Configuration Rollback

**Problem**: New configuration broke something

**Solution**:
```bash
# Configurations are automatically backed up
# Find backup
ls -lah /etc/caddy/Caddyfile.backup.*

# Restore backup
sudo cp /etc/caddy/Caddyfile.backup.20251030_143000 /etc/caddy/Caddyfile

# Reload
./caddy-manager.sh reload
```

## 💡 Tips & Best Practices

### 1. Always Use Domain Command
❌ Don't manually edit Caddyfile
✅ Use `./caddy-manager.sh domain` instead

### 2. Test Configuration Before Reload
```bash
./caddy-manager.sh validate
```

### 3. Monitor Certificate Expiration
```bash
# Certificates auto-renew, but check logs
./caddy-manager.sh logs | grep -i renew
```

### 4. Keep Backups
Configuration backups are automatic with timestamps:
```bash
ls -lh /etc/caddy/Caddyfile.backup.*
```

### 5. Use Reload, Not Restart
```bash
# Zero downtime
./caddy-manager.sh reload

# Causes brief downtime
./caddy-manager.sh restart
```

## 📚 Additional Resources

- **Full Documentation**: `README-CADDY.md`
- **Caddy Official Docs**: https://caddyserver.com/docs/
- **Let's Encrypt**: https://letsencrypt.org/

## 🆘 Getting Help

```bash
# Show all available commands
./caddy-manager.sh help

# Show service information
./caddy-manager.sh info

# Check logs for errors
./caddy-manager.sh logs | grep -iE "error|fail|warn"
```

---

**Remember**: 
- 🔒 Always use HTTPS in production
- 🌐 Configure DNS before setting production domain
- 📧 Provide email for Let's Encrypt notifications
- 🔄 Use `./caddy-manager.sh domain` for configuration changes
- 📊 Monitor logs regularly with `./caddy-manager.sh follow`
