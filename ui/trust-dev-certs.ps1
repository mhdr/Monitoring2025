<#
.SYNOPSIS
    Trust Development SSL Certificates for Vite on Windows.
.DESCRIPTION
    This script configures a trusted local SSL certificate for HTTPS development with Vite.
    It ensures that browsers like Chrome, Edge, and Firefox trust the localhost certificate, preventing security warnings.

    The script follows this strategy:
    1. It first checks if it is running with Administrator privileges, which is required.
    2. It checks for the presence of `mkcert`. If found, it uses `mkcert` to create and install a robust, trusted certificate. This is the preferred method.
    3. If `mkcert` is not found, it falls back to using `openssl` to generate a custom root Certificate Authority (CA) and a leaf certificate for localhost.
    4. The generated root CA is then added to the Local Machine's trusted root certificate store.
    5. If neither `mkcert` nor `openssl` is available, the script will exit with an error, instructing the user to install one of them.

.NOTES
    Author: Generated
    Date: 2025-10-03
    Requires: Windows PowerShell, running as Administrator.
              `mkcert` (recommended, install via `choco install mkcert`) or `openssl`.
#>

#Requires -RunAsAdministrator

# Strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Script Setup ---
$Script:Color = @{
    RED     = "`e[91m"
    GREEN   = "`e[92m"
    YELLOW  = "`e[93m"
    BLUE    = "`e[94m"
    NC      = "`e[0m" # No Color
}

function Write-Color-Host ($Message, $Color) {
    Write-Host "$($Script:Color[$Color])${Message}$($Script:Color['NC'])"
}

Write-Color-Host "[UNLOCK] Development SSL Certificate Trust Setup for Windows" "BLUE"
Write-Color-Host "======================================================" "BLUE"

# --- Check for Dependencies ---
function Command-Exists ($command) {
    return (Get-Command $command -ErrorAction SilentlyContinue) -ne $null
}

$hasMkcert = Command-Exists "mkcert"
$hasOpenssl = Command-Exists "openssl"

# --- Certificate Configuration ---
$viteCertDir = "$HOME\.vite-plugin-basic-ssl"
if (-not (Test-Path $viteCertDir)) {
    New-Item -Path $viteCertDir -ItemType Directory -Force | Out-Null
}

$certFile = Join-Path $viteCertDir "cert.pem"
$keyFile = Join-Path $viteCertDir "key.pem"
$rootCAKey = Join-Path $viteCertDir "rootCA-key.pem"
$rootCACert = Join-Path $viteCertDir "rootCA.pem"
$rootCAName = "Monitoring Dev Local CA"

# Helper to get certificate expiry days
function Get-Cert-Days-Remaining ($file) {
    if (-not (Test-Path $file)) { return 0 }
    try {
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($file)
        $remaining = $cert.NotAfter - (Get-Date)
        return [int]$remaining.TotalDays
    } catch {
        return 0
    }
}

# --- Main Logic ---

