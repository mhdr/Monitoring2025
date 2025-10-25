# 📦 EMS API - Ubuntu Deployment Package

This package contains everything you need to deploy the EMS API on Ubuntu with systemd.

## 📋 Package Contents

### Deployment Scripts
- **`deploy-ubuntu.sh`** - Automated deployment script (main installer)
- **`manage-service.sh`** - Service management helper script
- **`ems3_api.service`** - Systemd service configuration file

### Documentation
- **`QUICK_START_DEPLOY.md`** - Quick start guide for beginners
- **`SYSTEMD_DEPLOYMENT.md`** - Comprehensive deployment documentation
- **`README_DEPLOYMENT.md`** - This file

### Application Files
- **`publish/`** - Published application files (created via `dotnet publish`)

---

## 🚀 Quick Start (3 Steps)

### 1. Build the Application
```bash
dotnet publish -c Release -o ./publish
```

### 2. Make Scripts Executable
```bash
chmod +x deploy-ubuntu.sh
chmod +x manage-service.sh
```

### 3. Run Deployment
```bash
sudo ./deploy-ubuntu.sh --db-password "YOUR_DATABASE_PASSWORD"
```

**That's it!** 🎉 Your API is now running as a systemd service.

---

## 📖 Documentation Guide

Choose the right guide for your needs:

| Guide | Best For | Time Required |
|-------|----------|---------------|
| **QUICK_START_DEPLOY.md** | First-time deployers, getting started quickly | 10-15 min |
| **SYSTEMD_DEPLOYMENT.md** | Detailed reference, troubleshooting, advanced config | 30-60 min |
| **README_DEPLOYMENT.md** | Overview and quick reference | 5 min |

---

## 🛠️ Usage Examples

### Initial Deployment

**Basic deployment (recommended):**
```bash
sudo ./deploy-ubuntu.sh --db-password "SecurePass123"
```

**Custom database server:**
```bash
sudo ./deploy-ubuntu.sh \
  --db-password "SecurePass123" \
  --db-host "192.168.1.50" \
  --db-name "prod_monitoring"
```

**Custom port:**
```bash
sudo ./deploy-ubuntu.sh \
  --db-password "SecurePass123" \
  --port 8080
```

### Service Management

Once deployed, use the helper script for common tasks:

```bash
# Check service status
./manage-service.sh status

# View logs
./manage-service.sh logs

# Restart service
./manage-service.sh restart

# Show service info
./manage-service.sh info

# Test API endpoint
./manage-service.sh test

# See all commands
./manage-service.sh help
```

### Updating Application

```bash
# 1. Build new version
dotnet publish -c Release -o ./publish

# 2. Run deployment again (auto-backs up current version)
sudo ./deploy-ubuntu.sh --db-password "YOUR_PASSWORD"
```

---

## 📁 Default Installation Paths

| Item | Path | Description |
|------|------|-------------|
| Application | `/opt/ems3/api/` | Installed application files |
| Service File | `/etc/systemd/system/ems3_api.service` | Systemd service configuration |
| Service User | `ems3api` | Dedicated system user (non-login) |
| HTTP Port | `5030` | Default API port |
| Logs | `journalctl -u ems3_api.service` | System logs via journald |
| Backups | `/opt/ems3/api.backup.YYYYMMDD_HHMMSS/` | Automatic backups |

---

## ⚙️ Configuration Options

### Deployment Script Options

```bash
sudo ./deploy-ubuntu.sh [OPTIONS]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--db-password <pass>` | Database password (required) | - |
| `--db-host <host>` | Database hostname/IP | localhost |
| `--db-name <name>` | Database name | monitoring_users |
| `--db-user <user>` | Database username | monitoring |
| `--port <port>` | HTTP port | 5030 |
| `--user <username>` | Service user | ems3api |
| `--install-dir <path>` | Installation directory | /opt/ems3/api |
| `--skip-dotnet-check` | Skip .NET verification | false |
| `--skip-backup` | Skip backup | false |
| `--help` | Show help | - |

