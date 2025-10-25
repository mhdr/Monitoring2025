# Production Deployment Guide# Production Deployment Guide



## Overview## Overview

This guide covers deploying the Monitoring2025 UI application to production using **Express.js + PM2**.

This guide covers deploying the Monitoring2025 UI application to production using **Express.js + PM2**.

## Architecture

## Architecture

- **Web Server**: Express.js (Node.js)

- **Web Server**: Express.js (Node.js)- **Process Manager**: PM2

- **Process Manager**: PM2- **Build Tool**: Vite

- **Build Tool**: Vite- **Port**: 3000 (configurable)

- **Port**: 3000 (configurable via PORT environment variable)- **Deployment**: Automated with scripts

- **Deployment**: Automated with scripts

## Prerequisites

## Prerequisites

1. **Node.js 18+** installed on the server

1. **Node.js 18+** installed on the server2. **PM2** installed globally (`npm install -g pm2`)

2. **PM2** installed globally: `npm install -g pm2`3. Git access to clone the repository

3. Git access to clone the repository

## Environment Configuration

## Quick Start

### Required Environment Variable

### Automated Deployment (Recommended)

**`VITE_API_BASE_URL`** - Backend API base URL

```bash

cd ui- **Development**: `http://localhost:5030` (automatically set in `.env.development`)

chmod +x install.sh- **Production**: Must be set in `.env.production` before building

./install.sh

```### Setting Up Production Environment



The installation script will:1. **Copy the example file:**

   ```bash

1. Check Node.js and PM2 installation   cp .env.example .env.production

2. Install dependencies if needed   ```

3. Build the React application

4. Start the app with PM22. **Edit `.env.production`** and set your production API URL:

5. Configure PM2 to start on boot   ```bash

6. Display access URLs and helpful commands   VITE_API_BASE_URL=http://api.yourdomain.com

   ```

### Manual Deployment

   Or set it directly in your CI/CD pipeline:

```bash   ```bash

cd ui   export VITE_API_BASE_URL=http://api.yourdomain.com

   npm run build

# Install dependencies   ```

npm install

## Quick Deployment

# Build the application

npm run build### Automated Deployment (Recommended)



# Start with PM2Use the provided installation script:

npm run start:pm2

```bash

# Or start directly (no PM2)cd ui

npm startchmod +x install.sh

```./install.sh

```

## Management Script

This script will:

Use `manager.sh` for common operations:1. Check Node.js and PM2 installation

2. Install dependencies if needed

```bash3. Build the React application

cd ui4. Start the app with PM2

chmod +x manager.sh5. Configure PM2 to start on boot

./manager.sh

```### Manual Deployment



### Available Operations```bash

cd ui

1. **Deploy** - Build and restart with PM2

2. **Restart PM2 app** - Restart the running application# Install dependencies

3. **Stop PM2 app** - Stop the applicationnpm install

4. **Start PM2 app** - Start the application

5. **PM2 status** - View application status# Build the application

6. **View error log** - Last 50 linesnpm run build

7. **View output log** - Last 50 lines

8. **Follow error log** - Live tail (Ctrl+C to stop)# Start with PM2

9. **Follow output log** - Live tailnpm run start:pm2

10. **Clean build cache** - Remove dist/ and Vite cache

11. **Full deploy** - Clean + install + build + start# Or start directly

12. **List built files** - Show dist/ contentsnpm start

13. **PM2 monitor** - Interactive monitoring dashboard```

14. **Delete PM2 app** - Remove from PM2

15. **Check deployment status** - Comprehensive status check### Option 1: Static Hosting (Recommended)

Deploy the `dist/` folder to any static hosting service:

### Quick Commands

- **Nginx**

```bash- **Apache**

# Deploy with option number- **IIS**

./manager.sh 1- **Caddy**

- **CDN services** (Cloudflare, AWS CloudFront, etc.)

# Check status

./manager.sh 15### Option 2: Docker Container



# View logs**Dockerfile example:**

./manager.sh 8  # Error logs```dockerfile

./manager.sh 9  # Output logsFROM nginx:alpine

```

# Copy built static files

## PM2 Process ManagementCOPY dist/ /usr/share/nginx/html



### Direct PM2 Commands# Copy nginx configuration

COPY nginx.conf /etc/nginx/nginx.conf

```bash

