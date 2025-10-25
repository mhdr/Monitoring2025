# 🚀 Quick Start - Automated Ubuntu Deployment

This guide helps you quickly deploy the EMS API on Ubuntu using the automated deployment script.

## Prerequisites

Before running the deployment script, ensure you have:

1. **Ubuntu Server** (20.04 or later)
2. **.NET 9.0 Runtime** installed
3. **PostgreSQL** database server running
4. **Root or sudo access**
5. **Database credentials** ready

## Install .NET 9.0 Runtime (if not installed)

```bash
# Download and run the .NET installer
wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
chmod +x dotnet-install.sh
sudo ./dotnet-install.sh --channel 9.0 --runtime aspnetcore --install-dir /usr/share/dotnet
sudo ln -sf /usr/share/dotnet/dotnet /usr/bin/dotnet

# Verify installation
dotnet --version
dotnet --list-runtimes
```

## Quick Deploy Steps

### 1. Build the Application

On your development machine (Windows/Linux/Mac):

```bash
cd /path/to/Monitoring2025/EMS/API
dotnet publish -c Release -o ./publish
```

### 2. Transfer Files to Ubuntu Server

**Option A: Using SCP (from Windows/Linux/Mac)**
```bash
scp -r ./publish username@server-ip:/tmp/ems-api-publish
scp deploy-ubuntu.sh username@server-ip:/tmp/
scp ems3_api.service username@server-ip:/tmp/
```

**Option B: Using Git (if server has access)**
```bash
# On server
git clone https://github.com/your-repo/Monitoring2025.git
cd Monitoring2025/EMS/API
dotnet publish -c Release -o ./publish
```

**Option C: Using SFTP/FTP client** (WinSCP, FileZilla, etc.)
- Upload `publish/` folder
- Upload `deploy-ubuntu.sh`
- Upload `ems3_api.service`

### 3. Connect to Ubuntu Server

```bash
ssh username@server-ip
```

### 4. Run Deployment Script

Navigate to where you uploaded the files:

```bash
cd /tmp  # or wherever you uploaded the files

# Make script executable
chmod +x deploy-ubuntu.sh

# Run with database password
sudo ./deploy-ubuntu.sh --db-password "YOUR_DATABASE_PASSWORD"
```

**That's it!** The script will handle everything automatically. ✅

## Deployment Script Options

```bash
sudo ./deploy-ubuntu.sh [options]
```

### Common Options:

| Option | Description | Default |
|--------|-------------|---------|
| `--db-password <pass>` | Database password (required) | None |
| `--db-host <host>` | Database server hostname/IP | localhost |
| `--db-name <name>` | Database name | monitoring_users |
| `--db-user <user>` | Database username | monitoring |
| `--port <port>` | HTTP port for API | 5030 |
| `--user <username>` | System user to run service | ems3api |
| `--install-dir <path>` | Installation directory | /opt/ems3/api |
| `--skip-dotnet-check` | Skip .NET runtime verification | false |
| `--skip-backup` | Skip backup of existing install | false |
| `--help` | Show help message | - |

### Example Configurations:

**Basic deployment (default settings):**
```bash
sudo ./deploy-ubuntu.sh --db-password "SecurePass123"
```

**Custom database server:**
```bash
sudo ./deploy-ubuntu.sh \
  --db-password "SecurePass123" \
  --db-host "192.168.1.50" \
  --db-name "production_monitoring"
```

**Custom port and user:**
```bash
sudo ./deploy-ubuntu.sh \
  --db-password "SecurePass123" \
  --port 8080 \
  --user apiuser
```

**Custom installation directory:**
```bash
sudo ./deploy-ubuntu.sh \
  --db-password "SecurePass123" \
  --install-dir "/var/www/ems-api"
```

## What the Script Does

The deployment script automatically:

1. ✅ **Validates prerequisites**
   - Checks for Ubuntu OS
   - Verifies systemd is available
   - Confirms .NET 9.0 runtime is installed
   - Checks for PostgreSQL client

2. ✅ **Creates service user**
   - Creates dedicated system user (non-login)
   - Sets appropriate permissions

3. ✅ **Backs up existing installation**
   - Backs up current installation (if exists)
   - Keeps last 5 backups automatically

4. ✅ **Deploys application**
   - Copies published files to installation directory
   - Creates production configuration file
   - Sets correct file permissions

5. ✅ **Configures systemd service**
   - Creates service file
   - Enables auto-start on boot
   - Configures memory limits and restart policies

6. ✅ **Starts and verifies service**
   - Starts the service
   - Checks service status
   - Tests HTTP endpoint

7. ✅ **Configures firewall**
   - Opens required port (if UFW is active)

## After Deployment

### Check Service Status

```bash
sudo systemctl status ems3_api.service
```

### View Logs

```bash
# Real-time logs
sudo journalctl -u ems3_api.service -f

# Last 50 lines
sudo journalctl -u ems3_api.service -n 50
```

