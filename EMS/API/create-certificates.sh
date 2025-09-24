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

echo -e "\n${YELLOW}Note: This is a self-signed certificate for development use only.${NC}"
echo -e "Browsers will show security warnings. Click 'Advanced' → 'Proceed to localhost' to continue."

echo -e "\n${GREEN}You can now run your application with:${NC}"
echo -e "  dotnet run --launch-profile https"

cd ..