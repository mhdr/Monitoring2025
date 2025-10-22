# Production Deployment Guide

## Overview
This guide covers deploying the Monitoring2025 UI application to production environments.

## Environment Configuration

### Required Environment Variable

**`VITE_API_BASE_URL`** - Backend API base URL

- **Development**: `https://localhost:7136` (automatically set in `.env.development`)
- **Production**: Must be set in `.env.production` before building

### Setting Up Production Environment

1. **Copy the example file:**
   ```bash
   cp .env.example .env.production
   ```

2. **Edit `.env.production`** and set your production API URL:
   ```bash
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```

   Or set it directly in your CI/CD pipeline:
   ```bash
   export VITE_API_BASE_URL=https://api.yourdomain.com
   npm run build
   ```

## Build for Production

### Standard Build
```bash
# Ensure VITE_API_BASE_URL is set in .env.production
npm run build
```

The build output will be in the `dist/` directory.

### Build with Custom API URL
```bash
# Override environment variable during build
VITE_API_BASE_URL=https://api.yourdomain.com npm run build
```

## Deployment Options

### Option 1: Static Hosting (Recommended)
Deploy the `dist/` folder to any static hosting service:

- **Nginx**
- **Apache**
- **IIS**
- **Caddy**
- **CDN services** (Cloudflare, AWS CloudFront, etc.)

### Option 2: Docker Container

**Dockerfile example:**
```dockerfile
FROM nginx:alpine

# Copy built static files
COPY dist/ /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Build and run:**
```bash
# Build the app first
VITE_API_BASE_URL=https://api.yourdomain.com npm run build

# Build Docker image
docker build -t monitoring-ui .

# Run container
docker run -p 80:80 monitoring-ui
```

## Server Configuration

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name monitoring.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name monitoring.yourdomain.com;
    
    # SSL certificates
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Root directory
    root /var/www/monitoring-ui;
    index index.html;
    
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### Apache Configuration Example

**.htaccess:**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Enable gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType application/font-woff "access plus 1 year"
  ExpiresByType application/font-woff2 "access plus 1 year"
</IfModule>
```

## CI/CD Integration

### GitHub Actions Example

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build production bundle
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
        run: npm run build
      
      - name: Deploy to server
        uses: easingthemes/ssh-deploy@v2
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
          REMOTE_USER: ${{ secrets.REMOTE_USER }}
          SOURCE: "dist/"
          TARGET: "/var/www/monitoring-ui"
```

**Required secrets:**
- `VITE_API_BASE_URL` - Production API URL
- `SSH_PRIVATE_KEY` - SSH key for deployment
- `REMOTE_HOST` - Server hostname
- `REMOTE_USER` - SSH username

### GitLab CI Example

**.gitlab-ci.yml:**
```yaml
stages:
  - build
  - deploy

variables:
  VITE_API_BASE_URL: "https://api.yourdomain.com"

build:
  stage: build
  image: node:20-alpine
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

deploy:
  stage: deploy
  image: alpine:latest
  dependencies:
    - build
  before_script:
    - apk add --no-cache rsync openssh
  script:
    - mkdir -p ~/.ssh
    - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
    - chmod 600 ~/.ssh/id_rsa
    - rsync -avz --delete dist/ $REMOTE_USER@$REMOTE_HOST:/var/www/monitoring-ui
  only:
    - main
```

## Post-Deployment Checklist

- [ ] Verify `VITE_API_BASE_URL` is correctly set
- [ ] Test API connectivity from production URL
- [ ] Verify HTTPS is working (all API calls must be HTTPS)
- [ ] Test both Persian (RTL) and English (LTR) layouts
- [ ] Test responsive design on mobile, tablet, desktop
- [ ] Verify Service Worker registration
- [ ] Check browser console for errors
- [ ] Test authentication flow (login, refresh token, logout)
- [ ] Verify SignalR real-time connections work
- [ ] Test offline mode (if using Service Worker caching)
- [ ] Check CORS configuration on backend
- [ ] Monitor bundle size (should be under limits)
- [ ] Verify all static assets are loading with proper cache headers

## Troubleshooting

### Issue: API calls fail with CORS errors
**Solution:** Ensure backend CORS configuration allows the production frontend domain.

### Issue: Environment variable not applied
**Solution:** 
- Verify `.env.production` exists and contains `VITE_API_BASE_URL`
- Rebuild the app after changing environment variables
- Environment variables are **embedded at build time**, not runtime

### Issue: SignalR connection fails
**Solution:**
- Verify WebSocket support is enabled on server
- Check that `VITE_API_BASE_URL` includes the correct protocol (https://)
- Ensure backend SignalR hub is accessible at `/hubs/monitoring`

### Issue: 404 errors on page refresh
**Solution:** Configure your web server to always serve `index.html` for all routes (SPA routing).

### Issue: Service Worker not updating
**Solution:**
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Service Worker updates are prompted to users
- Check Service Worker registration in DevTools

## Performance Optimization

### Enable Compression
Ensure your server enables gzip/brotli compression for:
- JavaScript files (`.js`)
- CSS files (`.css`)
- JSON responses

### Set Cache Headers
Static assets should have long cache durations:
- JS/CSS files with content hash: 1 year
- Fonts: 1 year
- Images: 1 year
- HTML: No cache (always validate)

### CDN Integration
Consider using a CDN for faster global delivery:
- Cloudflare
- AWS CloudFront
- Fastly
- Azure CDN

### Monitoring
Set up monitoring for:
- Frontend error tracking (Sentry, Rollbar)
- Performance monitoring (Google Analytics, Web Vitals)
- Uptime monitoring
- API response times

## Security Considerations

- Always use HTTPS in production
- Set proper Content Security Policy (CSP) headers
- Enable security headers (X-Frame-Options, X-Content-Type-Options)
- Keep dependencies updated
- Use environment-specific JWT secrets
- Implement rate limiting on backend API
- Regular security audits

## Support

For issues or questions:
- Check backend API health endpoint
- Review browser console for errors
- Check network tab for failed requests
- Verify environment configuration