### Test API

```bash
# Check Swagger UI
curl http://localhost:5030/swagger/index.html

# Or open in browser
http://YOUR_SERVER_IP:5030/swagger
```

### Service Management

```bash
# Start service
sudo systemctl start ems3_api.service

# Stop service
sudo systemctl stop ems3_api.service

# Restart service
sudo systemctl restart ems3_api.service

# Disable auto-start
sudo systemctl disable ems3_api.service

# Enable auto-start
sudo systemctl enable ems3_api.service
```

## Updating the Application

To update to a new version:

```bash
# 1. Build new version (on dev machine)
dotnet publish -c Release -o ./publish

# 2. Transfer files to server
scp -r ./publish username@server-ip:/tmp/ems-api-publish

# 3. Run deployment script again
cd /tmp
sudo ./deploy-ubuntu.sh --db-password "YOUR_PASSWORD"
```

The script will:
- Stop the service
- Backup current installation
- Deploy new version
- Preserve existing configuration
- Restart service

## Troubleshooting

### Service won't start

```bash
# Check detailed logs
sudo journalctl -u ems3_api.service -n 100 --no-pager

# Check service file
cat /etc/systemd/system/ems3_api.service

# Test manual execution
cd /opt/ems3/api
sudo -u ems3api /usr/bin/dotnet API.dll --urls "http://0.0.0.0:5030"
```

### Database connection issues

```bash
# Test PostgreSQL connection
psql -h localhost -U monitoring -d monitoring_users

# Check connection string in service file
grep ConnectionStrings /etc/systemd/system/ems3_api.service

# Check appsettings
cat /opt/ems3/api/appsettings.Production.json
```

### Port already in use

```bash
# Check what's using port 5030
sudo lsof -i :5030
sudo netstat -tulpn | grep 5030

# Change port in next deployment
sudo ./deploy-ubuntu.sh --db-password "PASS" --port 8080
```

### Permission issues

```bash
# Fix ownership
sudo chown -R ems3api:ems3api /opt/ems3/api

# Fix permissions
sudo chmod +x /opt/ems3/api/API.dll
```

### .NET runtime not found

```bash
# Install .NET 9.0 runtime
wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
chmod +x dotnet-install.sh
sudo ./dotnet-install.sh --channel 9.0 --runtime aspnetcore --install-dir /usr/share/dotnet
sudo ln -sf /usr/share/dotnet/dotnet /usr/bin/dotnet

# Verify
dotnet --version
```

## Production Considerations

### 1. Use Reverse Proxy (HTTPS)

For production, use Nginx or Apache as reverse proxy:

```bash
# Install Nginx
sudo apt update
sudo apt install nginx

# Configure (see SYSTEMD_DEPLOYMENT.md for full config)
sudo nano /etc/nginx/sites-available/ems-api

# Enable SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### 2. Configure Firewall

```bash
# If UFW is not enabled
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 5030/tcp  # API (or just allow Nginx)
sudo ufw enable

# If using reverse proxy, only allow Nginx
sudo ufw allow 'Nginx Full'
```

### 3. Run as Non-Root User

The script creates a dedicated `ems3api` user by default. Never use `--user root` in production.

### 4. Monitor Resources

```bash
# Check memory usage
sudo systemctl status ems3_api.service

# Monitor in real-time
htop
```

### 5. Set Up Log Rotation

```bash
sudo nano /etc/systemd/journald.conf

# Add these lines:
SystemMaxUse=1G
SystemMaxFileSize=100M
```

## Security Checklist

- [ ] Run service as non-root user (default: ems3api)
- [ ] Use strong database password
- [ ] Configure firewall (UFW/iptables)
- [ ] Use HTTPS with reverse proxy (Nginx/Apache)
- [ ] Keep .NET runtime updated
- [ ] Regularly update application
- [ ] Monitor logs for suspicious activity
- [ ] Restrict PostgreSQL access
- [ ] Use environment variables for secrets (not in service file)
- [ ] Enable automatic security updates

```bash
# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## Getting Help

If you encounter issues:

1. Check service logs: `sudo journalctl -u ems3_api.service -f`
2. Review deployment script output
3. Verify prerequisites are met
4. Check full documentation: `SYSTEMD_DEPLOYMENT.md`
5. Test database connectivity
6. Verify .NET runtime version

## Next Steps

After successful deployment:

1. ✅ Access Swagger UI: `http://your-server:5030/swagger`
2. ✅ Configure reverse proxy for HTTPS
3. ✅ Set up monitoring and alerting
4. ✅ Configure automated backups
5. ✅ Document your specific configuration
6. ✅ Test failover and recovery procedures

---

**Need more details?** See `SYSTEMD_DEPLOYMENT.md` for comprehensive documentation.

**Script source:** `deploy-ubuntu.sh` (fully commented and customizable)
