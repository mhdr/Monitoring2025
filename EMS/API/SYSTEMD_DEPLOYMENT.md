# EMS API - Systemd Deployment Guide

## Overview
This guide covers deploying the EMS API as a systemd service on Linux systems.

## Prerequisites
- Linux system with systemd (Ubuntu 20.04+, RHEL/CentOS 8+, Debian 11+)
- .NET 9.0 Runtime installed
- PostgreSQL server running
- Appropriate user permissions (root or sudo access)

## Quick Deploy (Automated)

For Ubuntu systems, use the automated deployment script:

```bash
# 1. Build and publish the application
cd /path/to/Monitoring2025/EMS/API
dotnet publish -c Release -o ./publish

# 2. Make the script executable
chmod +x deploy-ubuntu.sh

# 3. Run the deployment script
sudo ./deploy-ubuntu.sh --db-password YOUR_DB_PASSWORD

# Optional parameters:
# --user <username>          Service user (default: ems3api)
# --install-dir <path>       Installation directory (default: /opt/ems3/api)
# --db-host <host>          Database host (default: localhost)
# --db-name <name>          Database name (default: monitoring_users)
# --db-user <user>          Database username (default: monitoring)
# --port <port>             HTTP port (default: 5030)
# --skip-dotnet-check       Skip .NET runtime check
# --skip-backup             Skip backing up existing installation
```

**Example with custom configuration:**
```bash
sudo ./deploy-ubuntu.sh \
  --db-password "SecurePass123" \
  --db-host "192.168.1.100" \
  --port 8080 \
  --user ems3api
```

The script will:
- ✅ Check prerequisites (.NET runtime, systemd, PostgreSQL)
- ✅ Create service user
- ✅ Backup existing installation (if any)
- ✅ Deploy application files
- ✅ Create and configure systemd service
- ✅ Start the service
- ✅ Verify deployment
- ✅ Configure firewall (if UFW is active)

## Manual Installation Steps

### 1. Build and Publish the Application

On your development machine or build server:

```bash
cd /path/to/Monitoring2025/EMS/API
dotnet publish -c Release -o ./publish
```

### 2. Deploy Files to Linux Server

Copy the published files to the target server:

```bash
# Create deployment directory
sudo mkdir -p /opt/ems3/api

# Copy published files
sudo cp -r ./publish/* /opt/ems3/api/

# Set ownership (adjust user as needed)
sudo chown -R root:root /opt/ems3/api

# Set execute permissions
sudo chmod +x /opt/ems3/api/API.dll
```

### 3. Configure Database Connection

Edit the service file or use environment variables to configure the database connection:

**Option A: Edit service file (ems3_api.service)**
```ini
Environment=ConnectionStrings__DefaultConnection=Host\x3dlocalhost\x3bDatabase\x3dmonitoring_users\x3bUsername\x3dmonitoring\x3bPassword\x3dYOUR_PASSWORD
```

**Option B: Use appsettings.Production.json**
```bash
sudo nano /opt/ems3/api/appsettings.Production.json
```

Update the connection string:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=monitoring_users;Username=monitoring;Password=YOUR_PASSWORD"
  }
}
```

### 4. Install Systemd Service

```bash
# Copy service file
sudo cp ems3_api.service /etc/systemd/system/

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable ems3_api.service

# Start the service
sudo systemctl start ems3_api.service
```

### 5. Verify Installation

Check service status:
```bash
sudo systemctl status ems3_api.service
```

View logs:
```bash
# Real-time logs
sudo journalctl -u ems3_api.service -f

# Last 100 lines
sudo journalctl -u ems3_api.service -n 100

# Logs since boot
sudo journalctl -u ems3_api.service -b
```

Test API endpoint:
```bash
curl http://localhost:5030/swagger/index.html
```

## Service Management Commands

```bash
# Start service
sudo systemctl start ems3_api.service

# Stop service
sudo systemctl stop ems3_api.service

# Restart service
sudo systemctl restart ems3_api.service

# Check status
sudo systemctl status ems3_api.service

# Enable auto-start on boot
sudo systemctl enable ems3_api.service

# Disable auto-start
sudo systemctl disable ems3_api.service

# View logs
sudo journalctl -u ems3_api.service -f
```

## Configuration Notes

### Service Configuration (ems3_api.service)

- **Type=notify**: Uses systemd notification protocol for proper service lifecycle management
- **Restart=always**: Automatically restarts service if it crashes
- **RestartSec=10**: Waits 10 seconds before restarting
- **MemoryMax=4096M**: Limits memory usage to 4GB
- **KillSignal=SIGINT**: Uses SIGINT for graceful shutdown
- **SyslogIdentifier=ems3-api**: Identifies logs in syslog with "ems3-api" prefix

### Network Configuration

The service binds to **HTTP port 5030** on all interfaces (0.0.0.0):
- Internal access: `http://localhost:5030`
- Network access: `http://YOUR_SERVER_IP:5030`

