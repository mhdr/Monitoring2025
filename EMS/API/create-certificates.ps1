# SSL Certificate Generation Script for EMS API (Windows PowerShell)
# This script creates self-signed SSL certificates for development use

param(
    [switch]$Force
)

# Enable strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

# Configuration
$CERT_DIR = "certificates"
$CERT_NAME = "api-cert"
$KEY_NAME = "api-key"
$PFX_NAME = "api-cert"
$CERT_PASSWORD = "password123"
$DAYS_VALID = 365

# Certificate subject information
$COUNTRY = "US"
$STATE = "State"
$LOCALITY = "City"
$ORGANIZATION = "EMS Monitoring"
$ORG_UNIT = "Development"
$COMMON_NAME = "localhost"

Write-ColorOutput "=== EMS API SSL Certificate Generator ===" "Blue"
Write-ColorOutput "This script will create self-signed SSL certificates for development use." "White"
Write-Host ""

# Check if OpenSSL is available
$openSslPath = $null
$possiblePaths = @(
    "openssl",
    "C:\Program Files\OpenSSL-Win64\bin\openssl.exe",
    "C:\Program Files (x86)\OpenSSL-Win32\bin\openssl.exe",
    "C:\OpenSSL\bin\openssl.exe",
    "C:\tools\openssl\openssl.exe"
)

foreach ($path in $possiblePaths) {
    try {
        $result = & $path version 2>$null
        if ($LASTEXITCODE -eq 0) {
            $openSslPath = $path
            break
        }
    } catch {
        # Continue to next path
    }
}

if (-not $openSslPath) {
    Write-ColorOutput "Error: OpenSSL is not installed or not found in PATH." "Red"
    Write-ColorOutput "Please install OpenSSL from one of these sources:" "Yellow"
    Write-ColorOutput "  1. Win64/Win32 OpenSSL: https://slproweb.com/products/Win32OpenSSL.html" "White"
    Write-ColorOutput "  2. Chocolatey: choco install openssl" "White"
    Write-ColorOutput "  3. Scoop: scoop install openssl" "White"
    Write-ColorOutput "  4. Git for Windows (includes OpenSSL)" "White"
    exit 1
}

Write-ColorOutput "OpenSSL found at: $openSslPath" "Green"

# Create certificates directory if it doesn't exist
if (-not (Test-Path $CERT_DIR)) {
    Write-ColorOutput "Creating certificates directory..." "Yellow"
    New-Item -ItemType Directory -Path $CERT_DIR -Force | Out-Null
}

Set-Location $CERT_DIR

# Check if certificates already exist
$certExists = (Test-Path "$CERT_NAME.pem") -and (Test-Path "$KEY_NAME.pem") -and (Test-Path "$PFX_NAME.pfx")

if ($certExists -and -not $Force) {
    Write-ColorOutput "SSL certificates already exist." "Yellow"
    $response = Read-Host "Do you want to regenerate them? (y/N)"
    
    if ($response -notmatch '^[Yy]$') {
        Write-ColorOutput "Using existing certificates." "Green"
        Set-Location ..
        exit 0
    }
    
    Write-ColorOutput "Removing existing certificates..." "Yellow"
    Remove-Item -Path "$CERT_NAME.pem", "$KEY_NAME.pem", "$PFX_NAME.pfx" -Force -ErrorAction SilentlyContinue
}

Write-ColorOutput "Generating SSL certificate and private key..." "Yellow"

# Build the subject string
$subject = "/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANIZATION/OU=$ORG_UNIT/CN=$COMMON_NAME"

# Generate private key and certificate in one command
$opensslArgs = @(
    "req", "-x509", "-newkey", "rsa:4096",
    "-keyout", "$KEY_NAME.pem",
    "-out", "$CERT_NAME.pem",
    "-days", $DAYS_VALID,
    "-nodes",
    "-subj", $subject
)

try {
    & $openSslPath $opensslArgs
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "Certificate and private key generated successfully" "Green"
    } else {
        throw "OpenSSL returned exit code: $LASTEXITCODE"
    }
} catch {
    Write-ColorOutput "Failed to generate certificate and private key" "Red"
    Write-ColorOutput "Error: $_" "Red"
    Set-Location ..
    exit 1
}

