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
$CERT_NAME = "api-cert"          # Server/leaf cert
$KEY_NAME = "api-key"            # Server private key
$PFX_NAME = "api-cert"           # PKCS#12 bundle
$CA_CERT_NAME = "api-root-ca"    # Root CA cert
$CA_KEY_NAME = "api-root-ca-key" # Root CA key
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

Write-ColorOutput "Generating Root CA (if needed) and server certificate..." "Yellow"

# Remove stale temp files
Remove-Item -Path ca.conf, server.conf, openssl.conf -Force -ErrorAction SilentlyContinue

# 1. Root CA
if (-not (Test-Path "$CA_CERT_NAME.pem") -or -not (Test-Path "$CA_KEY_NAME.pem")) {
    Write-ColorOutput "Creating Root CA..." "Yellow"
    $caConfig = @"
[req]
prompt = no
distinguished_name = dn
x509_extensions = v3_ca

[dn]
C=$COUNTRY
ST=$STATE
L=$LOCALITY
O=$ORGANIZATION
OU=$ORG_UNIT Root CA
CN=$COMMON_NAME Root CA

[v3_ca]
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid:always,issuer
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
"@
    $caConfig | Out-File -FilePath ca.conf -Encoding ASCII
    $caArgs = @(
        "req","-x509","-newkey","rsa:4096",
        "-days", $DAYS_VALID,
        "-sha256",
        "-nodes",
        "-keyout", "$CA_KEY_NAME.pem",
        "-out", "$CA_CERT_NAME.pem",
        "-config", "ca.conf",
        "-extensions", "v3_ca"
    )
    & $openSslPath $caArgs
    if ($LASTEXITCODE -ne 0) { Write-ColorOutput "Failed to create Root CA" "Red"; exit 1 }
    Write-ColorOutput "Root CA generated ($CA_CERT_NAME.pem)" "Green"
} else {
    Write-ColorOutput "Root CA already exists - reusing $CA_CERT_NAME.pem" "Green"
}

# 2. Server CSR with dynamic SANs
Write-ColorOutput "Collecting hostnames and interface IPs for SAN..." "Yellow"
$dnsSet = [System.Collections.Generic.HashSet[string]]::new()
$ipSet  = [System.Collections.Generic.HashSet[string]]::new()

foreach ($name in @('localhost', $env:COMPUTERNAME, [System.Net.Dns]::GetHostName(), [System.Net.Dns]::GetHostEntry('localhost').HostName)) {
    if ($name -and -not ($dnsSet.Contains($name))) { [void]$dnsSet.Add($name) }
}

try {
    $fqdn = ([System.Net.Dns]::GetHostEntry([System.Net.Dns]::GetHostName())).HostName
    if ($fqdn -and -not ($dnsSet.Contains($fqdn))) { [void]$dnsSet.Add($fqdn) }
} catch {}

# Optional EXTRA_SAN environment variable (comma separated)
$extraSan = $env:EXTRA_SAN
if ($extraSan) {
    foreach ($entry in $extraSan.Split(',', [System.StringSplitOptions]::RemoveEmptyEntries)) {
        $trim = $entry.Trim()
        if ($trim -and -not ($dnsSet.Contains($trim))) { [void]$dnsSet.Add($trim) }
    }
}

# Enumerate IPv4 addresses (non-loopback)
try {
    $addresses = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
        Where-Object { $_.OperationalStatus -eq 'Up' } |
        ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
        Where-Object { $_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork } |
        ForEach-Object { $_.Address.ToString() } |
        Sort-Object -Unique
    foreach ($a in $addresses) { if ($a -and -not $a.StartsWith('127.')) { [void]$ipSet.Add($a) } }
} catch {}

# Always include loopbacks
[void]$ipSet.Add('127.0.0.1')
[void]$ipSet.Add('::1')

$dnsIndex = 1
$ipIndex = 1
$altDnsLines = New-Object System.Text.StringBuilder
foreach ($d in $dnsSet) { [void]$altDnsLines.AppendLine("DNS.$dnsIndex = $d"); $dnsIndex++ }
$altIpLines = New-Object System.Text.StringBuilder
foreach ($ip in $ipSet) { [void]$altIpLines.AppendLine("IP.$ipIndex = $ip"); $ipIndex++ }

Write-ColorOutput "Detected $($dnsIndex-1) DNS names and $($ipIndex-1) IP entries for SAN" "Green"

$serverConfig = @"
[req]
distinguished_name = dn
prompt = no
req_extensions = v3_req

[dn]
C=$COUNTRY
ST=$STATE
L=$LOCALITY
O=$ORGANIZATION
OU=$ORG_UNIT
CN=$COMMON_NAME

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
$($altDnsLines.ToString())$($altIpLines.ToString())
"@
$serverConfig | Out-File -FilePath server.conf -Encoding ASCII

$csrArgs = @(
    "req","-new","-newkey","rsa:4096",
    "-nodes",
    "-keyout", "$KEY_NAME.pem",
    "-out","server.csr",
    "-config","server.conf"
)
& $openSslPath $csrArgs
if ($LASTEXITCODE -ne 0) { Write-ColorOutput "Failed to generate server CSR" "Red"; exit 1 }

