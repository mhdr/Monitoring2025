#!/bin/bash
# PM2 Troubleshooting Script for Monitoring UI

echo "=========================================="
echo "Monitoring UI - PM2 Troubleshooting"
echo "=========================================="
echo ""

# Check if PM2 is installed
echo "1. Checking PM2 installation..."
if command -v pm2 &> /dev/null; then
    echo "✓ PM2 is installed: $(pm2 --version)"
else
    echo "✗ PM2 is not installed"
    echo "  Install: sudo npm install -g pm2"
    exit 1
fi
echo ""

# Check PM2 status
echo "2. Checking PM2 application status..."
pm2 status
echo ""

# Check if app is running
echo "3. Checking if ems3-ui is running..."
if pm2 describe ems3-ui &> /dev/null; then
    echo "✓ ems3-ui is registered with PM2"
    pm2 describe ems3-ui | grep -E "status|uptime|restarts|memory|cpu"
else
    echo "✗ ems3-ui is not running"
    echo "  Start: pm2 start ecosystem.config.cjs"
fi
echo ""

# Check dist directory
echo "4. Checking build files..."
if [ -d "dist" ]; then
    echo "✓ dist/ directory exists"
    echo "  Files: $(find dist -type f | wc -l)"
    echo "  Size: $(du -sh dist | cut -f1)"
    if [ -f "dist/index.html" ]; then
        echo "✓ index.html exists"
    else
        echo "✗ index.html is missing"
        echo "  Build: npm run build"
    fi
else
    echo "✗ dist/ directory not found"
    echo "  Build: npm run build"
fi
echo ""

# Check port 3000
echo "5. Checking port 3000..."
if lsof -i :3000 &> /dev/null; then
    echo "✓ Port 3000 is in use"
    lsof -i :3000
else
    echo "✗ Nothing is listening on port 3000"
fi
echo ""

# Check backend API
echo "6. Checking backend API (localhost:5030)..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5030/health 2>/dev/null | grep -q "200"; then
    echo "✓ Backend API is responding"
    curl -s http://localhost:5030/health | jq . 2>/dev/null || curl -s http://localhost:5030/health
else
    echo "✗ Backend API is not responding"
    echo "  Ensure backend is running on port 5030"
fi
echo ""

# Check frontend health
echo "7. Checking frontend health (localhost:3000)..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null | grep -q "200"; then
    echo "✓ Frontend is responding"
    curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
else
    echo "✗ Frontend is not responding"
fi
echo ""

# Check logs
echo "8. Recent application logs..."
echo "--- Last 20 lines ---"
pm2 logs ems3-ui --nostream --lines 20 2>/dev/null || echo "No logs available"
echo ""

# Check for errors
echo "9. Recent errors..."
echo "--- Last 10 error lines ---"
pm2 logs ems3-ui --err --nostream --lines 10 2>/dev/null || echo "No error logs"
echo ""

# Check system resources
echo "10. System resources..."
echo "Memory:"
free -h | grep -E "Mem:|Swap:"
echo ""
echo "Disk:"
df -h | grep -E "Filesystem|/$"
echo ""
echo "CPU Load:"
uptime
echo ""

# Check Node.js version
echo "11. Node.js version..."
node --version
npm --version
echo ""

# Summary
echo "=========================================="
echo "Troubleshooting Summary"
echo "=========================================="
echo ""

# Determine issues
ISSUES=0

if ! pm2 describe ems3-ui &> /dev/null; then
    echo "⚠ Issue: Application is not running with PM2"
    echo "  Fix: pm2 start ecosystem.config.cjs"
    ISSUES=$((ISSUES+1))
fi

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "⚠ Issue: Build files are missing"
    echo "  Fix: npm run build"
    ISSUES=$((ISSUES+1))
fi

if ! lsof -i :3000 &> /dev/null; then
    echo "⚠ Issue: No process listening on port 3000"
    echo "  Fix: pm2 restart ems3-ui"
    ISSUES=$((ISSUES+1))
fi

if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:5030/health 2>/dev/null | grep -q "200"; then
    echo "⚠ Issue: Backend API is not responding"
    echo "  Fix: Check backend service"
    ISSUES=$((ISSUES+1))
fi

if [ $ISSUES -eq 0 ]; then
    echo "✓ No issues detected!"
    echo ""
    echo "If you're still experiencing problems:"
    echo "  1. Check browser console (F12)"
    echo "  2. Clear browser cache"
    echo "  3. Check firewall: sudo ufw status"
    echo "  4. Review full logs: pm2 logs ems3-ui"
else
    echo ""
    echo "Found $ISSUES issue(s) - see fixes above"
fi

echo ""
echo "=========================================="
echo "Quick Commands"
echo "=========================================="
echo "pm2 restart ems3-ui    - Restart app"
echo "pm2 logs ems3-ui       - View logs"
echo "pm2 monit              - Monitor resources"
echo "npm run build          - Rebuild app"
echo ""