### Service Management Commands

```bash
./manage-service.sh <command>
```

| Command | Description |
|---------|-------------|
| `start` | Start the service |
| `stop` | Stop the service |
| `restart` | Restart the service |
| `status` | Show detailed status |
| `enable` | Enable auto-start on boot |
| `disable` | Disable auto-start |
| `logs [lines]` | Show logs (follow mode) |
| `logs-errors` | Show error logs only |
| `test` | Test API endpoint |
| `info` | Show service information |
| `config` | Show configuration |
| `config-edit` | Edit configuration |
| `backup` | Backup installation |

---

## ✅ What Gets Installed

The deployment script automatically:

1. ✅ Validates prerequisites (.NET 9.0, PostgreSQL, systemd)
2. ✅ Creates dedicated service user (`ems3api`)
3. ✅ Backs up existing installation (keeps last 5)
4. ✅ Deploys application to `/opt/ems3/api/`
5. ✅ Creates production configuration
6. ✅ Installs systemd service file
7. ✅ Enables service to start on boot
8. ✅ Starts the service
9. ✅ Verifies deployment
10. ✅ Configures firewall (if UFW active)

---

## 🔍 Verification Checklist

After deployment, verify everything is working:

- [ ] Service is running: `./manage-service.sh status`
- [ ] Logs show no errors: `./manage-service.sh logs`
- [ ] API responds: `./manage-service.sh test`
- [ ] Swagger UI accessible: `http://YOUR_SERVER:5030/swagger`
- [ ] Auto-start enabled: `systemctl is-enabled ems3_api.service`

---

## 🐛 Troubleshooting Quick Reference

### Service won't start
```bash
# Check logs
./manage-service.sh logs-errors

# Or detailed journalctl
sudo journalctl -u ems3_api.service -n 100 --no-pager
```

### Database connection failed
```bash
# Test PostgreSQL
psql -h localhost -U monitoring -d monitoring_users

# Check connection string
./manage-service.sh config | grep ConnectionStrings
```

### Port already in use
```bash
# Check what's using the port
sudo lsof -i :5030

# Deploy with different port
sudo ./deploy-ubuntu.sh --db-password "PASS" --port 8080
```

### Permission errors
```bash
# Fix ownership
sudo chown -R ems3api:ems3api /opt/ems3/api

# Redeploy if needed
sudo ./deploy-ubuntu.sh --db-password "YOUR_PASSWORD"
```

---

## 🔒 Security Best Practices

Before going to production:

1. **Use non-root user** (default: ✅ ems3api)
2. **Strong database password** (never use default passwords)
3. **Enable firewall** (`sudo ufw enable`)
4. **Use HTTPS** (set up Nginx/Apache reverse proxy)
5. **Keep updated** (regular security updates)
6. **Monitor logs** (check for suspicious activity)
7. **Restrict database access** (PostgreSQL host-based authentication)
8. **Use environment variables** (for sensitive config)

---

## 📊 Monitoring & Maintenance

### Check Service Health
```bash
# Service status
./manage-service.sh info

# Real-time logs
./manage-service.sh logs

# Test endpoint
./manage-service.sh test
```

### Resource Usage
```bash
# Check memory usage
systemctl status ems3_api.service | grep Memory

# Full system monitoring
htop
```

### Backup Strategy
```bash
# Manual backup
./manage-service.sh backup

# Automated backup before update
sudo ./deploy-ubuntu.sh --db-password "PASS"  # auto-backs up
```

---

## 🌐 Production Setup

For production environments, add:

### 1. Reverse Proxy (HTTPS)

**Install Nginx:**
```bash
sudo apt install nginx
sudo apt install certbot python3-certbot-nginx
```

**Configure SSL:**
```bash
sudo certbot --nginx -d api.yourdomain.com
```

See `SYSTEMD_DEPLOYMENT.md` for full Nginx/Apache configuration.