# StatusEXPOSE 80

pm2 statusCMD ["nginx", "-g", "daemon off;"]

pm2 info ems3-ui```



# Logs**Build and run:**

pm2 logs ems3-ui```bash

pm2 logs ems3-ui --lines 100# Build the app first

pm2 logs ems3-ui --err  # Error logs onlyVITE_API_BASE_URL=http://api.yourdomain.com npm run build

pm2 logs ems3-ui --out  # Output logs only

# Build Docker image

# Controldocker build -t monitoring-ui .

pm2 restart ems3-ui

pm2 stop ems3-ui# Run container

pm2 start ems3-uidocker run -p 80:80 monitoring-ui

pm2 delete ems3-ui```



# Monitoring## Server Configuration

pm2 monit  # Interactive dashboard

### Nginx Configuration Example

# Save configuration

pm2 save```nginx

server {

# Startup script (run on boot)    listen 80;

pm2 startup systemd    server_name monitoring.yourdomain.com;

```    

    # Root directory

### NPM Scripts    root /var/www/monitoring-ui;

    index index.html;

```bash    

npm start           # Direct run (no PM2)    # Enable gzip compression

npm run start:pm2   # Start with PM2    gzip on;

npm run stop:pm2    # Stop PM2 app    gzip_vary on;

npm run restart:pm2 # Restart PM2 app    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

npm run logs:pm2    # View logs    

npm run delete:pm2  # Delete from PM2    # Cache static assets

```    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {

        expires 1y;

## Environment Configuration        add_header Cache-Control "public, immutable";

    }

### Required Environment Variable    

    # SPA routing - serve index.html for all routes

**`VITE_API_BASE_URL`** - Backend API base URL    location / {

        try_files $uri $uri/ /index.html;

### Setting Up Production Environment    }

    

1. Create `.env.production`:    # Security headers

    add_header X-Frame-Options "SAMEORIGIN" always;

```bash    add_header X-Content-Type-Options "nosniff" always;

cp .env.example .env.production    add_header X-XSS-Protection "1; mode=block" always;

```    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

}

2. Edit `.env.production`:```



```bash### Apache Configuration Example

VITE_API_BASE_URL=http://api.yourdomain.com

```**.htaccess:**

```apache

3. Rebuild:<IfModule mod_rewrite.c>

  RewriteEngine On

```bash  RewriteBase /

npm run build  RewriteRule ^index\.html$ - [L]

pm2 restart ems3-ui  RewriteCond %{REQUEST_FILENAME} !-f

```  RewriteCond %{REQUEST_FILENAME} !-d

  RewriteRule . /index.html [L]

### Server Port Configuration</IfModule>



Set the PORT environment variable:# Enable gzip compression

<IfModule mod_deflate.c>

```bash  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json

# In ecosystem.config.js</IfModule>

env: {

  NODE_ENV: 'production',# Cache static assets

  PORT: 3000  # Change this<IfModule mod_expires.c>

}  ExpiresActive On

  ExpiresByType image/jpg "access plus 1 year"

# Or set directly  ExpiresByType image/jpeg "access plus 1 year"

PORT=8080 npm start  ExpiresByType image/gif "access plus 1 year"

```  ExpiresByType image/png "access plus 1 year"

  ExpiresByType image/svg+xml "access plus 1 year"

## Server Features  ExpiresByType text/css "access plus 1 year"

  ExpiresByType application/javascript "access plus 1 year"

### Compression  ExpiresByType application/font-woff "access plus 1 year"

  ExpiresByType application/font-woff2 "access plus 1 year"

- Gzip compression enabled (level 6)</IfModule>

- Automatic compression for responses > 1KB```

- Optimizes bandwidth and load times

## CI/CD Integration

### Caching Strategy

### GitHub Actions Example

| Resource | Cache Duration | Notes |

|----------|----------------|-------|**.github/workflows/deploy.yml:**

| `/assets/*` | 1 year | Hashed filenames, immutable |```yaml

| `/fonts/*` | 1 year | Font files |name: Deploy to Production

| `/icons/*` | 30 days | App icons |

| `sw.js` | No cache | Service Worker |on:

| `manifest.webmanifest` | No cache | PWA manifest |  push:

| `index.html` | No cache | SPA entry point |    branches:

      - main

### Security Headers

jobs:

- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking  build-and-deploy:

- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing    runs-on: ubuntu-latest

- `X-XSS-Protection: 1; mode=block` - XSS protection    

- `Referrer-Policy: strict-origin-when-cross-origin` - Referrer policy    steps:

      - name: Checkout code

### Health Check        uses: actions/checkout@v3

      

Access `/health` endpoint for monitoring:      - name: Setup Node.js

        uses: actions/setup-node@v3

```bash        with:

curl http://localhost:3000/health          node-version: '20'

```          cache: 'npm'

      

Response:      - name: Install dependencies

        run: npm ci

```json      

{      - name: Build production bundle

  "status": "healthy",        env:

  "timestamp": "2025-10-25T10:30:00.000Z",          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}

  "uptime": 3600.5        run: npm run build

}      

```      - name: Deploy to server

        uses: easingthemes/ssh-deploy@v2

## Reverse Proxy Setup (Optional)        with:

          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}

### Nginx Reverse Proxy          REMOTE_HOST: ${{ secrets.REMOTE_HOST }}

          REMOTE_USER: ${{ secrets.REMOTE_USER }}

If you want to run behind Nginx (for SSL, load balancing, etc.):          SOURCE: "dist/"

          TARGET: "/var/www/monitoring-ui"

```nginx```

server {

    listen 80;**Required secrets:**

    server_name yourdomain.com;- `VITE_API_BASE_URL` - Production API URL

    - `SSH_PRIVATE_KEY` - SSH key for deployment

    location / {- `REMOTE_HOST` - Server hostname

        proxy_pass http://localhost:3000;- `REMOTE_USER` - SSH username

        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;### GitLab CI Example

        proxy_set_header Connection 'upgrade';

        proxy_set_header Host $host;**.gitlab-ci.yml:**

        proxy_cache_bypass $http_upgrade;```yaml

        proxy_set_header X-Real-IP $remote_addr;stages:

        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  - build

        proxy_set_header X-Forwarded-Proto $scheme;  - deploy

    }

}variables:

```  VITE_API_BASE_URL: "http://api.yourdomain.com"



### Apache Reverse Proxybuild:

  stage: build

```apache  image: node:20-alpine

<VirtualHost *:80>  cache:

    ServerName yourdomain.com    paths:

          - node_modules/

    ProxyPreserveHost On  script:

    ProxyPass / http://localhost:3000/    - npm ci

    ProxyPassReverse / http://localhost:3000/    - npm run build

      artifacts:

    <Location />    paths:

        Require all granted      - dist/

    </Location>    expire_in: 1 hour

</VirtualHost>

```deploy:

  stage: deploy

## Monitoring and Logs  image: alpine:latest

  dependencies:

### Log Files    - build

  before_script:

Located in `ui/logs/`:    - apk add --no-cache rsync openssh

  script:

- `ems3-ui-error.log` - Error output    - mkdir -p ~/.ssh

- `ems3-ui-out.log` - Standard output    - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa

- `ems3-ui-combined.log` - Combined logs    - chmod 600 ~/.ssh/id_rsa

    - rsync -avz --delete dist/ $REMOTE_USER@$REMOTE_HOST:/var/www/monitoring-ui

### Log Rotation  only:

    - main

PM2 automatically handles log rotation. Configure in `ecosystem.config.js`:```



```javascript## Post-Deployment Checklist

apps: [{

  name: 'ems3-ui',- [ ] Verify `VITE_API_BASE_URL` is correctly set

  max_memory_restart: '500M',  // Restart if memory exceeds 500MB- [ ] Test API connectivity from production URL

  error_file: './logs/ems3-ui-error.log',- [ ] Test both Persian (RTL) and English (LTR) layouts

  out_file: './logs/ems3-ui-out.log',- [ ] Test responsive design on mobile, tablet, desktop

  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',- [ ] Verify Service Worker registration

  merge_logs: true- [ ] Check browser console for errors

}]- [ ] Test authentication flow (login, refresh token, logout)

```- [ ] Verify SignalR real-time connections work

- [ ] Test offline mode (if using Service Worker caching)

### Real-time Monitoring- [ ] Check CORS configuration on backend

- [ ] Monitor bundle size (should be under limits)

```bash- [ ] Verify all static assets are loading with proper cache headers

# PM2 dashboard

pm2 monit## Troubleshooting



# CPU and memory usage### Issue: API calls fail with CORS errors

pm2 status**Solution:** Ensure backend CORS configuration allows the production frontend domain.



# Detailed process info### Issue: Environment variable not applied

pm2 info ems3-ui**Solution:** 

```- Verify `.env.production` exists and contains `VITE_API_BASE_URL`

- Rebuild the app after changing environment variables

## Troubleshooting- Environment variables are **embedded at build time**, not runtime



### Issue: Port 3000 already in use### Issue: SignalR connection fails

**Solution:**

**Solution:**- Verify WebSocket support is enabled on server

- Check that `VITE_API_BASE_URL` includes the correct protocol (http://)

```bash- Ensure backend SignalR hub is accessible at `/hubs/monitoring`

# Check what's using port 3000

sudo lsof -i :3000### Issue: 404 errors on page refresh

**Solution:** Configure your web server to always serve `index.html` for all routes (SPA routing).

# Kill the process

sudo kill -9 <PID>### Issue: Service Worker not updating

**Solution:**

# Or change port in ecosystem.config.js- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

```- Service Worker updates are prompted to users

- Check Service Worker registration in DevTools

### Issue: PM2 not starting on boot

## Performance Optimization

**Solution:**

### Enable Compression

```bashEnsure your server enables gzip/brotli compression for:

# Generate startup script- JavaScript files (`.js`)

pm2 startup systemd- CSS files (`.css`)

- JSON responses

# Copy the command PM2 shows and run it

# Then save PM2 process list### Set Cache Headers

pm2 saveStatic assets should have long cache durations:

```- JS/CSS files with content hash: 1 year

- Fonts: 1 year

### Issue: Application not updating after rebuild- Images: 1 year

- HTML: No cache (always validate)

**Solution:**

### CDN Integration

```bashConsider using a CDN for faster global delivery:

# Restart PM2 app- Cloudflare

pm2 restart ems3-ui- AWS CloudFront

- Fastly

# Or use manager script- Azure CDN

./manager.sh 2

```### Monitoring

Set up monitoring for:

### Issue: High memory usage- Frontend error tracking (Sentry, Rollbar)

- Performance monitoring (Google Analytics, Web Vitals)

**Solution:**- Uptime monitoring

- API response times

PM2 automatically restarts when memory exceeds 500MB (configured in `ecosystem.config.js`).

## Security Considerations

To adjust:

- Set proper Content Security Policy (CSP) headers

```javascript- Enable security headers (X-Frame-Options, X-Content-Type-Options)

max_memory_restart: '1G'  // Increase to 1GB- Keep dependencies updated

```- Use environment-specific JWT secrets

- Implement rate limiting on backend API

### Issue: Cannot access from external IP- Regular security audits



**Solution:**## Support



1. Server is bound to `0.0.0.0` (all interfaces)For issues or questions:

2. Check firewall:- Check backend API health endpoint

- Review browser console for errors

```bash- Check network tab for failed requests

sudo ufw allow 3000/tcp- Verify environment configuration

```

3. If behind reverse proxy, check proxy configuration

## Performance Tips

1. **Enable HTTP/2** (if using nginx/Apache reverse proxy)
2. **Use CDN** for static assets
3. **Enable Brotli compression** (in reverse proxy)
4. **Monitor with PM2**: `pm2 monit`
5. **Check process health**: `./manager.sh 15`

## Security Considerations

1. **Run behind reverse proxy** for SSL/TLS
2. **Use firewall** to restrict direct access to port 3000
3. **Keep Node.js updated**
4. **Regular npm audit**: `npm audit && npm audit fix`
5. **Secure environment variables** - Don't commit `.env.production`

## Comparison with API Deployment

The UI deployment follows similar patterns to the API (`EMS/API`):

| Feature | API | UI |
|---------|-----|-----|
| Runtime | .NET/Kestrel | Node.js/Express |
| Process Manager | systemd | PM2 |
| Scripts | `install.sh`, `manager.sh` | `install.sh`, `manager.sh` |
| Logging | systemd journal | PM2 logs |
| Port | 5030 | 3000 |
| Auto-restart | Yes | Yes |
| Boot startup | systemd service | PM2 startup |

Both use similar management patterns for consistency across the stack.
