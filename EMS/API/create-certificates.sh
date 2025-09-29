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
CERT_NAME="api-cert"           # Leaf/server certificate (public)
KEY_NAME="api-key"             # Leaf/server private key
PFX_NAME="api-cert"            # PKCS#12 bundle name
CA_CERT_NAME="api-root-ca"     # Root CA certificate filename base
CA_KEY_NAME="api-root-ca-key"  # Root CA key filename base
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

echo -e "${YELLOW}Generating Root CA (if not exists) and server certificate...${NC}"

# Clean any old temp config
rm -f openssl.conf ca.conf server.conf 2>/dev/null || true

# 1. Root CA (only regenerate if forced or missing)
if [ ! -f "${CA_CERT_NAME}.pem" ] || [ ! -f "${CA_KEY_NAME}.pem" ]; then
    echo -e "${YELLOW}Creating new Root CA...${NC}"
    cat > ca.conf << EOF
[req]
prompt = no
distinguished_name = dn
x509_extensions = v3_ca

[dn]
C=${COUNTRY}
ST=${STATE}
L=${LOCALITY}
O=${ORGANIZATION}
OU=${ORG_UNIT} Root CA
CN=${COMMON_NAME} Root CA

[v3_ca]
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid:always,issuer
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
EOF

    openssl req -x509 -newkey rsa:4096 \
        -days $DAYS_VALID \
        -sha256 \
        -nodes \
        -keyout "${CA_KEY_NAME}.pem" \
        -out "${CA_CERT_NAME}.pem" \
        -config ca.conf \
        -extensions v3_ca || { echo -e "${RED}✗ Failed to create Root CA${NC}"; exit 1; }
    echo -e "${GREEN}✓ Root CA generated (${CA_CERT_NAME}.pem)${NC}"
else
    echo -e "${GREEN}Root CA already exists - reusing ${CA_CERT_NAME}.pem${NC}"
fi

# 2. Server key & CSR
echo -e "${YELLOW}Generating server key and CSR...${NC}"
cat > server.conf << EOF
[req]
distinguished_name = dn
prompt = no
req_extensions = v3_req

[dn]
C=${COUNTRY}
ST=${STATE}
L=${LOCALITY}
O=${ORGANIZATION}
OU=${ORG_UNIT}
CN=${COMMON_NAME}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generate key and CSR
openssl req -new -newkey rsa:4096 -nodes -keyout "${KEY_NAME}.pem" -out server.csr -config server.conf || { echo -e "${RED}✗ Failed to create server CSR${NC}"; exit 1; }

# 3. Sign server cert with Root CA
echo -e "${YELLOW}Signing server certificate with Root CA...${NC}"
openssl x509 -req -in server.csr \
    -CA "${CA_CERT_NAME}.pem" -CAkey "${CA_KEY_NAME}.pem" -CAcreateserial \
    -out "${CERT_NAME}.pem" -days $DAYS_VALID -sha256 -extensions v3_req -extfile server.conf || { echo -e "${RED}✗ Failed to sign server certificate${NC}"; exit 1; }

echo -e "${GREEN}✓ Server certificate generated (${CERT_NAME}.pem)${NC}"

# 4. Build full chain file
cat "${CERT_NAME}.pem" "${CA_CERT_NAME}.pem" > "${CERT_NAME}-chain.pem"
echo -e "${GREEN}✓ Certificate chain file created (${CERT_NAME}-chain.pem)${NC}"

# Cleanup temps
rm -f server.csr ca.conf server.conf ${CA_CERT_NAME}.srl 2>/dev/null || true

echo -e "${YELLOW}Converting certificate to PKCS#12 format (.pfx)...${NC}"

# Convert to PKCS#12 format for .NET
openssl pkcs12 -export \
    -out "${PFX_NAME}.pfx" \
    -inkey "${KEY_NAME}.pem" \
    -in "${CERT_NAME}.pem" \
    -certfile "${CA_CERT_NAME}.pem" \
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
echo -e "  �  ${CA_CERT_NAME}.pem        - Root CA certificate"
echo -e "  📄 ${CERT_NAME}.pem           - Server certificate (leaf)"
echo -e "  🔐 ${KEY_NAME}.pem           - Server private key"
echo -e "  🔗 ${CERT_NAME}-chain.pem    - Server + CA chain"
echo -e "  📦 ${PFX_NAME}.pfx           - PKCS#12 (includes chain)"
echo -e "\nCertificate details:"
echo -e "  🌐 Common Name: ${COMMON_NAME}"
echo -e "  🏢 Organization: ${ORGANIZATION}"
echo -e "  📅 Valid for: ${DAYS_VALID} days"
echo -e "  🔒 Password: ${CERT_PASSWORD}"

