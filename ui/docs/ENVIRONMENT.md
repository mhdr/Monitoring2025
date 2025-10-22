# Environment Variables Configuration

## Overview

This application uses environment variables to configure the backend API URL. This allows the same codebase to work across different environments (development, staging, production) without hardcoding server addresses.

## Environment Files

- **`.env.development`** - Used during development (`npm run dev`)
- **`.env.production`** - Used during production build (`npm run build`)
- **`.env.example`** - Template file for reference

## Variables

### `VITE_API_BASE_URL`

**Description:** Backend API base URL

**Format:** `https://your-api-domain.com` (no trailing slash)

**Examples:**
- Development: `https://localhost:7136`
- Production: `https://api.yourdomain.com`
- Production: `https://monitoring-api.company.com`

**Usage in code:**
```typescript
// Automatically available via import.meta.env
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

## Setup Instructions

### For Development

Development environment is already configured in `.env.development`:

```bash
VITE_API_BASE_URL=https://localhost:7136
```

No changes needed - just run:
```bash
npm run dev
```

### For Production

**Before deploying to production:**

1. **Create `.env.production` file** (if it doesn't exist):
   ```bash
   cp .env.example .env.production
   ```

2. **Edit `.env.production`** and set your production API URL:
   ```bash
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```

3. **Build the application:**
   ```bash
   npm run build
   ```

**Alternative - Set via command line:**
```bash
VITE_API_BASE_URL=https://api.yourdomain.com npm run build
```

**Alternative - Set via CI/CD:**
```bash
export VITE_API_BASE_URL=https://api.yourdomain.com
npm run build
```

## Important Notes

⚠️ **Build-time Variables**: Vite environment variables are **embedded at build time**, not runtime. This means:
- You must rebuild the app after changing `.env.production`
- The production build will have the API URL hardcoded into the JavaScript bundle
- You cannot change the API URL after building without rebuilding

⚠️ **Security**: Never commit sensitive secrets to `.env` files. Use CI/CD secrets for sensitive values.

⚠️ **Naming Convention**: Only variables prefixed with `VITE_` are exposed to the client code. This prevents accidentally exposing server-side secrets.

## Files Affected

The `VITE_API_BASE_URL` variable is used in:

- **`src/services/apiClient.ts`** - Axios HTTP client configuration
- **`src/services/signalrClient.ts`** - SignalR WebSocket connection
- **`vite.config.ts`** - Development proxy configuration

## Troubleshooting

### Issue: API calls fail in production

**Cause:** `VITE_API_BASE_URL` not set or incorrect

**Solution:**
1. Check `.env.production` exists and has correct URL
2. Rebuild the application: `npm run build`
3. Verify the URL is accessible from your deployment environment

### Issue: Changes to .env.production not applied

**Cause:** Environment variables are embedded at build time

**Solution:** Rebuild the application after any environment variable changes:
```bash
npm run build
```

### Issue: Getting CORS errors

**Cause:** Backend not configured to allow requests from frontend domain

**Solution:** Configure CORS on your backend API to allow requests from your frontend domain.

## Best Practices

1. **Never hardcode URLs** - Always use `import.meta.env.VITE_API_BASE_URL`
2. **Use `.env.example`** - Keep it updated as a reference for required variables
3. **Document variables** - Add comments in `.env.example` explaining each variable
4. **Git ignore** - `.env.production` should be in `.gitignore` (template `.env.example` is tracked)
5. **CI/CD secrets** - Store production values in your CI/CD platform's secret management
6. **Validate builds** - Test production builds locally before deploying

## Additional Resources

- [Vite Environment Variables Documentation](https://vitejs.dev/guide/env-and-mode.html)
- [Deployment Guide](./DEPLOYMENT.md) - Full production deployment instructions
