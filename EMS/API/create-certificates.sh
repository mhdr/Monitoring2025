#!/bin/bash

# SSL Certificate Generation Script for EMS API
# This script creates self-signed SSL certificates for development use

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CERT_DIR="certificates"
CERT_NAME="api-cert"
KEY_NAME="api-key"
PFX_NAME="api-cert"
CERT_PASSWORD="password123"
DAYS_VALID=365

# Certificate subject information
COUNTRY="US"
STATE="State"
LOCALITY="City"
ORGANIZATION="EMS Monitoring"
ORG_UNIT="Development"
COMMON_NAME="localhost"

echo -e "${BLUE}=== EMS API SSL Certificate Generator ===${NC}"
echo -e "This script will create self-signed SSL certificates for development use.\n"

# Check if openssl is installed
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}Error: OpenSSL is not installed. Please install it first.${NC}"
    echo "On Ubuntu/Debian: sudo apt-get install openssl"
    echo "On CentOS/RHEL: sudo yum install openssl"
    exit 1
fi

# Create certificates directory if it doesn't exist
if [ ! -d "$CERT_DIR" ]; then
    echo -e "${YELLOW}Creating certificates directory...${NC}"
    mkdir -p "$CERT_DIR"
fi

cd "$CERT_DIR"

# Check if certificates already exist
if [ -f "${CERT_NAME}.pem" ] && [ -f "${KEY_NAME}.pem" ] && [ -f "${PFX_NAME}.pfx" ]; then
    echo -e "${YELLOW}SSL certificates already exist.${NC}"
    read -p "Do you want to regenerate them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Using existing certificates.${NC}"
        exit 0
    fi
    echo -e "${YELLOW}Removing existing certificates...${NC}"
    rm -f "${CERT_NAME}.pem" "${KEY_NAME}.pem" "${PFX_NAME}.pfx"
fi

echo -e "${YELLOW}Generating SSL certificate and private key...${NC}"

# Generate private key and certificate in one command
openssl req -x509 -newkey rsa:4096 \
    -keyout "${KEY_NAME}.pem" \
    -out "${CERT_NAME}.pem" \
    -days $DAYS_VALID \
    -nodes \
    -subj "/C=${COUNTRY}/ST=${STATE}/L=${LOCALITY}/O=${ORGANIZATION}/OU=${ORG_UNIT}/CN=${COMMON_NAME}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Certificate and private key generated successfully${NC}"
else
    echo -e "${RED}✗ Failed to generate certificate and private key${NC}"
    exit 1
fi

echo -e "${YELLOW}Converting certificate to PKCS#12 format (.pfx)...${NC}"

# Convert to PKCS#12 format for .NET
openssl pkcs12 -export \
    -out "${PFX_NAME}.pfx" \
    -inkey "${KEY_NAME}.pem" \
    -in "${CERT_NAME}.pem" \
    -passout pass:${CERT_PASSWORD}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PKCS#12 certificate generated successfully${NC}"
else
    echo -e "${RED}✗ Failed to generate PKCS#12 certificate${NC}"
    exit 1
fi

# Set appropriate permissions
chmod 600 "${KEY_NAME}.pem"
chmod 644 "${CERT_NAME}.pem"
chmod 600 "${PFX_NAME}.pfx"

echo -e "\n${GREEN}=== Certificate Generation Complete ===${NC}"
echo -e "Generated files:"
echo -e "  📄 ${CERT_NAME}.pem     - Certificate file"
echo -e "  🔐 ${KEY_NAME}.pem     - Private key file"
echo -e "  📦 ${PFX_NAME}.pfx     - PKCS#12 certificate for .NET"
echo -e "\nCertificate details:"
echo -e "  🌐 Common Name: ${COMMON_NAME}"
echo -e "  🏢 Organization: ${ORGANIZATION}"
echo -e "  📅 Valid for: ${DAYS_VALID} days"
echo -e "  🔒 Password: ${CERT_PASSWORD}"

