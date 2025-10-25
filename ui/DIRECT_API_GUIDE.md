# Direct Backend Access (No Proxy) - Deployment Guide

## Overview
This approach eliminates the proxy and makes the React app call the backend API directly at `http://<SERVER_IP>:5030`.

## Why This is Better
- ✅ **Simpler**: No proxy configuration needed
- ✅ **Fewer failure points**: Direct browser → backend communication
- ✅ **Better performance**: One less network hop
- ✅ **Easier debugging**: See actual API calls in browser DevTools

## Prerequisites
- Backend running on port 5030
- Backend CORS configured to accept frontend origin

## Deployment Steps

### 1. Generate .env.production (Auto-detect Server IP)

```bash
cd /path/to/Monitoring2025/ui
chmod +x generate-env.sh
./generate-env.sh
```

This will:
- Auto-detect the server's IP address
- Create `.env.production` with `VITE_API_BASE_URL=http://<SERVER_IP>:5030`
- Test backend connectivity

**Manual Override (if auto-detection fails):**
```bash
# Create .env.production manually
echo "VITE_API_BASE_URL=http://YOUR_SERVER_IP:5030" > .env.production
```

### 2. Build the App

```bash
npm run build
```

The build process will:
- Read `VITE_API_BASE_URL` from `.env.production`
- Bake the API URL into the JavaScript bundle
- Output to `dist/` directory

### 3. Deploy with PM2

**Option A: Fresh Start**
```bash
pm2 delete ems3-ui
pm2 start ecosystem.config.cjs --env production
pm2 save
```

**Option B: Restart Existing**
```bash
pm2 restart ems3-ui
```

### 4. Verify

**Check PM2 Status:**
```bash
pm2 status
pm2 logs ems3-ui --lines 20
```

**Test Frontend:**
```bash
curl http://localhost:3000/health
```

**Test from Browser:**
Open DevTools → Network tab, then access the app. You should see:
- Direct API calls to `http://<SERVER_IP>:5030/api/*`
- Status 200 (not 404)

## Backend CORS Configuration

Your .NET backend needs to allow the frontend origin:

```csharp
// Startup.cs or Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://192.168.70.10:3000",  // Add your server IP
            "http://localhost:3000",       // Development
            "http://localhost:5173"        // Vite dev server
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

app.UseCors("AllowFrontend");
```

**Important:** Add the actual server IP to the CORS policy!

## How It Works

### Before (With Proxy)
```
Browser → http://192.168.70.10:3000/api/Auth/login
         ↓
Express Proxy → http://localhost:5030/api/Auth/login
         ↓
Backend API
```

### After (Direct Access)
```
Browser → http://192.168.70.10:5030/api/Auth/login
         ↓
Backend API (direct)
```

## Troubleshooting

### Issue: CORS Error
**Symptom:** Browser console shows CORS policy error

**Solution:** Update backend CORS to allow frontend origin
```bash
# Check backend logs for blocked requests
```

### Issue: Connection Refused
**Symptom:** `ERR_CONNECTION_REFUSED` in browser

**Solution:**
1. Verify backend is running:
   ```bash
   curl http://localhost:5030/health
   ```
2. Check firewall allows port 5030:
   ```bash
   sudo ufw allow 5030/tcp
   ```

### Issue: Wrong IP Address
**Symptom:** API calls go to wrong IP

**Solution:** Regenerate .env.production:
```bash
rm .env.production
./generate-env.sh
npm run build
pm2 restart ems3-ui
```

## Complete Automated Deployment

Use the all-in-one script:
```bash
./fix-pm2-proxy.sh
```

This will:
1. Check backend is running
2. Pull latest code
3. Auto-generate .env.production
4. Install dependencies
5. Build production bundle
6. Restart PM2
7. Run verification tests

## Comparison: Proxy vs Direct

| Aspect | Proxy | Direct |
|--------|-------|--------|
| Complexity | High | Low |
| Failure points | 2 (proxy + backend) | 1 (backend) |
| Performance | Slower | Faster |
| CORS needed | No | Yes |
| Configuration | PM2 + Express + Vite | Just Vite |
| Debugging | Harder | Easier |

## When to Use Proxy vs Direct

**Use Proxy When:**
- Backend can't enable CORS
- Need to hide backend location
- Different domains (example.com vs api.example.com)
- Need SSL termination at proxy level

**Use Direct (Your Case):**
- ✅ Internal network
- ✅ Backend has CORS
- ✅ Known IP/port
- ✅ Want simplicity

## Next Steps

1. Run `./generate-env.sh` to create `.env.production`
2. Run `npm run build` to build with new API URL
3. Restart PM2: `pm2 restart ems3-ui`
4. Test in browser (hard refresh with Ctrl+Shift+R)

Done! No proxy needed. 🎉
