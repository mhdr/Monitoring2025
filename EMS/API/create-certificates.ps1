# PowerShell script to create self-signed certificates for local development

# --- Configuration ---
$certDir = "certificates"
$pfxName = "api-cert.pfx"
$pfxPassword = "password123" # IMPORTANT: Change this if needed
$validityDays = 365
$rootCaSubject = "CN=EMS Monitoring Dev Root CA, OU=Development, O=EMS Monitoring, C=US"
$serverCertSubject = "CN=localhost, OU=Development, O=EMS Monitoring, C=US"

# --- Script Start ---
Push-Location $PSScriptRoot

# Check if running as Administrator, as it might be needed for certificate operations
# Note: This is a simplified check. For strict enforcement, more complex checks are needed.
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "This script may need to be run as an Administrator to manage certificates."
}

# Create certificates directory if it doesn't exist
if (-not (Test-Path -Path $certDir)) {
    Write-Host "Creating directory: $certDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $certDir | Out-Null
}

$pfxPath = Join-Path -Path $certDir -ChildPath $pfxName

# Check if the PFX file already exists and prompt for regeneration
if (Test-Path -Path $pfxPath) {
    $choice = Read-Host "SSL certificate '$pfxPath' already exists. Do you want to regenerate it? (y/N)"
    if ($choice -ne 'y') {
        Write-Host "Using existing certificate. Exiting." -ForegroundColor Green
        Pop-Location
        exit 0
    }
    Write-Host "Regenerating certificate..." -ForegroundColor Yellow
}

# --- IP and DNS Name Detection ---
Write-Host "Detecting local IP addresses and DNS names..." -ForegroundColor Cyan

# Get all active, non-loopback IPv4 addresses
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 -AddressState Preferred | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } | Select-Object -ExpandProperty IPAddress

# Get computer name
$computerName = $env:COMPUTERNAME
$dnsNames = @("localhost", $computerName)

# Add FQDN if available
try {
    $domainName = (Get-WmiObject Win32_ComputerSystem).Domain
    if ($domainName) {
        $fqdn = "$computerName.$domainName"
        $dnsNames += $fqdn
    }
} catch {
    Write-Warning "Could not determine FQDN. Using short hostname only."
}

# Add IP addresses to the list for SANs
$allSans = @($dnsNames) + @($ipAddresses)
Write-Host "Found DNS Names: $($dnsNames -join ', ')"
Write-Host "Found IP Addresses: $($ipAddresses -join ', ')"


# --- Certificate Generation ---

try {
    # 1. Create the Root CA
    Write-Host "Generating new Root CA certificate..." -ForegroundColor Yellow
    $rootCa = New-SelfSignedCertificate -Subject $rootCaSubject -CertStoreLocation "Cert:\CurrentUser\My" -KeyUsage CertSign, CrlSign -KeyLength 2048 -HashAlgorithm SHA256 -NotAfter (Get-Date).AddDays($validityDays + 1)

    # 2. Create the Server Certificate and sign it with the Root CA
    Write-Host "Generating server certificate signed by Root CA..." -ForegroundColor Yellow

    # Build the Subject Alternative Name (SAN) extension string for broad compatibility
    $dnsPart = $dnsNames | ForEach-Object { "dns=$_" }
    $ipPart = $ipAddresses | ForEach-Object { "ipaddress=$_" }
    $sanString = ($dnsPart + $ipPart) -join "&"
    $textExtension = "2.5.29.17={text}$sanString"

    $serverCert = New-SelfSignedCertificate -Subject $serverCertSubject -CertStoreLocation "Cert:\CurrentUser\My" -Signer $rootCa -KeyLength 2048 -HashAlgorithm SHA256 -NotAfter (Get-Date).AddDays($validityDays) -TextExtension @($textExtension, "2.5.29.37={text}1.3.6.1.5.5.7.3.1") # Server Authentication EKU

    # 3. Export the Server Certificate to a PFX file
    Write-Host "Exporting server certificate to PFX file: $pfxPath" -ForegroundColor Yellow
    $securePassword = ConvertTo-SecureString -String $pfxPassword -Force -AsPlainText
    Export-PfxCertificate -Cert $serverCert -FilePath $pfxPath -Password $securePassword -ChainOption BuildChain

    # 4. (Optional but recommended) Move Root CA to Trusted Root Certification Authorities store
    Write-Host "Moving Root CA to 'Trusted Root Certification Authorities' store..." -ForegroundColor Cyan
    $rootStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
    $rootStore.Open("ReadWrite")
    $rootStore.Add($rootCa)
    $rootStore.Close()

    # Clean up the original root from the personal store
    $personalStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "CurrentUser")
    $personalStore.Open("ReadWrite")
    $personalStore.Remove($rootCa)
    $personalStore.Close()

    Write-Host "Certificate generation complete!" -ForegroundColor Green
    Write-Host "  -> PFX file created at: $pfxPath"
    Write-Host "  -> Password: $pfxPassword"
    Write-Host "The Root CA has been added to your user's Trusted Root store."

} catch {
    Write-Error "An error occurred during certificate generation: $_"
    Pop-Location
    exit 1
}

# --- Final Instructions ---
Write-Host "`nTo use this certificate in your application, configure Kestrel to load:"
Write-Host "  - Path: '$pfxPath'"
Write-Host "  - Password: '$pfxPassword'"
Write-Host "`nExample appsettings.json:" -ForegroundColor Gray
Write-Host @"
{
  "Kestrel": {
    "Endpoints": {
      "Https": {
        "Url": "https://localhost:7136",
        "Certificate": {
          "Path": "$pfxPath",
          "Password": "$pfxPassword"
        }
      }
    }
  }
}
"@ -ForegroundColor Gray

Pop-Location