Write-ColorOutput "Converting certificate to PKCS#12 format (.pfx)..." "Yellow"

# Convert to PKCS#12 format for .NET
$pkcs12Args = @(
    "pkcs12", "-export",
    "-out", "$PFX_NAME.pfx",
    "-inkey", "$KEY_NAME.pem",
    "-in", "$CERT_NAME.pem",
    "-passout", "pass:$CERT_PASSWORD"
)

try {
    & $openSslPath $pkcs12Args
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "PKCS#12 certificate generated successfully" "Green"
    } else {
        throw "OpenSSL returned exit code: $LASTEXITCODE"
    }
} catch {
    Write-ColorOutput "Failed to generate PKCS#12 certificate" "Red"
    Write-ColorOutput "Error: $_" "Red"
    Set-Location ..
    exit 1
}

# Set appropriate file permissions (Windows equivalent)
try {
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    
    # Set permissions for private key file
    Write-ColorOutput "Setting permissions for private key file..." "Yellow"
    $keyPermission = "${currentUser}:(R)"
    icacls "$KEY_NAME.pem" /inheritance:r /grant:r $keyPermission | Out-Null
    
    # Set permissions for PFX certificate file
    Write-ColorOutput "Setting permissions for PFX certificate file..." "Yellow"
    $pfxPermission = "${currentUser}:(R)"
    icacls "$PFX_NAME.pfx" /inheritance:r /grant:r $pfxPermission | Out-Null
    
    # Set permissions for PEM certificate file (less restrictive since it's just the public cert)
    Write-ColorOutput "Setting permissions for PEM certificate file..." "Yellow"
    $certPermission = "${currentUser}:(R)"
    icacls "$CERT_NAME.pem" /inheritance:r /grant:r $certPermission | Out-Null
    
    # Ensure the certificates directory has proper permissions
    Set-Location ..
    $dirPermission = "${currentUser}:(RX)"
    icacls "$CERT_DIR" /grant:r $dirPermission | Out-Null
    Set-Location $CERT_DIR
    
    Write-ColorOutput "File permissions set successfully" "Green"
} catch {
    Write-ColorOutput "Warning: Could not set file permissions: $_" "Yellow"
    Write-ColorOutput "You may need to manually set read permissions on the certificate files." "Yellow"
}

Write-Host ""
Write-ColorOutput "=== Certificate Generation Complete ===" "Green"
Write-ColorOutput "Generated files:" "White"
Write-ColorOutput "  Certificate file: $CERT_NAME.pem" "White"
Write-ColorOutput "  Private key file: $KEY_NAME.pem" "White"
Write-ColorOutput "  PKCS#12 certificate for .NET: $PFX_NAME.pfx" "White"
Write-Host ""
Write-ColorOutput "Certificate details:" "White"
Write-ColorOutput "  Common Name: $COMMON_NAME" "White"
Write-ColorOutput "  Organization: $ORGANIZATION" "White"
Write-ColorOutput "  Valid for: $DAYS_VALID days" "White"
Write-ColorOutput "  Password: $CERT_PASSWORD" "White"

Write-Host ""
Write-ColorOutput "Certificate Information:" "Blue"
try {
    $certInfoArgs = @("x509", "-in", "$CERT_NAME.pem", "-text", "-noout")
    $certInfo = & $openSslPath $certInfoArgs | Select-String -Pattern "(Issuer|Subject|Not Before|Not After)"
    $certInfo | ForEach-Object { Write-ColorOutput $_.Line "White" }
} catch {
    Write-ColorOutput "Could not display certificate information" "Yellow"
}

Write-Host ""
Write-ColorOutput "Note: This is a self-signed certificate for development use only." "Yellow"
Write-ColorOutput "Browsers will show security warnings. Click 'Advanced' -> 'Proceed to localhost' to continue." "White"

Write-Host ""
Write-ColorOutput "You can now run your application with:" "Green"
Write-ColorOutput "  dotnet run --launch-profile https" "White"

Set-Location ..

Write-Host ""
Write-ColorOutput "Certificate generation completed successfully!" "Green"