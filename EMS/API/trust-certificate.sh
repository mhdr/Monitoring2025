#!/bin/bash

# SSL Certificate Trust Installation Script for EndeavourOS/Arch Linux
# This script installs the EMS API Root CA certificate to the system's trusted certificate store
# and ensures compatibility with Chrome, Firefox, and React applications
# 
# Usage: sudo ./trust-certificate.sh
# 
# This script will:
# - Install the Root CA certificate to the system trust store
# - Add certificate to NSS database (Firefox/Chrome)
# - Update the certificate trust database
# - Provide React app configuration guidance
# - Verify the certificate installation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CERT_DIR="certificates"
CA_CERT_NAME="api-root-ca"
SYSTEM_CERT_DIR="/etc/ca-certificates/trust-source/anchors"

echo -e "${BLUE}=== EMS API SSL Certificate Trust Installation ===${NC}"
echo -e "This script will install the EMS API Root CA certificate to the system trust store.\n"

# Check if running as root, if not, re-run with sudo
if [[ $EUID -ne 0 ]]; then
    echo -e "${YELLOW}This script requires root privileges to install certificates to the system trust store.${NC}"
    echo -e "${BLUE}You will be prompted for your password...${NC}"
    echo
    exec sudo "$0" "$@"
fi

# Check if certificates directory exists
if [ ! -d "$CERT_DIR" ]; then
    echo -e "${RED}Error: Certificates directory '$CERT_DIR' not found${NC}"
    echo "Please run the certificate generation script first: ./create-certificates.sh"
    exit 1
fi

# Check if Root CA certificate exists
CA_CERT_PATH="$CERT_DIR/${CA_CERT_NAME}.pem"
if [ ! -f "$CA_CERT_PATH" ]; then
    echo -e "${RED}Error: Root CA certificate not found at '$CA_CERT_PATH'${NC}"
    echo "Please run the certificate generation script first: ./create-certificates.sh"
    exit 1
fi

# Check if required tools are installed
echo -e "${YELLOW}Checking and installing required packages...${NC}"
PACKAGES_TO_INSTALL=""

if ! command -v trust &> /dev/null; then
    PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL ca-certificates"
fi

if ! command -v certutil &> /dev/null; then
    PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL nss"
fi

if [ -n "$PACKAGES_TO_INSTALL" ]; then
    echo -e "${YELLOW}Installing packages:$PACKAGES_TO_INSTALL${NC}"
    pacman -S --noconfirm $PACKAGES_TO_INSTALL
else
    echo -e "${GREEN}✓ All required packages are already installed${NC}"
fi

# Create system certificate directory if it doesn't exist
if [ ! -d "$SYSTEM_CERT_DIR" ]; then
    echo -e "${YELLOW}Creating system certificate directory...${NC}"
    mkdir -p "$SYSTEM_CERT_DIR"
fi

# Check if certificate is already installed
CERT_FILENAME="ems-api-root-ca.crt"
SYSTEM_CERT_PATH="$SYSTEM_CERT_DIR/$CERT_FILENAME"

if [ -f "$SYSTEM_CERT_PATH" ]; then
    echo -e "${YELLOW}Certificate already exists in system trust store.${NC}"
    read -p "Do you want to reinstall it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Keeping existing certificate.${NC}"
        echo -e "To remove the certificate later, run:"
        echo -e "  sudo rm '$SYSTEM_CERT_PATH'"
        echo -e "  sudo trust extract-compat"
        exit 0
    else
        echo -e "${YELLOW}Removing existing certificate...${NC}"
        rm -f "$SYSTEM_CERT_PATH"
    fi
fi

echo -e "${YELLOW}Installing Root CA certificate to system trust store...${NC}"

# Copy the certificate to the system trust store
cp "$CA_CERT_PATH" "$SYSTEM_CERT_PATH"

# Set appropriate permissions
chmod 644 "$SYSTEM_CERT_PATH"
chown root:root "$SYSTEM_CERT_PATH"

echo -e "${GREEN}✓ Certificate copied to system trust store${NC}"

