# HTTPS Deployment Guide

## Overview

The `manager.sh` script now supports HTTPS deployments via reverse proxy (nginx/apache) while maintaining full HTTP support. The HTTPS configuration is **separate** from the default HTTP deployment.

## How It Works

### HTTP Deployment (Default - Options 1-26)
- Uses `generate-env.sh` to auto-detect server IP
- Creates `.env.production` with `http://SERVER_IP:5030`
- Direct HTTP access without reverse proxy
- **No changes to existing HTTP workflow**

### HTTPS Deployment (New - Options 27-29)
- Stores HTTPS URLs in `.https-config` file
- Creates `.env.production` with HTTPS API URL
- Assumes nginx/apache reverse proxy is pre-configured
- Frontend served by reverse proxy at HTTPS URL
- API accessed via HTTPS reverse proxy URL

## New Menu Options

### Option 27: Deploy with HTTPS
**Full HTTPS deployment workflow**
- Checks if HTTPS is configured (`.https-config` exists)
- If not configured, prompts for HTTPS URLs
- If configured, offers to use existing or reconfigure
- Generates `.env.production` with HTTPS API URL
- Builds and deploys application
- Shows access URLs and reminds about reverse proxy

**Example Usage:**
```bash
./manager.sh
# Select option 27
# Enter URLs when prompted:
#   UI URL:  https://monitoring.example.com
#   API URL: https://api.example.com
```

### Option 28: Configure HTTPS URLs
**Configure or reconfigure HTTPS URLs without deploying**
- Prompts for UI HTTPS URL (informational)
- Prompts for API HTTPS URL (used in VITE_API_BASE_URL)
- Validates URL format (must start with http:// or https://)
- Saves configuration to `.https-config`
- Does NOT build or deploy

**Example Usage:**
```bash
./manager.sh
# Select option 28
# Enter URLs:
#   UI URL:  https://monitoring.example.com
#   API URL: https://api.example.com:5030
```

### Option 29: Show HTTPS Configuration
**Display current HTTPS configuration**
- Shows configured HTTPS URLs from `.https-config`
- Shows current API URL in `.env.production`
- Indicates if app is configured for HTTPS or HTTP
- Provides instructions if not configured

**Example Usage:**
```bash
./manager.sh
# Select option 29
# Output shows:
#   Current HTTPS Configuration:
#     UI URL:  https://monitoring.example.com
#     API URL: https://api.example.com
#   Current .env.production API URL:
#     https://api.example.com
```

## Configuration File

### `.https-config`
Located in project root, stores HTTPS URLs:
```bash
# HTTPS Configuration for Reverse Proxy
# Generated on Thu Oct 30 12:00:00 UTC 2025

UI_HTTPS_URL=https://monitoring.example.com
API_HTTPS_URL=https://api.example.com
```

## Typical Workflows

### First-Time HTTPS Setup
1. Configure your reverse proxy (nginx/apache) - **outside this script**
2. Run `./manager.sh` → Option 27 (Deploy with HTTPS)
3. Enter UI and API HTTPS URLs when prompted
4. Script builds and deploys with HTTPS configuration
5. Access app via reverse proxy URL

### Reconfigure HTTPS URLs
1. Run `./manager.sh` → Option 28 (Configure HTTPS URLs)
2. Enter new URLs
3. Run `./manager.sh` → Option 27 (Deploy with HTTPS) to apply

### Check Current Configuration
1. Run `./manager.sh` → Option 29 (Show HTTPS configuration)
2. Review displayed URLs and deployment status

### Switch Between HTTP and HTTPS
- **Deploy with HTTP**: Use option 1 (runs `generate-env.sh`)
- **Deploy with HTTPS**: Use option 27 (uses `.https-config`)
- Each deployment overwrites `.env.production` with appropriate URL

## URL Format Requirements

### UI HTTPS URL
- Must start with `https://` or `http://`
- Used for informational purposes
- Examples:
  - `https://monitoring.example.com`
  - `https://example.com:8443`
  - `https://app.company.com/monitoring`

### API HTTPS URL
- Must start with `https://` or `http://`
- **Critical**: This goes into `VITE_API_BASE_URL` in `.env.production`
- Must match your reverse proxy backend configuration
- Examples:
  - `https://api.example.com` (if proxy forwards to port 5030)
  - `https://api.example.com:5030` (if exposing port directly)
  - `https://example.com/api` (if using path-based routing)

## Reverse Proxy Assumptions

The script assumes your reverse proxy (nginx/apache) is:
1. **Already installed and configured**
2. **Listening on HTTPS port** (usually 443)
3. **Serving frontend static files** from `dist/` directory
4. **Proxying API requests** to backend (localhost:5030)
5. **Handling SSL certificates** (Let's Encrypt, custom certs, etc.)

**The script does NOT:**
- Install nginx/apache
- Configure reverse proxy
- Manage SSL certificates
- Modify proxy configuration files

## Example Nginx Configuration

```nginx
# Frontend (serves built React app)
server {
    listen 443 ssl http2;
    server_name monitoring.example.com;

    ssl_certificate /etc/letsencrypt/live/monitoring.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitoring.example.com/privkey.pem;

    root /path/to/Monitoring2025/ui/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Backend API (proxy to .NET Core)
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Troubleshooting

### "HTTPS configuration not found"
- Run option 28 to configure HTTPS URLs first
- Verify `.https-config` file exists in project root

### "Invalid URL format"
- Ensure URLs start with `https://` or `http://`
- Check for typos in URL

### "Deployment failed"
- Check `npm run build` errors in logs
- Verify `.env.production` was created
- Check backend is accessible at API URL

### "Frontend not accessible via HTTPS"
- Verify reverse proxy is running
- Check nginx/apache configuration
- Verify SSL certificates are valid
- Check firewall rules for port 443

### "API calls fail with CORS errors"
- Verify backend CORS configuration allows your UI HTTPS URL
- Check `VITE_API_BASE_URL` in `.env.production` matches proxy URL
- Verify reverse proxy forwards requests correctly

## Security Notes

1. **SSL Certificates**: Managed by your reverse proxy (nginx/apache), not this script
2. **CORS**: Backend must allow requests from your UI HTTPS URL
3. **Firewall**: Ensure port 443 is open for HTTPS traffic
4. **HTTP to HTTPS Redirect**: Configure in reverse proxy, not in this script
5. **Authentication**: JWT tokens work over HTTPS (more secure than HTTP)

## Quick Reference

| Option | Purpose | When to Use |
|--------|---------|-------------|
| 1      | Deploy (HTTP) | Default HTTP deployment |
| 27     | Deploy (HTTPS) | Full HTTPS deployment via reverse proxy |
| 28     | Configure HTTPS | Set/update HTTPS URLs |
| 29     | Show HTTPS Config | View current HTTPS configuration |

## Notes

- HTTP and HTTPS deployments use the same build process
- Only `.env.production` changes between deployments
- `.https-config` persists across deployments
- Switching between HTTP/HTTPS requires rebuilding (options 1 or 27)
- PM2 process name remains `ems3-ui` for both HTTP and HTTPS