echo -e "\n${BLUE}Certificate Information:${NC}"
openssl x509 -in "${CERT_NAME}.pem" -text -noout | grep -E "(Issuer:|Subject:|Not Before:|Not After :)"
openssl x509 -in "${CA_CERT_NAME}.pem" -text -noout | grep -E "(Subject:|CA:true)" | head -n 2 || true

######################## TRUST INSTALLATION ########################
echo -e "\n${YELLOW}Installing Root CA to system trust store (preferred) ...${NC}"

# Detect the Linux distribution and install certificate accordingly
# Check for Arch Linux first (including EndeavourOS, Manjaro, etc.)
if command -v trust &> /dev/null && [ -d "/etc/ca-certificates/trust-source/anchors" ]; then
    # Arch Linux based systems (including EndeavourOS, Manjaro, etc.)
    echo -e "${YELLOW}Detected Arch-based system (EndeavourOS/Arch/Manjaro). Installing certificate...${NC}"
    
    # Copy certificate to system trust store
    sudo cp "${CA_CERT_NAME}.pem" "/etc/ca-certificates/trust-source/anchors/${CA_CERT_NAME}.crt" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        # Update certificate store using trust command
    sudo trust anchor "/etc/ca-certificates/trust-source/anchors/${CA_CERT_NAME}.crt" >/dev/null 2>&1 || true
    sudo trust extract-compat >/dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Certificate installed and trusted system-wide${NC}"
        else
            echo -e "${YELLOW}⚠ Certificate copied but failed to update trust store${NC}"
            echo -e "  You may need to run: sudo trust extract-compat"
        fi
    else
        echo -e "${YELLOW}⚠ Failed to copy certificate to system trust store${NC}"
    echo -e "  You may need to run: sudo cp ${CA_CERT_NAME}.pem /etc/ca-certificates/trust-source/anchors/${CA_CERT_NAME}.crt"
        echo -e "  Then run: sudo trust extract-compat"
    fi
    
elif command -v update-ca-certificates &> /dev/null; then
    # Debian/Ubuntu based systems
    echo -e "${YELLOW}Detected Debian/Ubuntu system. Installing certificate...${NC}"
    
    # Copy certificate to system trust store
    sudo cp "${CA_CERT_NAME}.pem" "/usr/local/share/ca-certificates/${CA_CERT_NAME}.crt" 2>/dev/null
    
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
    echo -e "  You may need to run: sudo cp ${CA_CERT_NAME}.pem /usr/local/share/ca-certificates/${CA_CERT_NAME}.crt"
        echo -e "  Then run: sudo update-ca-certificates"
    fi
    
elif command -v update-ca-trust &> /dev/null && [ -d "/etc/pki/ca-trust/source/anchors" ]; then
    # Red Hat/CentOS/Fedora based systems
    echo -e "${YELLOW}Detected Red Hat/CentOS/Fedora system. Installing certificate...${NC}"
    
    # Copy certificate to system trust store
    sudo cp "${CA_CERT_NAME}.pem" "/etc/pki/ca-trust/source/anchors/${CA_CERT_NAME}.crt" 2>/dev/null
    
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
    echo -e "  You may need to run: sudo cp ${CA_CERT_NAME}.pem /etc/pki/ca-trust/source/anchors/${CA_CERT_NAME}.crt"
        echo -e "  Then run: sudo update-ca-trust"
    fi
    
else
    echo -e "${YELLOW}⚠ Could not detect certificate management system${NC}"
    echo -e "  Manual installation may be required for system-wide trust"
    echo -e "  Root CA location: $(pwd)/${CA_CERT_NAME}.pem"
    echo -e "  Common locations:"
    echo -e "    Arch/EndeavourOS/Manjaro: /etc/ca-certificates/trust-source/anchors/ (then run: trust extract-compat)"
    echo -e "    Debian/Ubuntu: /usr/local/share/ca-certificates/ (then run: update-ca-certificates)"
    echo -e "    CentOS/RHEL/Fedora: /etc/pki/ca-trust/source/anchors/ (then run: update-ca-trust)"