### 2. Firewall Configuration

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 'Nginx Full' # HTTP/HTTPS
sudo ufw enable
```

### 3. Automatic Updates

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 📞 Getting Help

1. **Check logs first:** `./manage-service.sh logs`
2. **Review documentation:** See `SYSTEMD_DEPLOYMENT.md`
3. **Test manually:** `cd /opt/ems3/api && sudo -u ems3api dotnet API.dll`
4. **Verify prerequisites:** `.NET 9.0 runtime, PostgreSQL running`

---

## 📝 Common Tasks Reference

| Task | Command |
|------|---------|
| Deploy first time | `sudo ./deploy-ubuntu.sh --db-password "PASS"` |
| Update application | Build + `sudo ./deploy-ubuntu.sh --db-password "PASS"` |
| Start service | `./manage-service.sh start` |
| Stop service | `./manage-service.sh stop` |
| View logs | `./manage-service.sh logs` |
| Check status | `./manage-service.sh status` |
| Test API | `./manage-service.sh test` |
| Backup manually | `./manage-service.sh backup` |
| Edit config | `./manage-service.sh config-edit` |
| Show info | `./manage-service.sh info` |

---

## 📋 Prerequisites Checklist

Before deployment, ensure:

- [ ] Ubuntu 20.04 or later
- [ ] Root or sudo access
- [ ] .NET 9.0 Runtime installed
- [ ] PostgreSQL server running
- [ ] Database created (`monitoring_users`)
- [ ] Database user created (`monitoring`)
- [ ] Application published (`dotnet publish -c Release -o ./publish`)
- [ ] Scripts are executable (`chmod +x *.sh`)

---

## 🎯 Next Steps After Deployment

1. ✅ **Verify deployment:** `./manage-service.sh test`
2. ✅ **Access Swagger UI:** `http://YOUR_SERVER:5030/swagger`
3. ✅ **Set up HTTPS:** Configure Nginx/Apache reverse proxy
4. ✅ **Configure monitoring:** Set up alerting and log monitoring
5. ✅ **Plan backups:** Schedule regular database backups
6. ✅ **Security hardening:** Follow security best practices
7. ✅ **Documentation:** Document your specific configuration

---

## 📂 File Structure After Deployment

```
/opt/ems3/api/                          # Application directory
├── API.dll                             # Main application
├── appsettings.json                    # Default settings
├── appsettings.Production.json         # Production settings
├── *.dll                               # Dependencies
└── ...

/etc/systemd/system/
└── ems3_api.service                    # Systemd service file

/opt/ems3/
├── api/                                # Current installation
├── api.backup.20251025_143022/         # Backup 1
├── api.backup.20251024_091534/         # Backup 2
└── ...                                 # (keeps last 5)
```

---

## 🔄 Update Workflow

```bash
# 1. Development: Make changes, test locally

# 2. Build new version
cd /path/to/Monitoring2025/EMS/API
dotnet publish -c Release -o ./publish

# 3. Transfer to server (if needed)
scp -r ./publish username@server:/tmp/ems-api-publish
scp deploy-ubuntu.sh username@server:/tmp/

# 4. Deploy on server
ssh username@server
cd /tmp
sudo ./deploy-ubuntu.sh --db-password "YOUR_PASSWORD"

# 5. Verify
./manage-service.sh test
./manage-service.sh logs

# Done! Old version backed up automatically.
```

---

## 📚 Additional Resources

- **API Documentation:** Access Swagger at `http://YOUR_SERVER:5030/swagger`
- **.NET Documentation:** https://docs.microsoft.com/dotnet/
- **Systemd Documentation:** `man systemd.service`
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/

---

**Version:** 1.0  
**Last Updated:** October 2025  
**Compatibility:** Ubuntu 20.04+, .NET 9.0

For detailed information, see:
- **Beginners:** `QUICK_START_DEPLOY.md`
- **Advanced:** `SYSTEMD_DEPLOYMENT.md`