**Security Note**: For production deployments, consider:
1. Using a reverse proxy (nginx/Apache) with HTTPS
2. Configuring firewall rules to restrict access
3. Running the service as a non-root user

### Running as Non-Root User (Recommended for Production)

Create a dedicated service user:
```bash
# Create service user
sudo useradd -r -s /bin/false ems3api

# Set ownership
sudo chown -R ems3api:ems3api /opt/ems3/api

# Update service file
sudo nano /etc/systemd/system/ems3_api.service
# Change: User=root to User=ems3api

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart ems3_api.service
```

## Troubleshooting

### Service won't start

1. Check service status and logs:
   ```bash
   sudo systemctl status ems3_api.service
   sudo journalctl -u ems3_api.service -n 50
   ```

2. Verify .NET runtime is installed:
   ```bash
   dotnet --version
   ```

3. Check file permissions:
   ```bash
   ls -la /opt/ems3/api
   ```

4. Test manual execution:
   ```bash
   cd /opt/ems3/api
   /usr/bin/dotnet API.dll --urls "http://0.0.0.0:5030"
   ```

### Database connection issues

1. Verify PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Test database connection:
   ```bash
   psql -h localhost -U monitoring -d monitoring_users
   ```

3. Check connection string in service file or appsettings.Production.json

### Port already in use

Check what's using port 5030:
```bash
sudo lsof -i :5030
sudo netstat -tulpn | grep 5030
```

Stop conflicting service or change port in service file.

### Memory issues

If service crashes due to memory:
1. Check memory usage:
   ```bash
   sudo systemctl status ems3_api.service
   ```

2. Adjust MemoryMax in service file:
   ```ini
   MemoryMax=8192M  # Increase to 8GB
   ```

3. Reload and restart:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart ems3_api.service
   ```

## Updating the Application

### Automated Update (Recommended)

Simply rebuild and run the deployment script again:

```bash
# 1. Build new version
cd /path/to/Monitoring2025/EMS/API
dotnet publish -c Release -o ./publish

# 2. Run deployment script (it will auto-backup and update)
sudo ./deploy-ubuntu.sh --db-password YOUR_DB_PASSWORD
```

The script automatically:
- Stops the service
- Backs up the current installation
- Deploys the new version
- Preserves existing configuration
- Starts the service

### Manual Update

```bash
# Stop service
sudo systemctl stop ems3_api.service

# Backup current version (optional)
sudo cp -r /opt/ems3/api /opt/ems3/api.backup.$(date +%Y%m%d)

# Deploy new version
sudo cp -r ./publish/* /opt/ems3/api/

# Restore configuration if needed
sudo cp /opt/ems3/api.backup.*/appsettings.Production.json /opt/ems3/api/

# Start service
sudo systemctl start ems3_api.service

# Verify
sudo systemctl status ems3_api.service
```

## Integration with Other Services

### Nginx Reverse Proxy (HTTPS)

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/ssl/certs/your-cert.crt;
    ssl_certificate_key /etc/ssl/private/your-key.key;

    location / {
        proxy_pass http://localhost:5030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Apache Reverse Proxy (HTTPS)

```apache
<VirtualHost *:443>
    ServerName api.yourdomain.com
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/your-cert.crt
    SSLCertificateKeyFile /etc/ssl/private/your-key.key
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:5030/
    ProxyPassReverse / http://localhost:5030/
    
    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:5030/$1" [P,L]
</VirtualHost>
```

## Performance Tuning

### Kestrel Configuration

Edit `appsettings.Production.json`:
```json
{
  "Kestrel": {
    "Limits": {
      "MaxConcurrentConnections": 100,
      "MaxConcurrentUpgradedConnections": 100,
      "MaxRequestBodySize": 10485760,
      "KeepAliveTimeout": "00:02:00"
    }
  }
}
```

### Systemd Resource Limits

Edit service file to add limits:
```ini
[Service]
# CPU limit (50% of one core)
CPUQuota=50%

# Memory limits
MemoryMax=4096M
MemoryHigh=3072M

# File descriptor limit
LimitNOFILE=65536

# Process limit
LimitNPROC=512
```

## Support

For issues or questions, refer to:
- Application logs: `sudo journalctl -u ems3_api.service`
- API documentation: `http://YOUR_SERVER:5030/swagger`
- Project repository: Monitoring2025/EMS/API