fi

# Trust certificate for current user browsers (Firefox, Chrome/Chromium)
echo -e "\n${YELLOW}Installing Root CA for browser trust...${NC}"

        # Trust for Chrome/Chromium (using NSS database)
if command -v certutil &> /dev/null; then
    # Check if Chrome/Chromium NSS database exists
    CHROME_DB="$HOME/.pki/nssdb"
    if [ -d "$CHROME_DB" ]; then
    echo -e "${YELLOW}Installing Root CA for Chrome/Chromium...${NC}"
        
        # Remove existing certificate if it exists
    certutil -D -n "EMS API Root CA" -d sql:"$CHROME_DB" 2>/dev/null || true
        
        # Install certificate with proper trust flags for SSL server authentication
        # T = trusted for SSL server authentication
        # C = trusted for SSL client authentication
        # u = user certificate (set automatically if private key present)
    certutil -A -n "EMS API Root CA" -t "C,C,C" -i "${CA_CERT_NAME}.pem" -d sql:"$CHROME_DB" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Root CA trusted in Chrome/Chromium${NC}"
            
            # Verify installation
            CERT_STATUS=$(certutil -L -d sql:"$CHROME_DB" | grep "EMS API Root CA" | awk '{print $NF}')
            echo -e "  ${BLUE}Trust status: $CERT_STATUS${NC}"
            echo -e "  ${BLUE}Note: Restart Chrome/Chromium and clear browser cache for changes to take effect${NC}"
        else
            echo -e "${YELLOW}⚠ Failed to install certificate in Chrome/Chromium${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Chrome/Chromium NSS database not found at $CHROME_DB${NC}"
        echo -e "  Start Chrome/Chromium at least once to create the database"
    fi    # Trust for Firefox (separate NSS database)
    FIREFOX_PROFILE_DIR="$HOME/.mozilla/firefox"
    if [ -d "$FIREFOX_PROFILE_DIR" ]; then
    echo -e "${YELLOW}Installing Root CA for Firefox...${NC}"
        
        # Find Firefox profiles
        FIREFOX_PROFILES=$(find "$FIREFOX_PROFILE_DIR" -name "*.default*" -type d)
        
        if [ -n "$FIREFOX_PROFILES" ]; then
            for profile in $FIREFOX_PROFILES; do
                if [ -f "$profile/cert9.db" ]; then
                    echo -e "${YELLOW}  Installing in Firefox profile: $(basename $profile)${NC}"
                    
                    # Remove existing certificate if it exists
                    certutil -D -n "EMS API Root CA" -d sql:"$profile" 2>/dev/null || true
                    
                    # Install certificate with proper trust flags
                    certutil -A -n "EMS API Root CA" -t "C,C,C" -i "${CA_CERT_NAME}.pem" -d sql:"$profile" 2>/dev/null
                    
                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}    ✓ Root CA trusted in Firefox profile: $(basename $profile)${NC}"
                    else
                        echo -e "${YELLOW}    ⚠ Failed to install in Firefox profile: $(basename $profile)${NC}"
                    fi
                fi
            done
            echo -e "  ${BLUE}Note: You may need to restart Firefox for changes to take effect${NC}"
        else
            echo -e "${YELLOW}  No Firefox profiles found${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Firefox not installed or profile directory not found${NC}"
    fi
    
else
    echo -e "${YELLOW}⚠ certutil not found. Browser trust not configured${NC}"
    echo -e "  Install NSS tools:"
    echo -e "    Ubuntu/Debian: sudo apt-get install libnss3-tools"
    echo -e "    CentOS/RHEL: sudo yum install nss-tools"
    echo -e "    Arch/EndeavourOS: sudo pacman -S nss"
fi

echo -e "\n${YELLOW}Note: This is a self-signed certificate for development use only.${NC}"
echo -e "If browsers still show warnings, you may need to restart them or manually accept the certificate."

echo -e "\n${GREEN}You can now run your application with:${NC}"
echo -e "  dotnet run --launch-profile https"

cd ..