# 3. Sign server cert
Write-ColorOutput "Signing server certificate with Root CA..." "Yellow"
$signArgs = @(
    "x509","-req","-in","server.csr",
    "-CA","$CA_CERT_NAME.pem","-CAkey","$CA_KEY_NAME.pem","-CAcreateserial",
    "-out","$CERT_NAME.pem","-days", $DAYS_VALID,
    "-sha256","-extensions","v3_req","-extfile","server.conf"
)
& $openSslPath $signArgs
if ($LASTEXITCODE -ne 0) { Write-ColorOutput "Failed to sign server certificate" "Red"; exit 1 }
Write-ColorOutput "Server certificate generated ($CERT_NAME.pem)" "Green"

# 4. Create chain file
Get-Content "$CERT_NAME.pem","$CA_CERT_NAME.pem" | Set-Content "$CERT_NAME-chain.pem"
Write-ColorOutput "Chain file created ($CERT_NAME-chain.pem)" "Green"

Remove-Item -Path server.csr, ca.conf, server.conf, "$CA_CERT_NAME.srl" -Force -ErrorAction SilentlyContinue

Write-ColorOutput "Converting certificate + chain to PKCS#12 format (.pfx)..." "Yellow"

# Convert to PKCS#12 format for .NET
$pkcs12Args = @(
    "pkcs12", "-export",
    "-out", "$PFX_NAME.pfx",
    "-inkey", "$KEY_NAME.pem",
    "-in", "$CERT_NAME.pem",
    "-certfile", "$CA_CERT_NAME.pem",
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
Write-ColorOutput "  Root CA certificate: $CA_CERT_NAME.pem" "White"
Write-ColorOutput "  Server certificate: $CERT_NAME.pem" "White"
Write-ColorOutput "  Server private key: $KEY_NAME.pem" "White"
Write-ColorOutput "  Certificate chain: $CERT_NAME-chain.pem" "White"
Write-ColorOutput "  PKCS#12 (with chain): $PFX_NAME.pfx" "White"
Write-Host ""
Write-ColorOutput "Certificate details:" "White"
Write-ColorOutput "  Common Name: $COMMON_NAME" "White"
Write-ColorOutput "  Organization: $ORGANIZATION" "White"
Write-ColorOutput "  Valid for: $DAYS_VALID days" "White"
Write-ColorOutput "  Password: $CERT_PASSWORD" "White"

Write-Host ""
Write-ColorOutput "Certificate Information:" "Blue"
try {
    $leafInfo = & $openSslPath x509 -in "$CERT_NAME.pem" -text -noout | Select-String -Pattern "(Issuer:|Subject:|Not Before:|Not After :)"
    $leafInfo | ForEach-Object { Write-ColorOutput $_.Line "White" }
    $caInfo = & $openSslPath x509 -in "$CA_CERT_NAME.pem" -text -noout | Select-String -Pattern "(Subject:|CA:true)"
    $caInfo | Select-Object -First 2 | ForEach-Object { Write-ColorOutput $_.Line "Yellow" }
} catch {
    Write-ColorOutput "Could not display certificate information" "Yellow"
}

################################ Trust Installation ################################
Write-Host ""
Write-ColorOutput "Installing Root CA to Windows certificate store..." "Yellow"

try {
    # Import Root CA to Current User's Trusted Root Certification Authorities store
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("$CA_CERT_NAME.pem")
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
    $store.Open("ReadWrite")
    
    # Check if certificate already exists
    $existingCert = $store.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
    
    if ($existingCert) {
        Write-ColorOutput "Certificate already exists in trust store (thumbprint: $($cert.Thumbprint))" "Yellow"
    } else {
        $store.Add($cert)
    Write-ColorOutput "Root CA installed and trusted for current user" "Green"
    Write-ColorOutput "Root CA thumbprint: $($cert.Thumbprint)" "White"
    }
    
    $store.Close()
    
    # Also try to install to Local Machine store (requires admin privileges)
    try {
        $machineStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "LocalMachine")
        $machineStore.Open("ReadWrite")
        
    $existingMachineCert = $machineStore.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
        
        if ($existingMachineCert) {
            Write-ColorOutput "Certificate already exists in machine trust store" "Yellow"
        } else {
            $machineStore.Add($cert)
            Write-ColorOutput "Root CA also installed to Local Machine trust store" "Green"
        }
        
        $machineStore.Close()
    } catch {
        Write-ColorOutput "Could not install to Local Machine store (admin privileges required)" "Yellow"
        Write-ColorOutput "Certificate is trusted for current user only" "White"
    }
    
} catch {
    Write-ColorOutput "Failed to install certificate to trust store: $_" "Red"
    Write-ColorOutput "You may need to manually trust the certificate" "Yellow"
    Write-ColorOutput "Double-click the certificate file and install it to 'Trusted Root Certification Authorities'" "White"
}

Write-Host ""
Write-ColorOutput "Note: This is a self-signed certificate for development use only." "Yellow"
Write-ColorOutput "The Root CA should now be trusted; the server cert will chain to it." "White"
Write-ColorOutput "If you still see warnings, try restarting your browser." "White"

Write-Host ""
Write-ColorOutput "You can now run your application with:" "Green"
Write-ColorOutput "  dotnet run --launch-profile https" "White"

Set-Location ..

Write-Host ""
Write-ColorOutput "Certificate generation and installation completed successfully!" "Green"