# Update the certificate trust database
echo -e "${YELLOW}Updating certificate trust database...${NC}"
trust extract-compat

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Certificate trust database updated successfully${NC}"
else
    echo -e "${RED}✗ Failed to update certificate trust database${NC}"
    echo -e "You may need to run: sudo trust extract-compat"
    exit 1
fi

# Install certificate to NSS database for browsers
echo -e "${YELLOW}Installing certificate to NSS databases for browser compatibility...${NC}"
echo -e "${BLUE}Note: You may be prompted for passwords for browser certificate databases.${NC}"
echo -e "${BLUE}For most browsers, you can press Enter for empty password or enter your master password if set.${NC}"
echo

# Function to add certificate to NSS database
add_to_nss_db() {
    local db_path="$1"
    local db_name="$2"
    
    if [ -d "$db_path" ]; then
        echo -e "${YELLOW}  Adding certificate to $db_name NSS database...${NC}"
        
        # First check if the certificate already exists
        if certutil -L -d "$db_path" -n "EMS API Root CA" &>/dev/null; then
            echo -e "${GREEN}  ✓ Certificate already exists in $db_name NSS database${NC}"
            return 0
        fi
        
        # Try to add the certificate
        echo -e "${BLUE}  Note: If prompted for a password, press Enter for empty password or enter your database password.${NC}"
        if certutil -A -n "EMS API Root CA" -t "TCu,Cu,Tu" -i "$CA_CERT_PATH" -d "$db_path"; then
            echo -e "${GREEN}  ✓ Certificate added to $db_name NSS database${NC}"
        else
            local exit_code=$?
            case $exit_code in
                12)
                    echo -e "${YELLOW}  ⚠ Certificate already exists in $db_name NSS database${NC}"
                    ;;
                1)
                    echo -e "${YELLOW}  ⚠ Password required or database access denied for $db_name NSS database${NC}"
                    echo -e "${BLUE}    You may need to manually import the certificate in your browser.${NC}"
                    ;;
                *)
                    echo -e "${YELLOW}  ⚠ Failed to add certificate to $db_name NSS database (exit code: $exit_code)${NC}"
                    echo -e "${BLUE}    This is usually not critical - browsers can still be configured manually.${NC}"
                    ;;
            esac
        fi
    fi
}

# Add to system NSS database
echo -e "${YELLOW}Adding certificate to system NSS database...${NC}"
if [ -d "/etc/pki/nssdb" ]; then
    add_to_nss_db "sql:/etc/pki/nssdb" "system"
else
    echo -e "${YELLOW}  ⚠ System NSS database not found at /etc/pki/nssdb${NC}"
fi

