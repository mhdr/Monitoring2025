#!/bin/bash

# SSL Certificate Generation Script for EMS API
# This script creates self-signed SSL certificates for development use
# 
# Modified to automatically detect the server's public IP address
# and create certificates for it instead of localhost/127.0.0.1
# - Removes localhost, 127.0.0.1, ::1, and 0.0.0.0 from certificates
# - Automatically detects public IP using external services
# - Includes local network IPs for internal access
# - Uses public IP as Common Name

set -e  # Exit on any error

# Function to detect public IP address
detect_public_ip() {
    local public_ip=""
    local services=(
        "https://ipinfo.io/ip"
        "https://api.ipify.org"
        "https://checkip.amazonaws.com"
        "https://icanhazip.com"
        "https://ifconfig.me/ip"
    )
    
    echo -e "${YELLOW}Detecting public IP address...${NC}" >&2
    
    for service in "${services[@]}"; do
        echo -e "  Trying $service..." >&2
        public_ip=$(curl -s --max-time 10 "$service" 2>/dev/null | tr -d '\n\r' | grep -E '^[0-9]{1,3}(\.[0-9]{1,3}){3}$')
        if [[ -n "$public_ip" ]]; then
            echo -e "${GREEN}  ✓ Detected public IP: $public_ip${NC}" >&2
            echo "$public_ip"
            return 0
        fi
    done
    
    echo -e "${RED}  ✗ Failed to detect public IP address from external services${NC}" >&2
    echo -e "${YELLOW}  Falling back to local IP detection...${NC}" >&2
    # Fallback to local network interfaces (excluding loopback)
    public_ip=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K[0-9.]+' | head -n1)
    if [[ -z "$public_ip" ]]; then
        public_ip=$(hostname -I 2>/dev/null | awk '{print $1}' | grep -v '^127\.')
    fi
    if [[ -n "$public_ip" ]]; then
        echo -e "${YELLOW}  Using local IP: $public_ip${NC}" >&2
        echo "$public_ip"
        return 0
    else
        echo -e "${RED}  ✗ Could not determine any IP address${NC}" >&2
        exit 1
    fi
}

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

# Optional behavior flags (env overrides)
#   FORCE_REGENERATE=1  -> skip prompt and always regenerate
#   EXTRA_SAN="dns1,dns2" -> extra DNS SubjectAltNames
FORCE_REGENERATE=${FORCE_REGENERATE:-0}

# Certificate subject information
COUNTRY="US"
STATE="State"
LOCALITY="City"
ORGANIZATION="EMS Monitoring"
ORG_UNIT="Development"
# Common Name will be set to the detected public IP

echo -e "${BLUE}=== EMS API SSL Certificate Generator ===${NC}"
echo -e "This script will create self-signed SSL certificates for development use.\n"

# Check if required tools are installed
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}Error: OpenSSL is not installed. Please install it first.${NC}"
    echo "On Ubuntu/Debian: sudo apt-get install openssl"
    echo "On CentOS/RHEL: sudo yum install openssl"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed. Please install it first.${NC}"
    echo "On Ubuntu/Debian: sudo apt-get install curl"
    echo "On CentOS/RHEL: sudo yum install curl"
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
    if [ "$FORCE_REGENERATE" = "0" ]; then
        echo -e "${YELLOW}SSL certificates already exist.${NC}"
        read -p "Do you want to regenerate them? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${GREEN}Using existing certificates (set FORCE_REGENERATE=1 to auto-regenerate).${NC}"
            exit 0
        else
            echo -e "${YELLOW}Removing existing certificates...${NC}"
            rm -f "${CERT_NAME}.pem" "${KEY_NAME}.pem" "${PFX_NAME}.pfx"
        fi
    else
        echo -e "${YELLOW}FORCE_REGENERATE=1 set – removing existing certificates...${NC}"
        rm -f "${CERT_NAME}.pem" "${KEY_NAME}.pem" "${PFX_NAME}.pfx"
    fi
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

# Detect public IP
PUBLIC_IP=$(detect_public_ip)
COMMON_NAME="$PUBLIC_IP"  # Set Common Name to the detected public IP