echo -e "\n${BLUE}Certificate Information:${NC}"
openssl x509 -in "${CERT_NAME}.pem" -text -noout | grep -E "(Issuer|Subject|Not Before|Not After)"

# Trust the certificate in the system certificate store
echo -e "\n${YELLOW}Installing certificate to system trust store...${NC}"

# Detect the Linux distribution and install certificate accordingly
if command -v update-ca-certificates &> /dev/null; then
    # Debian/Ubuntu based systems
    echo -e "${YELLOW}Detected Debian/Ubuntu system. Installing certificate...${NC}"
    
    # Copy certificate to system trust store
    sudo cp "${CERT_NAME}.pem" "/usr/local/share/ca-certificates/${CERT_NAME}.crt" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        # Update certificate store
        sudo update-ca-certificates >/dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Certificate installed and trusted system-wide${NC}"
        else
            echo -e "${YELLOW}⚠ Certificate copied but failed to update trust store${NC}"
            echo -e "  You may need to run: sudo update-ca-certificates"
        fi
    else
        echo -e "${YELLOW}⚠ Failed to copy certificate to system trust store${NC}"
        echo -e "  You may need to run: sudo cp ${CERT_NAME}.pem /usr/local/share/ca-certificates/${CERT_NAME}.crt"
        echo -e "  Then run: sudo update-ca-certificates"
    fi
    
elif command -v update-ca-trust &> /dev/null; then
    # Red Hat/CentOS/Fedora based systems
    echo -e "${YELLOW}Detected Red Hat/CentOS/Fedora system. Installing certificate...${NC}"
    
    # Copy certificate to system trust store
    sudo cp "${CERT_NAME}.pem" "/etc/pki/ca-trust/source/anchors/${CERT_NAME}.crt" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        # Update certificate store
        sudo update-ca-trust >/dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Certificate installed and trusted system-wide${NC}"
        else
            echo -e "${YELLOW}⚠ Certificate copied but failed to update trust store${NC}"
            echo -e "  You may need to run: sudo update-ca-trust"
        fi
    else
        echo -e "${YELLOW}⚠ Failed to copy certificate to system trust store${NC}"
        echo -e "  You may need to run: sudo cp ${CERT_NAME}.pem /etc/pki/ca-trust/source/anchors/${CERT_NAME}.crt"
        echo -e "  Then run: sudo update-ca-trust"
    fi
    
else
    echo -e "${YELLOW}⚠ Could not detect certificate management system${NC}"
    echo -e "  Manual installation may be required for system-wide trust"
    echo -e "  Certificate location: $(pwd)/${CERT_NAME}.pem"
fi

# Trust certificate for current user browsers (Firefox, Chrome/Chromium)
echo -e "\n${YELLOW}Installing certificate for browser trust...${NC}"

# Trust for Chrome/Chromium (using NSS database)
if command -v certutil &> /dev/null; then
    # Check if Chrome/Chromium NSS database exists
    CHROME_DB="$HOME/.pki/nssdb"
    if [ -d "$CHROME_DB" ]; then
        echo -e "${YELLOW}Installing certificate for Chrome/Chromium...${NC}"
        certutil -A -n "EMS API Development Certificate" -t "TC,," -i "${CERT_NAME}.pem" -d sql:"$CHROME_DB" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Certificate trusted in Chrome/Chromium${NC}"
        else
            echo -e "${YELLOW}⚠ Failed to install certificate in Chrome/Chromium${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ certutil not found. Chrome/Chromium trust not configured${NC}"
    echo -e "  Install libnss3-tools: sudo apt-get install libnss3-tools (Ubuntu/Debian)"
    echo -e "  Or: sudo yum install nss-tools (CentOS/RHEL)"
fi

echo -e "\n${YELLOW}Note: This is a self-signed certificate for development use only.${NC}"
echo -e "If browsers still show warnings, you may need to restart them or manually accept the certificate."

echo -e "\n${GREEN}You can now run your application with:${NC}"
echo -e "  dotnet run --launch-profile https"

cd ..