# Path 1: Use mkcert (Preferred)
if ($hasMkcert) {
    Write-Color-Host "[TOOLS] Using mkcert for certificate generation..." "BLUE"
    
    $rem = Get-Cert-Days-Remaining -file $certFile
    if (-not (Test-Path $certFile) -or $rem -lt 15) {
        Write-Color-Host "[GEAR] Generating (or refreshing) mkcert localhost certificate..." "BLUE"
        
        # Install the mkcert root CA into the system trust stores
        mkcert -install | Out-Null
        
        # Generate the leaf certificate
        Push-Location $viteCertDir
        try {
            mkcert -key-file "key.pem" -cert-file "cert.pem" localhost 127.0.0.1 ::1 | Out-Null
        } finally {
            Pop-Location
        }
        
        Write-Color-Host "[CHECK] mkcert certificate ready (expires in $(Get-Cert-Days-Remaining $certFile) days)" "GREEN"
    } else {
        Write-Color-Host "[CHECK] Existing mkcert certificate valid for $rem more days" "GREEN"
    }
    
    $mkcertRootPath = mkcert -CAROOT
    $rootCACert = Join-Path $mkcertRootPath "rootCA.pem"

}
# Path 2: Use openssl (Fallback)
elseif ($hasOpenssl) {
    Write-Color-Host "[WARNING] mkcert not found. Falling back to custom root CA generation with openssl." "YELLOW"

    # Generate Root CA if missing or expiring
    $caRem = Get-Cert-Days-Remaining -file $rootCACert
    if (-not (Test-Path $rootCACert) -or $caRem -lt 30) {
        Write-Color-Host "[GEAR] Creating local root CA ('$rootCAName')..." "BLUE"
        
        $rootCAConfig = @"
[ req ]
distinguished_name = dn
prompt = no
x509_extensions = v3_ca

[ dn ]
CN = ${rootCAName}
O = Local Dev
C = XX

[ v3_ca ]
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
"@
        Set-Content -Path (Join-Path $viteCertDir "rootCA.cnf") -Value $rootCAConfig
        
        openssl genrsa -out $rootCAKey 4096
        openssl req -x509 -new -nodes -key $rootCAKey -sha256 -days 3650 -out $rootCACert -config (Join-Path $viteCertDir "rootCA.cnf")
        
        Remove-Item (Join-Path $viteCertDir "rootCA.cnf") -ErrorAction SilentlyContinue
        Write-Color-Host "[CHECK] Root CA created (expires in $(Get-Cert-Days-Remaining $rootCACert) days)" "GREEN"
    } else {
        Write-Color-Host "[CHECK] Root CA valid for $caRem more days" "GREEN"
    }

    # Generate Leaf Certificate if missing or expiring
    $leafRem = Get-Cert-Days-Remaining -file $certFile
    if (-not (Test-Path $certFile) -or $leafRem -lt 15) {
        Write-Color-Host "[GEAR] Generating leaf localhost certificate signed by root CA..." "BLUE"
        
        $certConfig = @"
[ req ]
distinguished_name = dn
prompt = no
req_extensions = v3_req

[ dn ]
CN = localhost

[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer

[ alt_names ]
DNS.1 = localhost
DNS.2 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
"@
        Set-Content -Path (Join-Path $viteCertDir "cert.conf") -Value $certConfig
        
        openssl genrsa -out $keyFile 2048
        openssl req -new -key $keyFile -out (Join-Path $viteCertDir "cert.csr") -config (Join-Path $viteCertDir "cert.conf")
        openssl x509 -req -in (Join-Path $viteCertDir "cert.csr") -CA $rootCACert -CAkey $rootCAKey -CAcreateserial -out $certFile -days 825 -sha256 -extensions v3_req -extfile (Join-Path $viteCertDir "cert.conf")
        
        Remove-Item (Join-Path $viteCertDir "cert.csr") -ErrorAction SilentlyContinue
        Remove-Item (Join-Path $viteCertDir "cert.conf") -ErrorAction SilentlyContinue
        Remove-Item (Join-Path $viteCertDir "rootCA.srl") -ErrorAction SilentlyContinue
        
        Write-Color-Host "[CHECK] Leaf certificate generated (expires in $(Get-Cert-Days-Remaining $certFile) days)" "GREEN"
    } else {
        Write-Color-Host "[CHECK] Leaf certificate valid for $leafRem more days" "GREEN"
    }

    # Trust the custom Root CA
    Write-Color-Host "[LOCK] Adding local root CA to system trust store (requires elevation)..." "BLUE"
    $existingCert = Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Subject -like "CN=$rootCAName*" }
    if ($existingCert) {
        Write-Color-Host "[INFO] Root CA '$rootCAName' is already in the trust store. Removing to update." "YELLOW"
        Remove-Item -Path $existingCert.PSPath -DeleteKey -Force
    }
    Import-Certificate -FilePath $rootCACert -CertStoreLocation Cert:\LocalMachine\Root | Out-Null
    Write-Color-Host "[CHECK] Root CA '$rootCAName' has been installed into the Local Machine's Trusted Root Certification Authorities store." "GREEN"

}
# Path 3: No tools found
else {
    Write-Color-Host "[CROSS] Critical dependency missing." "RED"
    Write-Color-Host "   Please install 'mkcert' (recommended) or 'openssl'." "RED"
    Write-Color-Host "   You can install mkcert easily using Chocolatey: choco install mkcert" "RED"
    exit 1
}


# --- Final Instructions ---
Write-Host ""
Write-Color-Host "[PARTY] Certificate trust setup completed!" "GREEN"
Write-Host ""
Write-Color-Host "[CLIPBOARD] Next steps:" "BLUE"
Write-Host "1. Restart any open browsers (Chrome, Edge, Firefox) to apply the changes."
Write-Host "2. Start your Vite development server: npm run dev"
Write-Host "3. Visit https://localhost:5173 (you should see a secure lock icon)."
Write-Host ""
Write-Color-Host "[LIGHTBULB] To remove the root CA later:" "YELLOW"
if ($hasMkcert) {
    Write-Host "   Run: mkcert -uninstall"
} else {
    Write-Host "1. Run 'certlm.msc'."
    Write-Host "2. Navigate to 'Trusted Root Certification Authorities > Certificates'."
    Write-Host "3. Find and delete the certificate named '$rootCAName'."
}
Write-Host ""
Write-Color-Host "[STAR] Happy coding with trusted HTTPS! [STAR]" "GREEN"