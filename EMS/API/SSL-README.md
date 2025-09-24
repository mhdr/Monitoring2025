# SSL Certificate Setup for EMS API

This document explains how to set up SSL certificates for the EMS API development environment.

## Quick Start

1. **Generate SSL certificates:**
   ```bash
   ./create-certificates.sh
   ```

2. **Run the application with HTTPS:**
   ```bash
   dotnet run --launch-profile https
   ```

## Available Endpoints

- **HTTP**: `http://localhost:5030` (redirects to HTTPS)
- **HTTPS**: `https://localhost:7136`
- **Swagger UI**: `https://localhost:7136/swagger`

## Script Features

The `create-certificates.sh` script:
- ✅ Checks for OpenSSL installation
- ✅ Creates certificates directory
- ✅ Handles existing certificates (asks before overwriting)
- ✅ Generates self-signed certificate valid for 365 days
- ✅ Creates PKCS#12 (.pfx) format for .NET
- ✅ Sets appropriate file permissions
- ✅ Displays certificate information

## Certificate Details

- **Common Name**: localhost
- **Organization**: EMS Monitoring
- **Validity**: 365 days
- **Password**: password123
- **Files generated**:
  - `certificates/api-cert.pem` - Certificate file
  - `certificates/api-key.pem` - Private key file  
  - `certificates/api-cert.pfx` - PKCS#12 certificate for .NET

## Security Notes

⚠️ **Development Only**: These are self-signed certificates for development use only.

🔒 **Browser Warnings**: Browsers will show security warnings. Click "Advanced" → "Proceed to localhost" to continue.

📁 **Git Ignored**: Certificate files are excluded from version control for security.

🏭 **Production**: Use certificates from a trusted Certificate Authority (CA) in production.

## Troubleshooting

### OpenSSL Not Found
```bash
# Ubuntu/Debian
sudo apt-get install openssl

# CentOS/RHEL/Fedora
sudo yum install openssl
```

### Permission Issues
Make sure the script is executable:
```bash
chmod +x create-certificates.sh
```

### Certificate Expired
Simply run the script again to generate new certificates:
```bash
./create-certificates.sh
```

## Manual Certificate Creation

If you prefer to create certificates manually:

```bash
# Create directory
mkdir -p certificates
cd certificates

# Generate certificate and key
openssl req -x509 -newkey rsa:4096 -keyout api-key.pem -out api-cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=EMS Monitoring/OU=Development/CN=localhost"

# Convert to PKCS#12 format
openssl pkcs12 -export -out api-cert.pfx -inkey api-key.pem -in api-cert.pem -passout pass:password123
```