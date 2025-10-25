# Quick Deployment - Direct API Access

## TL;DR (On Production Server)

```bash
cd /path/to/Monitoring2025/ui
git pull origin main
./manager.sh 1
```

That's it! ✨

**Or use the manager menu:**
```bash
./manager.sh
# Select: 1 - Deploy (build and restart with PM2)
```

## What This Does

1. ✅ Auto-detects server IP address
2. ✅ Creates `.env.production` with `VITE_API_BASE_URL=http://<IP>:5030`
3. ✅ Builds React app with backend URL baked in
4. ✅ Restarts PM2
5. ✅ Verifies everything works

**All automatically in ONE command!**

## The Magic

**No proxy needed!** Browser calls backend directly:
```
Browser → http://192.168.70.10:5030/api/Auth/login → Backend ✅
```

Instead of:
```
Browser → Frontend (port 3000) → Proxy → Backend ❌ (complex)
```

## Manual Steps (If Script Fails)

```bash
# Just run the deploy
./manager.sh 1
```

Or step-by-step:
```bash
# 1. Generate .env.production (now built into install.sh)
# 2. Build
npm run build

# 3. Restart
pm2 restart ems3-ui
```

## Verify It Works

```bash
# Check PM2
pm2 status

# Test API (should return JWT tokens, not 404)
curl -X POST http://localhost:3000/api/Auth/login \
  -H "Content-Type: application/json" \
  -d '{"userName":"test","password":"Password@12345"}'
```

## Troubleshooting

**Still getting 404?**
- Hard refresh browser (Ctrl+Shift+R)
- Check `.env.production` has correct IP
- Rebuild: `npm run build`

**CORS error?**
- Backend needs to allow frontend IP in CORS policy
- Check backend logs

**Wrong IP?**
```bash
rm .env.production
./manager.sh 1  # Will auto-detect IP again
```

## Files Changed

- `.env.production` - Auto-generated with `VITE_API_BASE_URL`
- `dist/` - Built app with API URL baked in

## Next Time

Just run: `./manager.sh 1`

---
**Done!** 🚀 No more 404 errors, no more proxy complexity.