HOSTNAME_FQDN=$(hostname -f 2>/dev/null || hostname)
HOST_SHORT=$(hostname -s 2>/dev/null || echo "${HOSTNAME_FQDN%%.*}")

# Collect only the public IP and local network IPs (excluding loopback)
IPv4_LIST=""
if [[ -n "$PUBLIC_IP" ]]; then
    IPv4_LIST="$PUBLIC_IP"
fi

# Add local network IPs (for internal access) but exclude loopback
LOCAL_IPS=$(ip -4 addr show scope global 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | grep -v '^127\.' | sort -u)
if [[ -n "$LOCAL_IPS" ]]; then
    for local_ip in $LOCAL_IPS; do
        if [[ "$local_ip" != "$PUBLIC_IP" ]]; then
            IPv4_LIST="$IPv4_LIST $local_ip"
        fi
    done
fi

# Prepare DNS names (avoid duplicates) - include hostname but not localhost
declare -A DNS_MAP
add_dns() { [[ -n "$1" ]] && DNS_MAP["$1"]=1; }
add_dns "$HOST_SHORT"
add_dns "$HOSTNAME_FQDN"

# EXTRA_SAN can include additional DNS names (comma separated)
if [[ -n "$EXTRA_SAN" ]]; then
    IFS=',' read -ra EXTRA_SAN_ARR <<< "$EXTRA_SAN"
    for name in "${EXTRA_SAN_ARR[@]}"; do
        name_trim=$(echo "$name" | xargs)
        [[ -n "$name_trim" ]] && add_dns "$name_trim"
    done
fi

# Build alt_names section dynamically
DNS_INDEX=1
IP_INDEX=1
ALT_DNS_LINES=""
for dns_name in "${!DNS_MAP[@]}"; do
    ALT_DNS_LINES+="DNS.${DNS_INDEX} = ${dns_name}\n"
    DNS_INDEX=$((DNS_INDEX+1))
done

ALT_IP_LINES=""
# Only include detected public IP and local network IPs (no localhost/loopback)
for ipaddr in $IPv4_LIST; do
    ALT_IP_LINES+="IP.${IP_INDEX} = ${ipaddr}\n"
    IP_INDEX=$((IP_INDEX+1))
done

echo -e "${YELLOW}Generating server key and CSR (detected $(($DNS_INDEX-1)) DNS names, $(($IP_INDEX-1)) IP entries)...${NC}"
echo -e "  DNS names: $(printf '%s ' "${!DNS_MAP[@]}")"
echo -e "  IP addresses: $IPv4_LIST"

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
${ALT_DNS_LINES}${ALT_IP_LINES}
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
echo -e "  🌐 Common Name: ${COMMON_NAME} (detected public IP)"
echo -e "  🏢 Organization: ${ORGANIZATION}"
echo -e "  📅 Valid for: ${DAYS_VALID} days"
echo -e "  🔒 Password: ${CERT_PASSWORD}"

echo -e "\n${BLUE}Certificate Information:${NC}"
openssl x509 -in "${CERT_NAME}.pem" -text -noout | grep -E "(Issuer:|Subject:|Not Before:|Not After :)"
openssl x509 -in "${CA_CERT_NAME}.pem" -text -noout | grep -E "(Subject:|CA:true)" | head -n 2 || true



echo -e "\n${YELLOW}Note: This certificate is configured for the detected public IP (${PUBLIC_IP}) and local network access.${NC}"
echo -e "The certificate does not include localhost/127.0.0.1 for security reasons."
echo -e "Access your application using: https://${PUBLIC_IP}:7136"

echo -e "\n${BLUE}Verification commands:${NC}"
echo -e "  openssl verify -CAfile ${CA_CERT_NAME}.pem ${CERT_NAME}.pem"

echo -e "\n${BLUE}Environment options:${NC}"
echo -e "  EXTRA_SAN=dev.local,api.local ./create-certificates.sh"
echo -e "  FORCE_REGENERATE=1 ./create-certificates.sh"

echo -e "\n${GREEN}You can now run your application with:${NC}"
echo -e "  dotnet run --launch-profile https"

cd ..