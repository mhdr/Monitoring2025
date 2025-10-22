# SSL Certificate Trust Issue - Fix Instructions

## Problem
Chrome DevTools shows "Provisional headers are shown" warning, indicating the browser is blocking HTTPS requests due to an untrusted SSL certificate.

## Root Cause
The Root CA certificate is not installed in your system's trust store, causing the browser to reject HTTPS connections to `https://192.168.70.105:7136`.

## Solution (Run on Linux machine 192.168.70.105)

### Step 1: Navigate to API directory
```bash
cd /path/to/Monitoring2025/EMS/API
```

### Step 2: Regenerate certificates (force regeneration to get all .pem files)
```bash
FORCE_REGENERATE=1 ./create-certificates.sh
```

This will create:
- `certificates/api-root-ca.pem` - Root CA certificate (needed for trust)
- `certificates/api-cert.pem` - Server certificate
- `certificates/api-key.pem` - Private key
- `certificates/api-cert.pfx` - PKCS#12 bundle for .NET

### Step 3: Make trust script executable (if not already)
```bash
chmod +x trust-certificate.sh
```

### Step 4: Run trust installation script
```bash
sudo ./trust-certificate.sh
```

This script will:
1. ✅ Install Root CA to system trust store (`/etc/ca-certificates/trust-source/anchors`)
2. ✅ Update certificate trust database
3. ✅ Add certificate to NSS databases (Firefox/Chrome)
4. ✅ Provide verification commands

### Step 5: Restart Chrome
After certificate installation, **restart Chrome completely**:
```bash
# Close all Chrome windows, then:
killall chrome
# Or from Chrome: chrome://restart
```

### Step 6: Verify
Test the connection:
```bash
curl -v https://192.168.70.105:7136/api/Monitoring/Groups
```

Or open Chrome and navigate to: `https://192.168.70.105:7136`

## Expected Result
- ✅ No "Provisional headers" warning in DevTools
- ✅ HTTPS requests succeed
- ✅ Certificate shows as trusted in browser
- ✅ Network tab shows actual request/response headers

## Troubleshooting

### If certificate still not trusted after installation:

1. **Verify certificate was installed:**
```bash
trust list | grep "EMS"
```

2. **Check certificate details:**
```bash
openssl x509 -in certificates/api-root-ca.pem -text -noout | grep -A3 "Subject Alternative Name"
```

3. **Manually import to Chrome** (if needed):
   - Open `chrome://settings/certificates`
   - Go to "Authorities" tab
   - Click "Import"
   - Select `certificates/api-root-ca.pem`
   - Check "Trust this certificate for identifying websites"
   - Click OK

4. **Clear Chrome's SSL state:**
   - `chrome://settings/clearBrowserData`
   - Select "Cached images and files"
   - Clear data

### If accessing from a different machine:

If you're accessing the API from a **different machine** (not 192.168.70.105), you need to:
1. Copy `certificates/api-root-ca.pem` to that machine
2. Install it on that machine's trust store
3. For Linux: Follow same trust-certificate.sh steps on that machine

## Alternative: Accept Certificate in Browser (Quick Fix)

If you just want to test quickly without installing certificates:
1. Navigate to `https://192.168.70.105:7136` in Chrome
2. Click "Advanced"
3. Click "Proceed to 192.168.70.105 (unsafe)"
4. This allows the certificate for this session only

**Note:** This is NOT recommended for production or regular development use.

## Notes
- Certificates are valid for 365 days
- Certificate includes SANs for: localhost, 127.0.0.1, 192.168.70.105, ::1
- Password for .pfx: `password123` (development only)