# Add to user NSS databases (Firefox/Chrome profiles)
for user_home in /home/*; do
    if [ -d "$user_home" ]; then
        username=$(basename "$user_home")
        
        # Firefox profiles
        firefox_profile_dir="$user_home/.mozilla/firefox"
        if [ -d "$firefox_profile_dir" ]; then
            for profile in "$firefox_profile_dir"/*.default* "$firefox_profile_dir"/*default*; do
                if [ -d "$profile" ]; then
                    add_to_nss_db "sql:$profile" "Firefox ($username)"
                fi
            done
        fi
        
        # Chrome/Chromium profiles
        for chrome_dir in "$user_home/.config/google-chrome" "$user_home/.config/chromium"; do
            if [ -d "$chrome_dir" ]; then
                add_to_nss_db "sql:$chrome_dir" "Chrome/Chromium ($username)"
            fi
        done
    fi
done

# Verify certificate installation
echo -e "${YELLOW}Verifying certificate installation...${NC}"

# Check if certificate is in the trust store
if trust list | grep -q "EMS Monitoring"; then
    echo -e "${GREEN}✓ Certificate successfully installed and trusted${NC}"
else
    echo -e "${YELLOW}⚠ Certificate installed but verification inconclusive${NC}"
fi

# Additional verification for browsers
echo -e "\n${BLUE}Browser Compatibility Status:${NC}"

# Check if certificate is properly installed
if trust list | grep -q "EMS"; then
    echo -e "${GREEN}✓ System trust store: Certificate installed${NC}"
else
    echo -e "${YELLOW}⚠ System trust store: Verification inconclusive${NC}"
fi

# Test certificate with curl
echo -e "${YELLOW}Testing certificate with curl...${NC}"
if curl -s --connect-timeout 5 https://localhost:7136 >/dev/null 2>&1; then
    echo -e "${GREEN}✓ curl: Certificate trusted${NC}"
elif curl -s --connect-timeout 5 --cacert "$CA_CERT_PATH" https://localhost:7136 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ curl: Requires CA file, but certificate is valid${NC}"
else
    echo -e "${YELLOW}⚠ curl: Cannot test (server may not be running)${NC}"
fi

echo -e "\n${BLUE}React Application Configuration:${NC}"
echo -e "For React apps to trust the certificate, you have several options:"

echo -e "\n${YELLOW}Option 1: Environment Variables (Recommended for Development)${NC}"
echo -e "Add these to your React app's .env file:"
echo -e "  HTTPS=true"
echo -e "  SSL_CRT_FILE=../API/certificates/api-cert.pem"
echo -e "  SSL_KEY_FILE=../API/certificates/api-key.pem"
echo -e "  NODE_EXTRA_CA_CERTS=../API/certificates/api-root-ca.pem"

echo -e "\n${YELLOW}Option 2: Node.js Environment Variable (Global)${NC}"
echo -e "Set this environment variable before starting your React app:"
echo -e "  export NODE_EXTRA_CA_CERTS=\"$(realpath $CA_CERT_PATH)\""
echo -e "  npm start"

echo -e "\n${YELLOW}Option 3: Package.json Script${NC}"
echo -e "Add to your React app's package.json scripts:"
echo -e '  "start": "NODE_EXTRA_CA_CERTS=../API/certificates/api-root-ca.pem react-scripts start"'

echo -e "\n${YELLOW}Option 4: Webpack Configuration${NC}"
echo -e "If using a custom webpack config, add:"
echo -e "  devServer: {"
echo -e "    https: {"
echo -e "      ca: fs.readFileSync('../API/certificates/api-root-ca.pem'),"
echo -e "      cert: fs.readFileSync('../API/certificates/api-cert.pem'),"
echo -e "      key: fs.readFileSync('../API/certificates/api-key.pem')"
echo -e "    }"
echo -e "  }"

echo -e "\n${BLUE}Manual Browser Import (If Needed):${NC}"

echo -e "\n${YELLOW}For Firefox:${NC}"
echo -e "1. Open Firefox and go to about:preferences#privacy"
echo -e "2. Scroll down to 'Certificates' and click 'View Certificates'"
echo -e "3. Go to 'Authorities' tab"
echo -e "4. Click 'Import' and select: $CA_CERT_PATH"
echo -e "5. Check 'Trust this CA to identify websites'"

echo -e "\n${YELLOW}For Chrome/Chromium:${NC}"
echo -e "1. Open Chrome and go to chrome://settings/certificates"
echo -e "2. Go to 'Authorities' tab"
echo -e "3. Click 'Import' and select: $CA_CERT_PATH"
echo -e "4. Check 'Trust this certificate for identifying websites'"

echo -e "\n${GREEN}=== Installation Complete ===${NC}"
echo -e "Certificate installed at: ${SYSTEM_CERT_PATH}"
echo -e "\nYour EMS API certificate should now be trusted by:"
echo -e "  ✓ System applications"
echo -e "  ✓ curl, wget, and other command-line tools"
echo -e "  ✓ Most desktop applications"
echo -e "  ⚠ Some browsers may require manual import (see instructions above)"

echo -e "\n${BLUE}Test your certificate:${NC}"
echo -e "  curl -v https://localhost:7136"
echo -e "  openssl s_client -connect localhost:7136 -CAfile '$CA_CERT_PATH'"

echo -e "\n${BLUE}To remove this certificate later:${NC}"
echo -e "  sudo rm '$SYSTEM_CERT_PATH'"
echo -e "  sudo trust extract-compat"

echo -e "\n${GREEN}You can now access your API securely without certificate warnings!${NC}"