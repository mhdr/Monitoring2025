# CORS Configuration Guide

## Overview

The API uses a flexible, configuration-based CORS policy that can be modified on the production server without recompiling code.

## Configuration Location

CORS settings are configured in `appsettings.json` (or `appsettings.Production.json` for production):

```json
{
  "CORS": {
    "AllowedDomains": [
      "*.sobhanonco.ir",
      "sobhanonco.ir"
    ],
    "AllowedPorts": [
      3000, 5000, 5030, 5173, 8443
    ],
    "AllowLocalhost": true,
    "AllowLocalNetwork": true,
    "AllowDetectedIPs": true,
    "AllowedProtocols": ["http", "https"]
  }
}
```

## Configuration Properties

### `AllowedDomains` (array of strings)
List of domain patterns to allow. Supports wildcards:
- `"*.sobhanonco.ir"` - Allows any subdomain of sobhanonco.ir (e.g., ems3.sobhanonco.ir, api.sobhanonco.ir)
- `"sobhanonco.ir"` - Allows the root domain
- `"example.com"` - Exact domain match
- `"*.local"` - Allows any `.local` domain

### `AllowedPorts` (array of integers)
List of ports that are allowed for connections:
- `5030` - Backend API port
- `5173` - Vite development server (frontend)
- `8443` - Common HTTPS alternative port (used by Caddy)
- `3000`, `3001`, etc. - Other common development ports

### `AllowLocalhost` (boolean)
- `true` - Allows connections from localhost, 127.0.0.1, ::1
- `false` - Blocks localhost connections

### `AllowLocalNetwork` (boolean)
- `true` - Allows connections from local network IPs (192.168.x.x, 10.x.x.x, 172.20.x.x)
- `false` - Blocks local network connections

### `AllowDetectedIPs` (boolean)
- `true` - Allows connections from automatically detected public and local IPs
- `false` - Blocks auto-detected IPs

### `AllowedProtocols` (array of strings)
Protocols to allow:
- `"http"` - Allow HTTP connections
- `"https"` - Allow HTTPS connections

## Production Server Configuration

On your production server, edit `/path/to/API/appsettings.Production.json`:

```json
{
  "CORS": {
    "AllowedDomains": [
      "*.sobhanonco.ir",
      "sobhanonco.ir",
      "*.yourdomain.com"
    ],
    "AllowedPorts": [
      5030,
      8443,
      443
    ],
    "AllowLocalhost": false,
    "AllowLocalNetwork": false,
    "AllowDetectedIPs": true,
    "AllowedProtocols": ["https"]
  }
}
```

### Production Best Practices

1. **Use HTTPS only**: Set `AllowedProtocols` to `["https"]` only
2. **Disable localhost**: Set `AllowLocalhost` to `false`
3. **Disable local network**: Set `AllowLocalNetwork` to `false` in production
4. **Use specific domains**: Add your production domains to `AllowedDomains`
5. **Limit ports**: Only include production ports (443, 8443, etc.)

## Examples

### Development Configuration
```json
{
  "CORS": {
    "AllowedDomains": ["*.local", "localhost"],
    "AllowedPorts": [3000, 5000, 5030, 5173, 8443],
    "AllowLocalhost": true,
    "AllowLocalNetwork": true,
    "AllowDetectedIPs": true,
    "AllowedProtocols": ["http", "https"]
  }
}
```

### Production Configuration (Strict)
```json
{
  "CORS": {
    "AllowedDomains": [
      "ems3.sobhanonco.ir",
      "*.sobhanonco.ir"
    ],
    "AllowedPorts": [443, 8443],
    "AllowLocalhost": false,
    "AllowLocalNetwork": false,
    "AllowDetectedIPs": false,
    "AllowedProtocols": ["https"]
  }
}
```

### Mixed Environment (Testing server)
```json
{
  "CORS": {
    "AllowedDomains": [
      "*.sobhanonco.ir",
      "test.example.com"
    ],
    "AllowedPorts": [5030, 5173, 8443],
    "AllowLocalhost": true,
    "AllowLocalNetwork": true,
    "AllowDetectedIPs": true,
    "AllowedProtocols": ["http", "https"]
  }
}
```

## How It Works

The CORS middleware checks requests in this order:

1. **Explicit Origins**: Checks if origin is in the pre-built list (from detected IPs + ports)
2. **Domain Patterns**: Checks if the request matches any `AllowedDomains` pattern
3. **Port Validation**: Verifies the port is in `AllowedPorts`
4. **Localhost Check**: If enabled, allows localhost origins
5. **Local Network Check**: If enabled, allows 192.168.x.x, 10.x.x.x, 172.20.x.x

## Applying Changes

After modifying the configuration:

1. **Linux (systemd)**:
   ```bash
   sudo systemctl restart ems3_api
   ```

2. **Manual restart**:
   ```bash
   # Stop the API
   pkill -f "dotnet.*API.dll"
   
   # Start the API
   cd /path/to/API
   dotnet run
   ```

3. **Verify**: Check the console output for CORS configuration logs:
   ```
   [CORS] Configuration loaded from appsettings.json
   [CORS]   Allowed Domains: *.sobhanonco.ir, sobhanonco.ir
   [CORS]   Allowed Ports: 3000, 5030, 5173, 8443
   ```

## Troubleshooting

### "CORS policy error" in browser

1. Check the browser console for the exact origin being blocked
2. Add that domain/subdomain to `AllowedDomains`
3. Verify the port is in `AllowedPorts`
4. Ensure the protocol (http/https) is in `AllowedProtocols`
5. Restart the API service

### Domain pattern not matching

- `*.domain.com` matches `sub.domain.com` and `domain.com`
- For exact match, use `"domain.com"` without wildcard
- Domain matching is case-insensitive

### Port-based blocking

If you see `[CORS] ✓ Allowing domain pattern` in logs but still get errors:
- The port might not be in `AllowedPorts`
- Add the port number to the configuration

## Security Considerations

- **Never use `AllowAnyOrigin()`** - This implementation doesn't use it
- **Always validate in production** - Test CORS after configuration changes
- **Use HTTPS in production** - Set `AllowedProtocols` to `["https"]` only
- **Limit domain patterns** - Be specific with allowed domains
- **Monitor logs** - Check for blocked origins in production logs
